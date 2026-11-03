// ANORA siswa — latihan.js (latihan soal dan try out berwaktu)
import { supabase, ambil, pesanGalat } from "../supabase.js";
import { h, ikon, ganti, elMemuat, elGalat, elKosong } from "../ui.js";
import { renderTeksRumus } from "../rumus.js";
import { konfirmasi } from "../dialog.js";
import { elKunci } from "./kunci.js";
import { BUCKET_SOAL, UUID, titipan, petaUrl, elGambar, kumpulPathSoal } from "../soal-tampil.js";

const kunciHalaman = (wadah) => ganti(wadah, h("div", { class: "halaman" }, h("header", { class: "halaman-kepala" }, h("h1", {}, "Latihan Soal")), elKunci()));
const pergi = (hash) => location.replace(location.pathname + location.search + hash);
const fmtWaktu = (d) => {
  const j = Math.floor(d / 3600), m = Math.floor((d % 3600) / 60), s = d % 60;
  return (j ? j + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(s).padStart(2, "0");
};
// Bunyi lembut (WebAudio) untuk peringatan waktu
function bip(kali) {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < kali; i++) {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.45;
      o.type = "sine"; o.frequency.value = 660;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.15, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.4);
    }
    setTimeout(() => c.close(), 1500 + kali * 450);
  } catch { /* abaikan */ }
}

// Rute #/materi/latihan/:id -> buat / lanjutkan percobaan lalu pindah ke #/latihan/:attemptId
export async function mulai(wadah, ctx) {
  if (ctx.siswa.payment_status !== "Lunas") { kunciHalaman(wadah); return; }
  const id = ctx.params.id;
  if (!UUID.test(id)) { location.hash = "#/materi"; return; }
  ganti(wadah, elMemuat("Menyiapkan latihan…"));
  try {
    const aid = await ambil(supabase.rpc("start_attempt", { p_material_id: id }));
    if (!ctx.aktif()) return;
    pergi("#/latihan/" + aid);
  } catch (e) {
    if (!ctx.aktif()) return;
    const kembali = h("a", { class: "tombol tombol-utama", href: "#/materi" }, "Kembali ke Materi");
    if (e && e.details === "BELUM_ADA_SOAL") ganti(wadah, elKosong("Latihan belum tersedia", "Bab ini belum punya soal latihan.", "buku", kembali));
    else if (e && e.details === "TIDAK_DITEMUKAN") ganti(wadah, elKosong("Bab tidak ditemukan", "Bab ini belum terbit atau sudah dihapus.", "buku", kembali));
    else ganti(wadah, elGalat(pesanGalat(e), () => mulai(wadah, ctx)));
  }
}

