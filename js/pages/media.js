// ANORA siswa — media.js (materi berupa tautan media pembelajaran eksternal)
import { supabase, ambil, pesanGalat } from "../supabase.js";
import { h, ikon, ganti, elMemuat, elGalat, elKosong, angka } from "../ui.js";
import { elKunci } from "./kunci.js";
import { UUID } from "../soal-tampil.js";

const aman = (u) => /^https?:\/\//i.test(String(u || ""));
const hostDari = (u) => { try { return new URL(u).hostname; } catch { return ""; } };

export async function tampil(wadah, ctx) {
  if (ctx.siswa.payment_status !== "Lunas") {
    ganti(wadah, h("div", { class: "halaman" }, h("header", { class: "halaman-kepala" }, h("h1", {}, "Materi")), elKunci()));
    return;
  }
  const id = ctx.params.id;
  if (!UUID.test(id)) { location.hash = "#/materi"; return; }
  ganti(wadah, elMemuat());
  let m, info;
  try {
    m = await ambil(supabase.from("materials").select("id,grade,subject_id,title,kind,external_url").eq("id", id).maybeSingle());
    if (m) {
      const daftar = await ambil(supabase.rpc("list_materials", { p_grade: m.grade, p_subject_id: m.subject_id }));
      info = (daftar || []).find((x) => x.id === id);
    }
  } catch (e) {
    if (!ctx.aktif()) return;
    ganti(wadah, elGalat(pesanGalat(e), () => tampil(wadah, ctx)));
    return;
  }
  if (!ctx.aktif()) return;
  if (m && m.kind !== "link") { location.replace(location.pathname + location.search + "#/materi/baca/" + m.id); return; }
  const kembali = m ? `#/materi/kelas/${m.grade}/${m.subject_id}` : "#/materi";
  if (!m || !aman(m.external_url)) {
    ganti(wadah, h("div", { class: "halaman" },
      elKosong("Materi tidak tersedia", "Materi ini tidak ditemukan, belum diterbitkan, atau tautannya belum diisi.", "buku",
        h("a", { class: "tombol tombol-utama", href: kembali }, "Kembali ke daftar bab"))));
    return;
  }
  const adaSoal = !!(info && info.question_count > 0);
  ganti(wadah, h("div", { class: "halaman" },
    h("a", { href: kembali }, "← Daftar bab"),
    h("header", { class: "halaman-kepala" }, h("h1", {}, m.title), h("p", { class: "lembut" }, "Materi berupa media pembelajaran di situs lain.")),
    info && info.done ? h("p", { class: "badge b-hijau", style: "margin-bottom:1rem" }, ikon("centang", 16), `Latihan sudah dikerjakan${info.last_score !== null && info.last_score !== undefined ? " · nilai terakhir " + angka(info.last_score) : ""}`) : null,
    h("section", { class: "kartu", "aria-labelledby": "jdl-media" },
      h("h2", { id: "jdl-media" }, "Langkah belajar"),
      h("ol", { class: "aturan-daftar", style: "padding-left:1.25rem;list-style:decimal" },
        h("li", {}, "Buka media pembelajaran di bawah ini. Halamannya terbuka di tab baru."),
        h("li", {}, "Pelajari sampai selesai, lalu tutup tab itu dan kembali ke sini."),
        h("li", {}, adaSoal ? "Kerjakan latihan soal untuk mengecek pemahamanmu." : "Latihan soal untuk bab ini belum tersedia.")),
      h("p", { class: "lembut" }, "Alamat: ", h("strong", {}, hostDari(m.external_url))),
      h("div", { class: "aksi-baris" },
        h("a", { class: "tombol tombol-emas tombol-besar", href: m.external_url, target: "_blank", rel: "noopener noreferrer" }, "Buka media pembelajaran"),
        adaSoal ? h("a", { class: "tombol tombol-utama tombol-besar", href: "#/materi/latihan/" + m.id }, info && info.done ? "Kerjakan ulang latihan" : "Lanjut ke Latihan Soal") : null))));
}