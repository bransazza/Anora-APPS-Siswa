// ANORA siswa — beranda.js (ringkasan setelah login)
import { supabase, ambil, pesanGalat } from "../supabase.js";
import { h, ikon, ganti, elMemuat, elGalat, badgeBayar, lencanaAbsen, tanggalPanjang, angka, salamWaktu } from "../ui.js";

export async function tampil(wadah, ctx) {
  ganti(wadah, elMemuat());
  try {
    const [dash, guide, sesi] = await Promise.all([
      ambil(supabase.rpc("my_dashboard")),
      ambil(supabase.from("parent_guides").select("id,title,date")
        .order("date", { ascending: false }).order("created_at", { ascending: false }).limit(1)),
      ambil(supabase.from("attendance").select("date,day,status,topic")
        .order("date", { ascending: false }).order("created_at", { ascending: false }).limit(1)),
    ]);
    if (!ctx.aktif()) return;
    ganti(wadah, susun(dash, (guide || [])[0], (sesi || [])[0]));
  } catch (e) {
    if (!ctx.aktif()) return;
    ganti(wadah, elGalat(pesanGalat(e), () => tampil(wadah, ctx)));
  }
}

function stat(label, nilai) {
  return h("div", { class: "stat" }, h("span", { class: "stat-nilai" }, nilai), h("span", { class: "stat-label" }, label));
}

function susun(d, guide, sesi) {
  const lunas = d.payment_status === "Lunas";
  const total = Number(d.total_sessions) || 0;

  const kepala = h("header", { class: "halaman-kepala" },
    h("h1", {}, `${salamWaktu()}, ${d.child_name}!`),
    h("p", { class: "lembut" }, `Kelas ${d.grade} · Status pembayaran: `, badgeBayar(d.payment_status)));

  const peringatan = lunas ? null : h("section", { class: "kartu kartu-peringatan", "aria-labelledby": "jdl-akses" },
    ikon("kunci"),
    h("div", {},
      h("h2", { id: "jdl-akses" }, "Akses belajar belum aktif"),
      h("p", {}, "Pembayaran belum dikonfirmasi admin bimbel. Materi, Latihan Soal, Try Out, dan Nilai akan terbuka setelah pembayaran dikonfirmasi. Absensi dan Parent Guide tetap bisa dibuka.")));

  const kehadiran = h("section", { class: "bagian", "aria-labelledby": "jdl-hadir" },
    h("h2", { id: "jdl-hadir" }, "Kehadiran"),
    total === 0
      ? h("p", { class: "lembut" }, "Belum ada sesi tercatat. Ringkasan muncul setelah sesi pertama.")
      : h("div", { class: "stat-grid" },
          stat("Total sesi", angka(total)),
          stat("Hadir", angka(d.hadir)),
          stat("Kehadiran", angka(d.attendance_percent) + "%")),
    h("a", { class: "tautan-lihat", href: "#/absensi" }, "Lihat riwayat absensi →"));

  const kartuPanduan = h("section", { class: "kartu", "aria-labelledby": "jdl-pg" },
    h("h2", { id: "jdl-pg" }, "Parent Guide terbaru"),
    guide
      ? [h("h3", {}, guide.title), h("p", { class: "lembut" }, tanggalPanjang(guide.date))]
      : h("p", { class: "lembut" }, "Belum ada parent guide."),
    h("a", { class: "tautan-lihat", href: "#/parent-guide" }, "Buka Parent Guide →"));

  const kartuSesi = h("section", { class: "kartu", "aria-labelledby": "jdl-sesi" },
    h("h2", { id: "jdl-sesi" }, "Sesi terakhir"),
    sesi
      ? [h("h3", {}, `${sesi.day}, ${tanggalPanjang(sesi.date)}`),
         lencanaAbsen(sesi.status),
         h("p", { class: "lembut" }, sesi.topic ? `Materi: ${sesi.topic}` : "Materi tidak dicatat.")]
      : h("p", { class: "lembut" }, "Belum ada sesi tercatat."));

  return h("div", { class: "halaman" }, kepala, peringatan, kehadiran, h("div", { class: "dua-kolom" }, kartuPanduan, kartuSesi));
}