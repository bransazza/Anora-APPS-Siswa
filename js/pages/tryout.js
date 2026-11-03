// ANORA siswa — tryout.js (daftar try out, halaman aturan, memulai)
import { supabase, ambil, pesanGalat } from "../supabase.js";
import { h, ikon, ganti, elMemuat, elGalat, elKosong, angka, waktuJakarta } from "../ui.js";
import { elKunci } from "./kunci.js";
import { UUID } from "../soal-tampil.js";

const kunciHalaman = (wadah) => ganti(wadah, h("div", { class: "halaman" }, h("header", { class: "halaman-kepala" }, h("h1", {}, "Try Out")), elKunci()));
const pergi = (hash) => location.replace(location.pathname + location.search + hash);

async function muatData() {
  const [daftar, mapel, st] = await Promise.all([
    ambil(supabase.rpc("list_tryouts")),
    ambil(supabase.from("subjects").select("id,name")),
    ambil(supabase.rpc("server_time")).catch(() => null),
  ]);
  return { daftar: daftar || [], nama: new Map((mapel || []).map((m) => [m.id, m.name])), sekarang: st ? Date.parse(st) : Date.now() };
}
const berjalan = (t, sekarang) => t.last_status === "in_progress" && t.last_deadline_at && Date.parse(t.last_deadline_at) > sekarang;

// ----- daftar -----
export async function daftar(wadah, ctx) {
  if (ctx.siswa.payment_status !== "Lunas") { kunciHalaman(wadah); return; }
  ganti(wadah, elMemuat());
  let d;
  try { d = await muatData(); } catch (e) { if (ctx.aktif()) ganti(wadah, elGalat(pesanGalat(e), () => daftar(wadah, ctx))); return; }
  if (!ctx.aktif()) return;
  const kepala = h("header", { class: "halaman-kepala" }, h("h1", {}, "Try Out"), h("p", { class: "lembut" }, "Latihan berwaktu untuk kelas 6. Boleh dikerjakan berulang."));
  if (!d.daftar.length) { ganti(wadah, h("div", { class: "halaman" }, kepala, elKosong("Belum ada try out.", "Try out akan muncul di sini setelah diterbitkan oleh admin bimbel.", "jam"))); return; }
  ganti(wadah, h("div", { class: "halaman" }, kepala, h("ul", { class: "daftar-tryout" }, d.daftar.map((t) => kartu(t, d)))));
}

function kartu(t, d) {
  const jalan = berjalan(t, d.sekarang);
  const habisBelumHitung = t.last_status === "in_progress" && !jalan;
  const selesai = t.last_status === "submitted" || t.last_status === "expired";
  const baris = [];
  if (!t.last_attempt_id) baris.push(h("p", { class: "lembut" }, "Belum pernah dikerjakan."));
  else if (jalan) {
    const menit = Math.max(1, Math.ceil((Date.parse(t.last_deadline_at) - d.sekarang) / 60000));
    baris.push(h("p", {}, h("span", { class: "badge b-kuning" }, ikon("jam", 16), "Sedang berlangsung"), ` Sisa waktu sekitar ${menit} menit.`));
  } else if (habisBelumHitung) baris.push(h("p", {}, h("span", { class: "badge b-kuning" }, "Waktu habis"), " Percobaan terakhir sedang dihitung."));
  else if (selesai) baris.push(h("p", {}, `Nilai terakhir: `, h("strong", {}, angka(t.last_score)), ` · ${waktuJakarta(t.last_submitted_at || t.last_started_at)}`,
    t.last_status === "expired" ? [" ", h("span", { class: "badge b-kuning" }, "Waktu habis")] : null,
    t.attempt_count > 1 ? h("span", { class: "lembut" }, ` · Terbaik: ${angka(t.best_score)} (${t.attempt_count} percobaan)`) : null));
  const tombol = [];
  if (jalan) tombol.push(h("a", { class: "tombol tombol-emas", href: `#/try-out/${t.id}/mulai` }, "Lanjutkan"));
  else if (habisBelumHitung) tombol.push(h("a", { class: "tombol tombol-utama", href: "#/latihan/" + t.last_attempt_id }, "Lihat hasil"));
  else {
    if (selesai) tombol.push(h("a", { class: "tombol tombol-garis", href: "#/hasil/" + t.last_attempt_id }, "Lihat hasil terakhir"));
    tombol.push(t.question_count > 0 ? h("a", { class: "tombol tombol-utama", href: "#/try-out/" + t.id }, selesai ? "Kerjakan ulang" : "Mulai") : h("span", { class: "lembut" }, "Belum ada soal."));
  }
  return h("li", { class: "kartu-tryout" },
    h("h2", {}, t.title),
    h("ul", { class: "meta-baris" }, h("li", {}, d.nama.get(t.subject_id) || "Mapel"), h("li", {}, `${t.question_count} soal`), h("li", {}, ikon("jam", 14), `${t.duration_minutes} menit`)),
    baris, h("div", { class: "aksi-baris" }, tombol));
}

