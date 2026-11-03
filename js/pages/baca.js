// ANORA siswa — baca.js (halaman pembaca PDF per bab)
import { supabase, ambil, pesanGalat } from "../supabase.js";
import { h, ganti, elMemuat, elGalat, elKosong } from "../ui.js";
import { elKunci } from "./kunci.js";
import { bukaPembaca } from "../reader.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    m = await ambil(supabase.from("materials").select("id,grade,subject_id,title,pdf_path,kind").eq("id", id).maybeSingle());
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
  if (m && m.kind === "link") { location.replace(location.pathname + location.search + "#/materi/media/" + m.id); return; }
  const kembali = m ? `#/materi/kelas/${m.grade}/${m.subject_id}` : "#/materi";
  if (!m || !m.pdf_path) {
    ganti(wadah, h("div", { class: "halaman" },
      elKosong("Materi tidak tersedia", "Materi ini tidak ditemukan, belum diterbitkan, atau PDF-nya belum diunggah.", "buku",
        h("a", { class: "tombol tombol-utama", href: kembali }, "Kembali ke daftar bab"))));
    return;
  }

  const pb = bukaPembaca({
    judul: m.title,
    labelKembali: "Daftar bab",
    ambilUrl: async () => {
      const { data, error } = await supabase.storage.from("materi-pdf").createSignedUrl(m.pdf_path, 3600);
      if (error || !data || !data.signedUrl) {
        if (/jwt|token|expired/i.test((error && error.message) || "")) window.dispatchEvent(new CustomEvent("anora:sesi-berakhir", { detail: {} }));
        const e = new Error("tautan");
        e.pesan = "Materi ini tidak bisa dibuka. Pastikan akses Anda aktif atau hubungi admin bimbel.";
        throw e;
      }
      return data.signedUrl;
    },
    kunciIngatan: `anora-baca:${ctx.siswa.id}:${m.id}`,
    adaLatihan: !!(info && info.question_count > 0),
    saatLatihan: () => { location.hash = "#/materi/latihan/" + m.id; },
    saatKembali: () => { location.hash = kembali; },
    latar: document.getElementById("app"),
  });
  ganti(wadah);
  return () => pb.tutup(); // dipanggil saat pindah halaman atau keluar
}