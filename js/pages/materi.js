// ANORA siswa — materi.js (alur: pilih kelas → mata pelajaran → daftar bab)
import { supabase, ambil, pesanGalat } from "../supabase.js";
import { h, ikon, ganti, elMemuat, elGalat, elKosong, angka } from "../ui.js";
import { elKunci } from "./kunci.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jejak(butir) {
  return h("nav", { class: "jejak", "aria-label": "Jejak halaman" },
    h("ol", {}, butir.map((b, i) => h("li", {},
      i === butir.length - 1 ? h("span", { "aria-current": "page" }, b.teks) : h("a", { href: b.href }, b.teks)))));
}

export async function tampil(wadah, ctx) {
  const { kelas, mapel } = ctx.params;
  if (ctx.siswa.payment_status !== "Lunas") {
    ganti(wadah, h("div", { class: "halaman" }, h("header", { class: "halaman-kepala" }, h("h1", {}, "Materi")), elKunci()));
    return;
  }
  if (kelas !== undefined && !/^[1-6]$/.test(kelas)) { location.hash = "#/materi"; return; }
  if (mapel !== undefined) return tampilBab(wadah, ctx, Number(kelas), mapel);
  if (kelas !== undefined) return tampilMapel(wadah, ctx, Number(kelas));
  tampilKelas(wadah);
}

function tampilKelas(wadah) {
  ganti(wadah, h("div", { class: "halaman" },
    h("header", { class: "halaman-kepala" }, h("h1", {}, "Materi"), h("p", { class: "lembut" }, "Pilih kelas yang ingin dipelajari.")),
    h("div", { class: "kartu-pilih-grid" }, [1, 2, 3, 4, 5, 6].map((n) =>
      h("a", { class: "kartu-pilih", href: `#/materi/kelas/${n}` }, h("span", {}, "Kelas"), h("span", { class: "angka-besar" }, n))))));
}

async function tampilMapel(wadah, ctx, kelas) {
  ganti(wadah, elMemuat());
  try {
    const daftar = await ambil(supabase.from("subjects").select("id,name").order("name"));
    if (!ctx.aktif()) return;
    ganti(wadah, h("div", { class: "halaman" },
      jejak([{ teks: "Materi", href: "#/materi" }, { teks: `Kelas ${kelas}` }]),
      h("header", { class: "halaman-kepala" }, h("h1", {}, `Kelas ${kelas}`), h("p", { class: "lembut" }, "Pilih mata pelajaran.")),
      daftar.length
        ? h("div", { class: "kartu-pilih-grid" }, daftar.map((m) =>
            h("a", { class: "kartu-pilih", href: `#/materi/kelas/${kelas}/${m.id}` }, ikon("buku", 36), h("span", {}, m.name))))
        : elKosong("Belum ada mata pelajaran.", "Hubungi admin bimbel.", "buku")));
  } catch (e) {
    if (!ctx.aktif()) return;
    ganti(wadah, elGalat(pesanGalat(e), () => tampilMapel(wadah, ctx, kelas)));
  }
}

async function tampilBab(wadah, ctx, kelas, mapelId) {
  if (!UUID.test(mapelId)) { location.hash = `#/materi/kelas/${kelas}`; return; }
  ganti(wadah, elMemuat());
  try {
    const [mapelList, bab] = await Promise.all([
      ambil(supabase.from("subjects").select("id,name")),
      ambil(supabase.rpc("list_materials", { p_grade: kelas, p_subject_id: mapelId })),
    ]);
    if (!ctx.aktif()) return;
    const mapel = mapelList.find((m) => m.id === mapelId);
    if (!mapel) { location.hash = `#/materi/kelas/${kelas}`; return; }
    ganti(wadah, h("div", { class: "halaman" },
      jejak([{ teks: "Materi", href: "#/materi" }, { teks: `Kelas ${kelas}`, href: `#/materi/kelas/${kelas}` }, { teks: mapel.name }]),
      h("header", { class: "halaman-kepala" }, h("h1", {}, `${mapel.name} · Kelas ${kelas}`), h("p", { class: "lembut" }, "Pilih bab yang ingin dibaca.")),
      bab.length
        ? h("ul", { class: "daftar-bab" }, bab.map((b, i) => itemBab(b, i + 1)))
        : elKosong("Belum ada bab yang terbit.", "Bab akan muncul di sini setelah ditambahkan oleh admin bimbel.", "buku")));
  } catch (e) {
    if (!ctx.aktif()) return;
    ganti(wadah, elGalat(pesanGalat(e), () => tampilBab(wadah, ctx, kelas, mapelId)));
  }
}

const adaKonten = (b) => (b.kind === "link" ? !!b.external_url : !!b.pdf_path);
const hrefBaca = (b) => (b.kind === "link" ? "#/materi/media/" + b.id : "#/materi/baca/" + b.id);

function isiBab(b, no) {
  const meta = h("span", { class: "bab-meta" },
    h("span", { class: "badge b-biru" }, b.kind === "link" ? "Media belajar" : "PDF"),
    h("span", {}, b.question_count > 0 ? `${angka(b.question_count)} soal latihan` : "Belum ada latihan"),
    b.done ? h("span", { class: "badge b-hijau" }, ikon("centang", 16), "Sudah dikerjakan") : null,
    b.done && b.last_score !== null && b.last_score !== undefined ? h("span", {}, `Nilai terakhir: ${angka(b.last_score)}`) : null,
    !adaKonten(b) ? h("span", { class: "badge b-kuning" }, "Materi belum tersedia") : null);
  return [h("span", { class: "bab-no", "aria-hidden": "true" }, no), h("span", { class: "bab-isi" }, h("span", { class: "bab-judul" }, b.title), meta)];
}

function itemBab(b, no) {
  const href = hrefBaca(b);
  if (!adaKonten(b)) return h("li", {}, h("div", { class: "bab bab-mati" }, isiBab(b, no)));
  if (!b.done) return h("li", {}, h("a", { class: "bab", href }, isiBab(b, no), ikon(b.kind === "link" ? "bintang" : "buku", 22)));

  // Sudah dikerjakan: tampilkan pilihan
  const pesan = h("p", { role: "status" });
  const bHasil = h("button", { type: "button", class: "tombol tombol-garis", onclick: async () => {
    pesan.textContent = "Membuka hasil…";
    try {
      const skor = await ambil(supabase.rpc("my_scores"));
      const x = (skor || []).find((s) => s.material_id === b.id && s.kind === "latihan" && s.status === "submitted");
      if (x) location.hash = "#/hasil/" + x.attempt_id;
      else pesan.textContent = "Belum ada hasil untuk bab ini.";
    } catch (e) { pesan.textContent = pesanGalat(e); }
  } }, "Lihat hasil terakhir");
  const panel = h("div", { class: "bab-pilihan", id: "pilihan-" + b.id },
    h("a", { class: "tombol tombol-utama", href }, b.kind === "link" ? "Buka materi lagi" : "Baca ulang materi"),
    b.question_count > 0 ? h("a", { class: "tombol tombol-garis", href: "#/materi/latihan/" + b.id }, "Kerjakan ulang latihan soal") : null,
    bHasil, pesan);
  panel.hidden = true;
  const tombol = h("button", { type: "button", class: "bab", "aria-expanded": "false", "aria-controls": panel.id }, isiBab(b, no));
  tombol.addEventListener("click", () => {
    const buka = panel.hidden;
    panel.hidden = !buka;
    tombol.setAttribute("aria-expanded", String(buka));
    pesan.textContent = "";
  });
  return h("li", {}, tombol, panel);
}