export async function tampil(wadah, ctx) {
  if (ctx.siswa.payment_status !== "Lunas") { kunciHalaman(wadah); return; }
  const aid = ctx.params.aid;
  if (!UUID.test(aid)) { location.hash = "#/materi"; return; }
  ganti(wadah, elMemuat());
  let data, t0 = performance.now(), t1 = t0;
  try { data = await ambil(supabase.rpc("get_attempt", { p_attempt_id: aid })); t1 = performance.now(); }
  catch (e) {
    if (!ctx.aktif()) return;
    ganti(wadah, e && e.details === "TIDAK_DITEMUKAN"
      ? elKosong("Percobaan tidak ditemukan", "Percobaan ini tidak ada.", "buku", h("a", { class: "tombol tombol-utama", href: "#/materi" }, "Kembali ke Materi"))
      : elGalat(pesanGalat(e), () => tampil(wadah, ctx)));
    return;
  }
  if (!ctx.aktif()) return;
  if (data.result) { pergi("#/hasil/" + aid); return; } // sudah selesai (termasuk waktu habis saat halaman ditutup)
  const soal = data.questions || [];
  const meta = data.attempt;
  const tryout = meta.kind === "tryout";
  const adaTimer = !!data.deadline_at;
  if (!soal.length) { ganti(wadah, elKosong("Soal belum tersedia", "Belum ada soal.", "buku")); return; }

  const peta = await petaUrl(BUCKET_SOAL, kumpulPathSoal(soal)).catch(() => new Map());
  let info = null;
  if (meta.material_id) {
    try { info = await ambil(supabase.from("materials").select("grade,subject_id").eq("id", meta.material_id).maybeSingle()); } catch { /* opsional */ }
  }
  if (!ctx.aktif()) return;
  const kembali = tryout ? "#/try-out" : info ? `#/materi/kelas/${info.grade}/${info.subject_id}` : "#/materi";

  // ---------- jam: dihitung dari deadline_at dan server_now, bukan jam perangkat ----------
  // performance.now() adalah jam monotonik: tidak terpengaruh bila jam perangkat diubah.
  let deadlineMs = adaTimer ? Date.parse(data.deadline_at) : 0, patokServer = 0, patokPerf = 0;
  const sinkron = (iso, a, b) => { if (iso) { patokServer = Date.parse(iso) + (b - a) / 2; patokPerf = b; } };
  if (adaTimer) sinkron(data.server_now, t0, t1);
  const sisaMs = () => deadlineMs - (patokServer + (performance.now() - patokPerf));
  async function sinkronUlang() {
    const a = performance.now();
    try { const iso = await ambil(supabase.rpc("server_time")); sinkron(iso, a, performance.now()); } catch { /* coba lagi nanti */ }
  }

  // ---------- state ----------
  const jawab = new Map();
  Object.entries(data.answers || {}).forEach(([q, a]) => { if (Array.isArray(a) && a.length) jawab.set(q, a[0]); });
  let idx = Math.max(0, soal.findIndex((q) => !jawab.has(q.id)));
  const tertunda = new Map();
  let rantai = Promise.resolve(), selesai = false, waktuHabis = false, tertinggal = false, idTick = 0, idSinkron = 0;
  let suaraMati = false;
  try { suaraMati = localStorage.getItem("anora-suara") === "0"; } catch { /* abaikan */ }

  // ---------- elemen ----------
  const status = h("span", { class: "kuis-status", role: "status" });
  const judulNo = h("h2", { class: "kuis-no", tabindex: "-1" });
  const badan = h("div");
  const bSebelum = h("button", { type: "button", class: "tombol tombol-garis", onclick: () => ke(idx - 1, true) }, "‹ Sebelumnya");
  const bBerikut = h("button", { type: "button", class: "tombol tombol-utama", onclick: () => ke(idx + 1, true) }, "Berikutnya ›");
  const bKumpulUtama = h("button", { type: "button", class: "tombol tombol-emas", onclick: () => kumpulkan() }, "Kumpulkan");
  const kisi = h("div", { class: "kisi", role: "group", "aria-label": "Nomor soal" });
  const infoKisi = h("p", { role: "status", class: "rapat" });
  const bBelum = h("button", { type: "button", class: "tombol tombol-garis", onclick: () => keBelum() }, "Ke soal pertama yang belum dijawab");
  const bKumpulPanel = h("button", { type: "button", class: "tombol tombol-emas", onclick: () => kumpulkan() }, "Kumpulkan jawaban");
  const bTutupPanel = h("button", { type: "button", class: "tombol tombol-garis kuis-tutup-panel", onclick: () => tutupPanel() }, "Tutup daftar soal");
  const panel = h("aside", { class: "kuis-panel", "aria-label": "Daftar soal" },
    h("h2", {}, "Daftar soal"), kisi,
    h("ul", { class: "legenda" },
      h("li", {}, h("span", { style: "border-radius:50%;border-style:dashed" }), "Belum dijawab"),
      h("li", {}, h("span", { style: "border-radius:6px;background:var(--navy);border-color:var(--navy)" }), "Sudah dijawab (bertanda ✓)"),
      h("li", {}, h("span", { style: "outline:3px solid var(--emas);outline-offset:1px;border-radius:50%" }), "Soal yang sedang dibuka")),
    infoKisi, h("div", { class: "panel-aksi" }, bBelum, bKumpulPanel, bTutupPanel));
  const scrim = h("div", { class: "scrim", "aria-hidden": "true", onclick: () => tutupPanel() });
  const bPanel = h("button", { type: "button", class: "tombol tombol-garis kecil kuis-tombol-panel", onclick: () => bukaPanel() }, "Daftar soal");
  const kuisBadan = h("div", { class: "kuis-badan" },
    h("section", { class: "kuis-utama", "aria-label": "Soal" }, judulNo, badan, h("div", { class: "kuis-nav" }, bSebelum, bBerikut, bKumpulUtama)), panel);

  // timer (hanya try out)
  const teksWaktu = h("span", { class: "timer-waktu", role: "timer", "aria-label": "Sisa waktu" });
  const teksLabel = h("span", {}, "Sisa waktu");
  const bSuara = h("button", { type: "button", class: "tombol tombol-garis kecil", onclick: () => {
    suaraMati = !suaraMati;
    try { localStorage.setItem("anora-suara", suaraMati ? "0" : "1"); } catch { /* abaikan */ }
    labelSuara();
  } });
  const labelSuara = () => { bSuara.textContent = suaraMati ? "Suara peringatan: mati" : "Suara peringatan: hidup"; bSuara.setAttribute("aria-pressed", String(!suaraMati)); };
  labelSuara();
  const barTimer = adaTimer ? h("div", { class: "timer-bar" }, h("span", { class: "timer-label" }, ikon("jam", 22), teksLabel), teksWaktu, bSuara) : null;
  const peringatan = h("p", { class: "banner banner-galat kuis-peringatan", role: "alert" });
  peringatan.hidden = true;
  const umumkan = (teks) => { peringatan.textContent = teks; peringatan.hidden = false; };

  function bukaPanel() { panel.classList.add("terbuka"); scrim.classList.add("tampil"); bTutupPanel.focus(); }
  function tutupPanel() { panel.classList.remove("terbuka"); scrim.classList.remove("tampil"); }

  // ---------- timer ----------
  const peringat = { lima: false, satu: false };
  let nadaSekarang = "", detikTerakhir = -1;
  function setNada(n) {
    if (n === nadaSekarang) return;
    nadaSekarang = n;
    barTimer.className = "timer-bar" + (n ? " " + n : "");
    teksLabel.textContent = n === "kritis" ? "Sisa waktu — segera kumpulkan!" : n === "hampir" ? "Sisa waktu — 5 menit terakhir" : "Sisa waktu";
  }
  function tick() {
    const sisa = sisaMs();
    const detik = Math.max(0, Math.ceil(sisa / 1000));
    if (detik !== detikTerakhir) { detikTerakhir = detik; teksWaktu.textContent = fmtWaktu(detik); }
    if (detik <= 60) {
      setNada("kritis");
      if (!peringat.satu) { peringat.satu = true; peringat.lima = true; umumkan("Sisa waktu 1 menit! Periksa jawabanmu lalu kumpulkan."); if (!suaraMati) bip(2); }
    } else if (detik <= 300) {
      setNada("hampir");
      if (!peringat.lima) { peringat.lima = true; umumkan("Sisa waktu 5 menit."); if (!suaraMati) bip(1); }
    } else setNada("");
    if (sisa <= 0) habis();
  }
  async function habis() {
    if (waktuHabis || selesai) return;
    waktuHabis = true; selesai = true;
    clearInterval(idTick);
    kuisBadan.inert = true;
    umumkan("Waktu habis. Jawabanmu dikumpulkan otomatis.");
    try { await rantai; } catch { /* abaikan */ }
    for (;;) {
      if (tertinggal) return;
      try {
        const hasil = await ambil(supabase.rpc("submit_attempt", { p_attempt_id: aid }));
        titipan.aid = aid; titipan.data = hasil;
        if (!tertinggal) pergi("#/hasil/" + aid);
        return;
      } catch { await new Promise((r) => setTimeout(r, 3000)); }
    }
  }

  // ---------- status simpan ----------
  function setStatus(k, teks) {
    status.className = "kuis-status" + (k === "gagal" ? " gagal" : "");
    if (k === "tersimpan") status.replaceChildren(ikon("centang", 16), "Tersimpan");
    else if (k === "menyimpan") status.replaceChildren("Menyimpan…");
    else status.replaceChildren(ikon("peringatan", 16), teks || "Belum tersimpan",
      h("button", { type: "button", class: "tombol tombol-garis kecil", onclick: () => { setStatus("menyimpan"); rantai = rantai.then(kirim); } }, "Coba lagi"));
  }
  async function kirim() {
    for (const [qid, huruf] of [...tertunda]) {
      try {
        const a = performance.now();
        const r = await ambil(supabase.rpc("save_answer", { p_attempt_id: aid, p_question_id: qid, p_answer: [huruf] }));
        if (adaTimer && r && r.server_now) sinkron(r.server_now, a, performance.now());
        if (tertunda.get(qid) === huruf) tertunda.delete(qid);
      } catch (e) {
        if (e && e.details === "SUDAH_SELESAI") { pergi("#/hasil/" + aid); return false; }
        if (e && e.details === "WAKTU_HABIS") { habis(); return false; }
        setStatus("gagal", e && e.details === "AKSES_BELUM_AKTIF" ? "Akses belum aktif" : !navigator.onLine ? "Tidak ada koneksi, belum tersimpan" : "Belum tersimpan");
        return false;
      }
    }
    if (!tertunda.size) setStatus("tersimpan");
    return !tertunda.size;
  }
  function pilih(qid, huruf) {
    if (waktuHabis) return;
    jawab.set(qid, huruf);
    tertunda.set(qid, huruf);
    setStatus("menyimpan");
    rantai = rantai.then(kirim);
    gambarKisi();
  }

  // ---------- tampilan ----------
  function gambarKisi() {
    kisi.replaceChildren(...soal.map((q, i) => {
      const d = jawab.has(q.id), a = i === idx;
      return h("button", { type: "button", class: `no ${d ? "no-isi" : "no-kosong"}${a ? " no-aktif" : ""}`,
        "aria-label": `Soal ${i + 1}, ${d ? "sudah dijawab" : "belum dijawab"}${a ? ", sedang dibuka" : ""}`,
        "aria-current": a ? "step" : null, onclick: () => { ke(i, true); tutupPanel(); } },
        h("span", {}, i + 1), d ? h("span", { class: "no-tanda", "aria-hidden": "true" }, "✓") : null);
    }));
    const belum = soal.filter((q) => !jawab.has(q.id)).length;
    infoKisi.textContent = `${soal.length - belum} dari ${soal.length} soal sudah dijawab.`;
  }
  function tampilkanSoal() {
    const q = soal[idx];
    judulNo.textContent = `Soal ${idx + 1} dari ${soal.length}`;
    const opsi = h("div", { class: "opsi-daftar", role: "radiogroup", "aria-labelledby": "teks-soal" },
      (q.options || []).map((o) => {
        const id = `o-${idx}-${o.id}`;
        const input = h("input", { type: "radio", name: "jawab-" + q.id, id, value: o.id, class: "opsi-input" });
        input.checked = jawab.get(q.id) === o.id;
        input.addEventListener("change", () => pilih(q.id, o.id));
        return h("label", { class: "opsi", for: id }, input,
          h("span", { class: "opsi-kartu" }, h("span", { class: "opsi-huruf" }, o.id),
            h("span", { class: "opsi-isi" }, o.text ? h("span", { class: "teks-soal" }, renderTeksRumus(o.text)) : null,
              elGambar(peta, BUCKET_SOAL, o.image_path, "Gambar pilihan " + o.id))));
      }));
    ganti(badan,
      q.stimulus_text || q.stimulus_image_path ? h("div", { class: "stimulus" }, q.stimulus_text ? h("div", { class: "teks-soal" }, renderTeksRumus(q.stimulus_text)) : null, elGambar(peta, BUCKET_SOAL, q.stimulus_image_path, "Gambar bacaan")) : null,
      h("div", { id: "teks-soal", class: "teks-soal soal-teks" }, renderTeksRumus(q.question_text || "")),
      elGambar(peta, BUCKET_SOAL, q.question_image_path, "Gambar soal"), opsi);
    const akhir = idx === soal.length - 1;
    bSebelum.disabled = idx === 0;
    bBerikut.hidden = akhir;
    bKumpulUtama.hidden = !akhir;
  }
  function ke(i, fokus) {
    idx = Math.max(0, Math.min(soal.length - 1, i));
    tampilkanSoal(); gambarKisi();
    if (fokus) { judulNo.focus({ preventScroll: true }); judulNo.scrollIntoView({ block: "start", behavior: "smooth" }); }
  }
  function keBelum() {
    const i = soal.findIndex((q) => !jawab.has(q.id));
    if (i < 0) { infoKisi.textContent = "Semua soal sudah dijawab. Periksa lagi atau kumpulkan jawaban."; return; }
    ke(i, true); tutupPanel();
  }

  async function kumpulkan() {
    if (selesai) return;
    const belum = soal.filter((q) => !jawab.has(q.id)).length;
    const sisaMenit = adaTimer ? Math.max(0, Math.ceil(sisaMs() / 60000)) : 0;
    const ya = await konfirmasi({
      judul: "Kumpulkan jawaban?",
      isi: (belum ? `Masih ada ${belum} soal yang belum dijawab. Soal yang belum dijawab dihitung salah. ` : "Semua soal sudah dijawab. ")
        + (adaTimer ? `Sisa waktumu sekitar ${sisaMenit} menit. ` : "") + "Setelah dikumpulkan, jawaban tidak bisa diubah.",
      ya: "Ya, kumpulkan", tidak: "Kembali mengerjakan" });
    if (!ya || selesai) return;
    selesai = true;
    [bKumpulUtama, bKumpulPanel].forEach((b) => { b.disabled = true; });
    rantai = rantai.then(kirim);
    const aman = await rantai;
    if (waktuHabis) return; // sudah ditangani pengumpulan otomatis
    if (!aman) {
      selesai = false;
      [bKumpulUtama, bKumpulPanel].forEach((b) => { b.disabled = false; });
      infoKisi.textContent = "Jawaban belum semua tersimpan. Periksa koneksi lalu coba lagi.";
      return;
    }
    try {
      const hasil = await ambil(supabase.rpc("submit_attempt", { p_attempt_id: aid }));
      titipan.aid = aid; titipan.data = hasil;
      pergi("#/hasil/" + aid);
    } catch (e) {
      selesai = false;
      [bKumpulUtama, bKumpulPanel].forEach((b) => { b.disabled = false; });
      infoKisi.textContent = pesanGalat(e);
      setStatus("gagal", "Gagal mengumpulkan");
    }
  }

  const saatKunci = (e) => { if (e.key === "Escape") tutupPanel(); };
  const saatOnline = () => { if (tertunda.size) { setStatus("menyimpan"); rantai = rantai.then(kirim); } if (adaTimer) sinkronUlang(); };
  const saatTutupHalaman = (e) => { if (adaTimer || tertunda.size) { e.preventDefault(); e.returnValue = ""; } };
  const saatTampak = () => { if (!document.hidden && adaTimer) { sinkronUlang().then(tick); } };
  document.addEventListener("keydown", saatKunci);
  window.addEventListener("online", saatOnline);
  window.addEventListener("beforeunload", saatTutupHalaman);
  document.addEventListener("visibilitychange", saatTampak);

  ganti(wadah, h("div", { class: "halaman" },
    h("a", { href: kembali }, tryout ? "← Daftar Try Out" : "← Daftar bab"),
    h("div", { class: "kuis-atas" }, h("h1", {}, (tryout ? "Try Out: " : "Latihan: ") + (meta.title || "")), h("div", { class: "aksi-baris" }, status, bPanel)),
    barTimer, peringatan, kuisBadan, scrim));
  setStatus("tersimpan");
  tampilkanSoal(); gambarKisi();

  if (adaTimer) {
    const awal = Math.max(0, Math.ceil(sisaMs() / 1000));
    peringat.lima = awal <= 300; peringat.satu = awal <= 60; // yang sudah terlewat tidak dibunyikan ulang
    tick();
    idTick = setInterval(tick, 250);
    idSinkron = setInterval(sinkronUlang, 30000);
  }

  return () => {
    tertinggal = true;
    clearInterval(idTick); clearInterval(idSinkron);
    document.removeEventListener("keydown", saatKunci);
    window.removeEventListener("online", saatOnline);
    window.removeEventListener("beforeunload", saatTutupHalaman);
    document.removeEventListener("visibilitychange", saatTampak);
  };
}