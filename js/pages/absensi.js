// ANORA siswa — absensi.js (ringkasan dan riwayat per sesi)
import { supabase, ambil, pesanGalat } from "../supabase.js";
import { h, ganti, elMemuat, elGalat, elKosong, lencanaAbsen, tanggalPanjang, angka } from "../ui.js";

export async function tampil(wadah, ctx) {
  ganti(wadah, elMemuat());
  try {
    const baris = await ambil(
      supabase.from("attendance").select("id,date,day,status,topic,notes")
        .order("date", { ascending: false }).order("created_at", { ascending: false }).limit(1000),
    );
    if (!ctx.aktif()) return;
    ganti(wadah, susun(baris || []));
  } catch (e) {
    if (!ctx.aktif()) return;
    ganti(wadah, elGalat(pesanGalat(e), () => tampil(wadah, ctx)));
  }
}

function stat(label, nilai) {
  return h("div", { class: "stat" }, h("span", { class: "stat-nilai" }, nilai), h("span", { class: "stat-label" }, label));
}

function susun(baris) {
  const kepala = h("header", { class: "halaman-kepala" }, h("h1", {}, "Absensi"));
  if (baris.length === 0) {
    return h("div", { class: "halaman" }, kepala,
      elKosong("Belum ada riwayat absensi.", "Catatan muncul setelah sesi pertama.", "kalender"));
  }
  const total = baris.length;
  const hadir = baris.filter((b) => b.status === "Hadir").length;
  const izinSakit = baris.filter((b) => b.status === "Izin" || b.status === "Sakit").length;
  const persen = (hadir / total) * 100;

  const ringkasan = h("section", { "aria-label": "Ringkasan kehadiran" },
    h("div", { class: "stat-grid" },
      stat("Total sesi", angka(total)),
      stat("Hadir", angka(hadir)),
      stat("Izin / Sakit", angka(izinSakit)),
      stat("Kehadiran", angka(persen) + "%")));

  const daftar = h("ul", { class: "daftar-sesi" }, baris.map((b) =>
    h("li", { class: "sesi" },
      h("div", { class: "sesi-tgl" },
        h("span", { class: "sesi-hari" }, b.day),
        h("time", { datetime: b.date }, tanggalPanjang(b.date))),
      h("div", { class: "sesi-isi" },
        lencanaAbsen(b.status),
        h("p", { class: "sesi-materi" }, h("span", { class: "label" }, "Materi"),
          b.topic || h("span", { class: "lembut" }, "Tidak dicatat")),
        b.notes ? h("p", { class: "sesi-catatan" }, h("span", { class: "label" }, "Catatan"), b.notes) : null))));

  return h("div", { class: "halaman" }, kepala, ringkasan, h("h2", { style: "margin-top:1.75rem" }, "Riwayat sesi"), daftar);
}