// ----- aturan sebelum mulai -----
export async function aturan(wadah, ctx) {
  if (ctx.siswa.payment_status !== "Lunas") { kunciHalaman(wadah); return; }
  const id = ctx.params.id;
  if (!UUID.test(id)) { location.hash = "#/try-out"; return; }
  ganti(wadah, elMemuat());
  let d;
  try { d = await muatData(); } catch (e) { if (ctx.aktif()) ganti(wadah, elGalat(pesanGalat(e), () => aturan(wadah, ctx))); return; }
  if (!ctx.aktif()) return;
  const t = d.daftar.find((x) => x.id === id);
  if (!t) { ganti(wadah, elKosong("Try out tidak ditemukan", "Try out ini belum terbit atau sudah dihapus.", "jam", h("a", { class: "tombol tombol-utama", href: "#/try-out" }, "Kembali ke Try Out"))); return; }
  const jalan = berjalan(t, d.sekarang);
  const poin = (teks) => h("li", {}, ikon("centang", 20), h("span", {}, teks));
  ganti(wadah, h("div", { class: "halaman" },
    h("a", { href: "#/try-out" }, "← Daftar Try Out"),
    h("header", { class: "halaman-kepala" }, h("h1", {}, t.title), h("p", { class: "lembut" }, d.nama.get(t.subject_id) || "")),
    h("ul", { class: "meta-baris" }, h("li", {}, `${t.question_count} soal`), h("li", {}, ikon("jam", 14), `${t.duration_minutes} menit`)),
    jalan ? h("p", { class: "banner banner-info", role: "status" }, "Kamu masih punya percobaan yang sedang berjalan. Waktunya tetap berjalan.") : null,
    h("section", { class: "kartu", "aria-labelledby": "jdl-aturan" },
      h("h2", { id: "jdl-aturan" }, "Aturan pengerjaan"),
      h("ul", { class: "aturan-daftar" },
        poin(`Waktumu ${t.duration_minutes} menit untuk ${t.question_count} soal.`),
        poin("Waktu terus berjalan walau halaman ditutup atau dimuat ulang. Timer tidak bisa diulang."),
        poin("Saat waktu habis, jawabanmu otomatis dikumpulkan."),
        poin("Jawaban tersimpan otomatis setiap kali kamu memilih. Pastikan koneksi internetmu stabil."),
        poin("Soal yang belum dijawab dihitung salah. Kamu boleh mengerjakan ulang; semua percobaan tercatat.")),
      h("div", { class: "aksi-baris" },
        h("a", { class: "tombol tombol-emas tombol-besar", href: `#/try-out/${t.id}/mulai` }, jalan ? "Lanjutkan" : "Mulai sekarang"),
        h("a", { class: "tombol tombol-garis", href: "#/try-out" }, "Kembali")))));
}

// ----- memulai: buat / lanjutkan percobaan lalu pindah ke #/latihan/:attemptId -----
export async function mulai(wadah, ctx) {
  if (ctx.siswa.payment_status !== "Lunas") { kunciHalaman(wadah); return; }
  const id = ctx.params.id;
  if (!UUID.test(id)) { location.hash = "#/try-out"; return; }
  ganti(wadah, elMemuat("Menyiapkan try out…"));
  try {
    const aid = await ambil(supabase.rpc("start_tryout", { p_tryout_id: id }));
    if (!ctx.aktif()) return;
    pergi("#/latihan/" + aid);
  } catch (e) {
    if (!ctx.aktif()) return;
    const kembali = h("a", { class: "tombol tombol-utama", href: "#/try-out" }, "Kembali ke Try Out");
    if (e && e.details === "BELUM_ADA_SOAL") ganti(wadah, elKosong("Try out belum tersedia", "Try out ini belum punya soal.", "jam", kembali));
    else if (e && e.details === "TIDAK_DITEMUKAN") ganti(wadah, elKosong("Try out tidak ditemukan", "Try out ini belum terbit atau sudah dihapus.", "jam", kembali));
    else ganti(wadah, elGalat(pesanGalat(e), () => mulai(wadah, ctx)));
  }
}