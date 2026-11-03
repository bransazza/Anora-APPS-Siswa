// ANORA siswa — nilai.js (Nilai Saya: ringkasan, latihan, try out, grafik)
import { supabase, ambil, pesanGalat } from "../supabase.js";
import { h, ikon, ganti, elMemuat, elGalat, elKosong, angka, waktuJakarta } from "../ui.js";
import { elKunci } from "./kunci.js";

const NS = "http://www.w3.org/2000/svg";
function svg(tag, attrs = {}, ...anak) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  anak.forEach((a) => el.append(a instanceof Node ? a : document.createTextNode(String(a))));
  return el;
}

// Grafik garis perkembangan nilai (SVG buatan sendiri). titik = [{skor, tanggal, judul}] urut dari lama ke baru.
function grafik(titik) {
  const L = 640, T = 280, ml = 44, mr = 16, mt = 16, mb = 36;
  const x = (i) => (titik.length === 1 ? (ml + L - mr) / 2 : ml + (i * (L - ml - mr)) / (titik.length - 1));
  const y = (v) => mt + (1 - v / 100) * (T - mt - mb);
  const deskripsi = "Grafik garis nilai try out dari percobaan terlama ke terbaru: " +
    titik.slice(-15).map((p, i) => `ke-${titik.length - Math.min(15, titik.length) + i + 1}: ${angka(p.skor)}`).join(", ") + ".";
  const g = svg("svg", { viewBox: `0 0 ${L} ${T}`, class: "grafik", role: "img", "aria-label": deskripsi }, svg("title", {}, "Perkembangan nilai try out"));
  [0, 25, 50, 75, 100].forEach((v) => {
    const ln = svg("line", { x1: ml, x2: L - mr, y1: y(v), y2: y(v) });
    ln.style.stroke = "var(--garis)";
    const tx = svg("text", { x: ml - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 12 }, v);
    tx.style.fill = "var(--lembut)";
    g.append(ln, tx);
  });
  if (titik.length > 1) {
    const garis = svg("polyline", { points: titik.map((p, i) => `${x(i)},${y(p.skor)}`).join(" "), fill: "none", "stroke-width": 3, "stroke-linejoin": "round" });
    garis.style.stroke = "var(--royal)";
    g.append(garis);
  }
  titik.forEach((p, i) => {
    const c = svg("circle", { cx: x(i), cy: y(p.skor), r: 5, "stroke-width": 2 }, svg("title", {}, `${p.judul}: ${angka(p.skor)} (${p.tanggal})`));
    c.style.fill = "var(--emas)"; c.style.stroke = "var(--navy)";
    g.append(c);
    if (titik.length <= 15 || i % Math.ceil(titik.length / 10) === 0) {
      const lb = svg("text", { x: x(i), y: T - 14, "text-anchor": "middle", "font-size": 12 }, i + 1);
      lb.style.fill = "var(--lembut)";
      g.append(lb);
    }
  });
  const ket = svg("text", { x: (ml + L - mr) / 2, y: T - 1, "text-anchor": "middle", "font-size": 11 }, "Percobaan ke-");
  ket.style.fill = "var(--lembut)";
  g.append(ket);
  return g;
}

