// ANORA siswa — hasil.js (nilai dan ulasan per soal)
import { supabase, ambil, pesanGalat } from "../supabase.js";
import { h, ikon, ganti, elMemuat, elGalat, elKosong, angka } from "../ui.js";
import { renderTeksRumus } from "../rumus.js";
import { elKunci } from "./kunci.js";
import { BUCKET_SOAL, BUCKET_BAHAS, UUID, titipan, petaUrl, elGambar, kumpulPathSoal } from "../soal-tampil.js";

function semangat(skor) {
  if (skor >= 90) return "Luar biasa! Kamu sudah menguasai bab ini.";
  if (skor >= 75) return "Bagus sekali! Sedikit lagi sempurna.";
  if (skor >= 50) return "Lumayan! Baca ulang materinya, lalu coba lagi.";
  return "Jangan menyerah! Baca ulang materinya pelan-pelan, lalu coba lagi.";
}

export async function tampil(wadah, ctx) {
  if (ctx.siswa.payment_status !== "Lunas") {
    ganti(wadah, h("div", { class: "halaman" }, h("header", { class: "halaman-kepala" }, h("h1", {}, "Hasil Latihan")), elKunci()));
    return;
  }
  const aid = ctx.params.aid;
  if (!UUID.test(aid)) { location.hash = "#/materi"; return; }
  ganti(wadah, elMemuat());
  const titip = titipan.aid === aid ? titipan.data : null;
  titipan.aid = null; titipan.data = null;
  let hasil, meta;
  try {
    const [r, skor] = await Promise.all([
      titip ? Promise.resolve(titip) : ambil(supabase.rpc("get_attempt_review", { p_attempt_id: aid })),
      ambil(supabase.rpc("my_scores")).catch(() => []),
    ]);
    hasil = r;
    meta = (skor || []).find((x) => x.attempt_id === aid) || null;
  } catch (e) {
    if (!ctx.aktif()) return;
    if (e && e.details === "BELUM_SELESAI") { location.replace(location.pathname + location.search + "#/latihan/" + aid); return; }
    ganti(wadah, e && e.details === "TIDAK_DITEMUKAN"
      ? elKosong("Hasil tidak ditemukan", "Percobaan ini tidak ada.", "medali", h("a", { class: "tombol tombol-utama", href: "#/materi" }, "Kembali ke Materi"))
      : elGalat(pesanGalat(e), () => tampil(wadah, ctx)));
    return;
  }
  const items = hasil.items || [];
  const [petaSoal, petaBahas] = await Promise.all([
    petaUrl(BUCKET_SOAL, kumpulPathSoal(items)).catch(() => new Map()),
    petaUrl(BUCKET_BAHAS, items.map((i) => i.explanation_image_path)).catch(() => new Map()),
  ]);
  if (!ctx.aktif()) return;

  const tryout = hasil.kind === "tryout";
  const kembali = tryout ? "#/try-out" : meta ? `#/materi/kelas/${meta.grade}/${meta.subject_id}` : "#/materi";
  const ulang = tryout ? (meta && meta.tryout_id ? "#/try-out/" + meta.tryout_id : "#/try-out") : meta ? "#/materi/latihan/" + meta.material_id : "#/materi";
  const skor = Number(hasil.score) || 0;
  const benar = items.filter((i) => i.is_correct).length;
  const salah = items.length - benar;
  let filter = "semua";

  const daftar = h("div", { class: "daftar-ulasan" });
  const tombolFilter = h("div", { class: "filter-ulasan", role: "group", "aria-label": "Saring ulasan" });
  const infoFilter = h("p", { role: "status", class: "sr-only" });

  function kartuUlasan(it) {
    const kunci = it.correct || [], jawab = it.answer || [];
    const tidakDijawab = !jawab.length;
    return h("article", { class: "ulasan " + (it.is_correct ? "ulasan-benar" : "ulasan-salah") },
      h("div", { class: "ulasan-kepala" }, h("h3", { class: "rapat" }, `Soal ${it.position}`),
        it.is_correct ? h("span", { class: "badge b-hijau" }, ikon("centang", 16), "Benar")
          : h("span", { class: "badge b-merah" }, ikon("silang", 16), tidakDijawab ? "Salah (tidak dijawab)" : "Salah")),
      it.stimulus_text ? h("div", { class: "stimulus teks-soal" }, renderTeksRumus(it.stimulus_text)) : null,
      h("div", { class: "teks-soal soal-teks" }, renderTeksRumus(it.question_text || "")),
      elGambar(petaSoal, BUCKET_SOAL, it.question_image_path, "Gambar soal"),
      h("ul", { class: "opsi-ulasan" }, (it.options || []).map((o) => {
        const adalahKunci = kunci.includes(o.id), dipilih = jawab.includes(o.id);
        return h("li", { class: adalahKunci ? "u-kunci" : dipilih ? "u-salah" : "" },
          h("span", { class: "opsi-huruf" }, o.id),
          h("div", { style: "flex:1;min-width:0" },
            o.text ? h("span", { class: "teks-soal" }, renderTeksRumus(o.text)) : null,
            elGambar(petaSoal, BUCKET_SOAL, o.image_path, "Gambar pilihan " + o.id),
            h("div", {},
              dipilih ? h("span", { class: "badge tag-opsi " + (adalahKunci ? "b-hijau" : "b-merah") }, ikon(adalahKunci ? "centang" : "silang", 16), "Jawabanmu") : null,
              adalahKunci ? h("span", { class: "badge tag-opsi b-hijau" }, ikon("bintang", 16), "Kunci jawaban") : null)));
      })),
      it.explanation_text || it.explanation_image_path
        ? h("div", { class: "pembahasan" }, h("h3", {}, "Pembahasan"),
            it.explanation_text ? h("div", { class: "teks-soal" }, renderTeksRumus(it.explanation_text)) : null,
            elGambar(petaBahas, BUCKET_BAHAS, it.explanation_image_path, "Gambar pembahasan")) : null);
  }
  function gambarDaftar() {
    const tampilItem = items.filter((i) => filter === "semua" || (filter === "benar" ? i.is_correct : !i.is_correct));
    infoFilter.textContent = `Menampilkan ${tampilItem.length} soal.`;
    daftar.replaceChildren(...(tampilItem.length ? tampilItem.map(kartuUlasan) : [h("p", { class: "lembut" }, "Tidak ada soal pada kategori ini.")]));
  }
  function gambarFilter() {
    const opsi = [["semua", `Semua (${items.length})`], ["benar", `Benar (${benar})`], ["salah", `Salah (${salah})`]];
    tombolFilter.replaceChildren(...opsi.map(([k, t]) => h("button", { type: "button", "aria-pressed": String(filter === k), onclick: () => { filter = k; gambarFilter(); gambarDaftar(); } }, t)));
  }

  ganti(wadah, h("div", { class: "halaman" },
    h("a", { href: kembali }, tryout ? "← Daftar Try Out" : "← Daftar bab"),
    h("header", { class: "halaman-kepala" }, h("h1", {}, tryout ? "Hasil Try Out" : "Hasil Latihan"), meta ? h("p", { class: "lembut" }, meta.title) : null,
      hasil.status === "expired" ? h("p", { class: "banner banner-info", role: "status" }, "Waktu habis. Jawabanmu dikumpulkan otomatis.") : null),
    h("section", { class: "skor-kartu", "aria-label": "Nilai" },
      h("span", { class: "skor-angka" }, angka(skor)),
      h("p", { style: "font-weight:800;font-size:1.2rem" }, `${hasil.correct_count ?? benar} benar dari ${hasil.total_count ?? items.length} soal`),
      h("p", {}, semangat(skor))),
    h("div", { class: "aksi-baris", style: "margin-top:1rem" },
      h("a", { class: "tombol tombol-utama", href: ulang }, "Kerjakan ulang"),
        h("a", { class: "tombol tombol-garis", href: kembali }, tryout ? "Kembali ke daftar Try Out" : "Kembali ke daftar bab")),
    h("h2", { style: "margin-top:1.75rem" }, "Ulasan per soal"), tombolFilter, infoFilter, daftar));
  gambarFilter(); gambarDaftar();
}