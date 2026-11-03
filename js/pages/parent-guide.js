// ANORA siswa — parent-guide.js (daftar panduan untuk orang tua)
import { supabase, ambil, pesanGalat } from "../supabase.js";
import { h, ganti, elMemuat, elGalat, elKosong, tanggalPanjang, selisihHari, renderTeks } from "../ui.js";

export async function tampil(wadah, ctx) {
  ganti(wadah, elMemuat());
  try {
    const data = await ambil(
      supabase.from("parent_guides").select("id,date,title,content")
        .order("date", { ascending: false }).order("created_at", { ascending: false }).limit(200),
    );
    if (!ctx.aktif()) return;
    ganti(wadah, susun(data || []));
  } catch (e) {
    if (!ctx.aktif()) return;
    ganti(wadah, elGalat(pesanGalat(e), () => tampil(wadah, ctx)));
  }
}

function kartu(g) {
  const baru = selisihHari(g.date) <= 7; // panduan 7 hari terakhir
  return h("article", { class: "kartu panduan" },
    h("div", { class: "panduan-meta" },
      h("time", { datetime: g.date }, tanggalPanjang(g.date)),
      baru ? h("span", { class: "badge b-emas" }, "Baru") : null),
    h("h2", {}, g.title),
    h("div", { class: "isi-teks" }, renderTeks(g.content)));
}

function susun(daftar) {
  const kepala = h("header", { class: "halaman-kepala" },
    h("h1", {}, "Parent Guide"),
    h("p", { class: "lembut" }, "Panduan dari bimbel untuk mendampingi belajar anak di rumah."));
  if (daftar.length === 0) {
    return h("div", { class: "halaman" }, kepala,
      elKosong("Belum ada parent guide.", "Panduan dari bimbel akan muncul di sini setelah ditambahkan oleh admin.", "panduan"));
  }
  return h("div", { class: "halaman" }, kepala, h("div", { class: "panduan-daftar" }, daftar.map(kartu)));
}