export async function tampil(wadah, ctx) {
  const kepala = h("header", { class: "halaman-kepala" }, h("h1", {}, "Nilai Saya"));
  if (ctx.siswa.payment_status !== "Lunas") { ganti(wadah, h("div", { class: "halaman" }, kepala, elKunci())); return; }
  ganti(wadah, elMemuat());
  let semua;
  try { semua = (await ambil(supabase.rpc("my_scores"))) || []; }
  catch (e) { if (ctx.aktif()) ganti(wadah, elGalat(pesanGalat(e), () => tampil(wadah, ctx))); return; }
  if (!ctx.aktif()) return;
  if (!semua.length) {
    ganti(wadah, h("div", { class: "halaman" }, kepala, elKosong("Belum ada nilai.", "Nilai muncul setelah kamu mengumpulkan latihan soal atau try out.", "medali", h("a", { class: "tombol tombol-utama", href: "#/materi" }, "Mulai belajar"))));
    return;
  }
  let jenis = "latihan", kelas = "", mapel = "";
  const kKelas = h("select", { id: "f-kelas", "aria-label": "Filter kelas" }, h("option", { value: "" }, "Semua kelas"),
    [...new Set(semua.map((x) => x.grade))].sort().map((g) => h("option", { value: String(g) }, "Kelas " + g)));
  const mapelUnik = [...new Map(semua.map((x) => [x.subject_id, x.subject_name])).entries()];
  const kMapel = h("select", { id: "f-mapel", "aria-label": "Filter mata pelajaran" }, h("option", { value: "" }, "Semua mapel"),
    mapelUnik.map(([id, n]) => h("option", { value: id }, n || "—")));
  kKelas.addEventListener("change", () => { kelas = kKelas.value; gambar(); });
  kMapel.addEventListener("change", () => { mapel = kMapel.value; gambar(); });
  const isi = h("div");
  const tombolJenis = h("div", { class: "filter-ulasan", role: "group", "aria-label": "Jenis nilai" });

  function gambarJenis() {
    tombolJenis.replaceChildren(...[["latihan", "Latihan"], ["tryout", "Try Out"]].map(([k, t]) =>
      h("button", { type: "button", "aria-pressed": String(jenis === k), onclick: () => { jenis = k; gambarJenis(); gambar(); } }, t)));
  }
  const kartuStat = (label, nilai) => h("div", { class: "stat" }, h("span", { class: "stat-nilai" }, nilai), h("span", { class: "stat-label" }, label));

  function gambar() {
    const rows = semua.filter((x) => (!kelas || String(x.grade) === kelas) && (!mapel || x.subject_id === mapel));
    const lat = rows.filter((x) => x.kind === "latihan"), to = rows.filter((x) => x.kind === "tryout");
    const rata = (a) => (a.length ? angka(a.reduce((s, x) => s + Number(x.score || 0), 0) / a.length) : "—");
    const aktif = jenis === "latihan" ? lat : to;
    // kelompokkan per judul
    const kel = new Map();
    for (const x of aktif) {
      const k = jenis === "latihan" ? x.material_id : x.tryout_id;
      if (!kel.has(k)) kel.set(k, []);
      kel.get(k).push(x);
    }
    const kartuKelompok = [...kel.values()].map((arr) => {
      const terbaru = arr[0];
      const terbaik = Math.max(...arr.map((x) => Number(x.score || 0)));
      const panel = h("ul", { class: "riwayat" }, arr.map((x) => h("li", {},
        h("span", {}, waktuJakarta(x.submitted_at)),
        h("span", {}, h("strong", {}, angka(x.score)), ` (${x.correct_count}/${x.total_count})`, x.status === "expired" ? [" ", h("span", { class: "badge b-kuning" }, "Waktu habis")] : null),
        h("a", { class: "tombol tombol-garis kecil", href: "#/hasil/" + x.attempt_id }, "Lihat ulasan"))));
      panel.hidden = true;
      const tb = h("button", { type: "button", class: "nilai-kepala", "aria-expanded": "false" },
        h("strong", {}, terbaru.title), h("span", { class: "lembut" }, `${terbaru.subject_name || ""} · Kelas ${terbaru.grade}`),
        h("span", {}, "Terakhir ", h("span", { class: "nilai-angka" }, angka(terbaru.score))),
        h("span", {}, "Terbaik ", h("strong", {}, angka(terbaik))), h("span", { class: "lembut" }, `${arr.length} percobaan`));
      tb.addEventListener("click", () => { panel.hidden = !panel.hidden; tb.setAttribute("aria-expanded", String(!panel.hidden)); });
      return h("li", { class: "nilai-kartu" }, tb, panel);
    });

    let blokGrafik = null;
    if (jenis === "tryout" && to.length) {
      const kronologis = [...to].reverse();
      const titik = kronologis.map((x) => ({ skor: Number(x.score || 0), tanggal: waktuJakarta(x.submitted_at), judul: x.title }));
      const selisih = titik.length > 1 ? titik[titik.length - 1].skor - titik[0].skor : 0;
      blokGrafik = h("section", { "aria-labelledby": "jdl-grafik", style: "margin-bottom:1.25rem" },
        h("h2", { id: "jdl-grafik" }, "Perkembangan nilai try out"), grafik(titik),
        h("p", { class: "lembut", style: "margin-top:.5rem" },
          titik.length > 1 ? `Percobaan terakhir ${angka(titik[titik.length - 1].skor)}. Dibanding percobaan pertama, nilaimu ${selisih >= 0 ? "naik" : "turun"} ${angka(Math.abs(selisih))} poin.` : `Baru satu percobaan: ${angka(titik[0].skor)}.`));
    }
    ganti(isi,
      h("div", { class: "stat-grid" },
        kartuStat("Rata-rata latihan", rata(lat)), kartuStat("Rata-rata try out", rata(to)),
        kartuStat("Latihan selesai", angka(new Set(lat.map((x) => x.material_id)).size))),
      h("p", { class: "bantuan lembut" }, "Ringkasan mengikuti filter kelas dan mapel. Rata-rata dihitung dari semua percobaan."),
      blokGrafik,
      aktif.length ? h("ul", { class: "daftar-nilai" }, kartuKelompok)
        : elKosong(jenis === "latihan" ? "Belum ada nilai latihan." : "Belum ada nilai try out.", "Tidak ada data untuk filter ini.", "medali"));
  }

  ganti(wadah, h("div", { class: "halaman" }, kepala,
    h("div", { class: "grid-form dua", style: "gap:.75rem 1rem" },
      h("div", { class: "kolom" }, h("label", { for: "f-kelas" }, "Kelas"), kKelas),
      h("div", { class: "kolom" }, h("label", { for: "f-mapel" }, "Mata pelajaran"), kMapel)),
    tombolJenis, isi));
  gambarJenis(); gambar();
}