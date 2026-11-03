// ANORA siswa — main.js (pengatur utama: sesi, routing, drawer menu)
import { supabase, belumDiatur, galatSesi, pesanGalat } from "./supabase.js";
import { hidrasiIkon, perangkapFokus, elMemuat, elGalat, badgeBayar, ganti } from "./ui.js";
import { ambilSiswa, keluar } from "./auth.js";
import { buatRouter, rutaSaatIni, cariRute } from "./router.js";
import { siapkanPanelLogin } from "./login-panel.js";
import * as beranda from "./pages/beranda.js";
import * as absensi from "./pages/absensi.js";
import * as parentGuide from "./pages/parent-guide.js";
import * as materi from "./pages/materi.js";
import * as baca from "./pages/baca.js";
import * as media from "./pages/media.js";
import * as tryout from "./pages/tryout.js";
import * as nilai from "./pages/nilai.js";
import * as latihan from "./pages/latihan.js";
import * as hasil from "./pages/hasil.js";

const $ = (s) => document.querySelector(s);
const landing = $("#landing");
const app = $("#app");
const muatAwal = $("#muat-awal");
const konten = $("#konten");
const sidebar = $("#sidebar");
const scrimMenu = $("#scrim-menu");
const tombolMenu = $("#tombol-menu");

const JUDUL_LANDING = "ANORA — Bimbel SD Matematika dan Bahasa Indonesia";

// menu = rute di sidebar yang ditandai aktif
const RUTE = [
  { pola: "/beranda", judul: "Beranda", menu: "/beranda", tampil: beranda.tampil },
  { pola: "/absensi", judul: "Absensi", menu: "/absensi", tampil: absensi.tampil },
  { pola: "/parent-guide", judul: "Parent Guide", menu: "/parent-guide", tampil: parentGuide.tampil },
  { pola: "/materi", judul: "Materi", menu: "/materi", tampil: materi.tampil },
  { pola: "/materi/kelas/:kelas", judul: "Materi", menu: "/materi", tampil: materi.tampil },
  { pola: "/materi/kelas/:kelas/:mapel", judul: "Materi", menu: "/materi", tampil: materi.tampil },
  { pola: "/materi/baca/:id", judul: "Baca materi", menu: "/materi", tampil: baca.tampil },
  { pola: "/materi/media/:id", judul: "Media belajar", menu: "/materi", tampil: media.tampil },
  { pola: "/materi/latihan/:id", judul: "Latihan soal", menu: "/materi", tampil: latihan.mulai },
  { pola: "/latihan/:aid", judul: "Latihan soal", menu: "/materi", tampil: latihan.tampil },
  { pola: "/hasil/:aid", judul: "Hasil latihan", menu: "/materi", tampil: hasil.tampil },
  { pola: "/try-out", judul: "Try Out", menu: "/try-out", tampil: tryout.daftar },
  { pola: "/try-out/:id", judul: "Aturan Try Out", menu: "/try-out", tampil: tryout.aturan },
  { pola: "/try-out/:id/mulai", judul: "Try Out", menu: "/try-out", tampil: tryout.mulai },
  { pola: "/nilai", judul: "Nilai Saya", menu: "/nilai", tampil: nilai.tampil },
];

let modeApp = false;
let keluarSendiri = false;
let nomorTampil = 0;
let siswa = null;
let bersihkan = null; // fungsi pembersih halaman aktif (mis. menutup pembaca PDF)
const router = buatRouter({ rute: RUTE, bawaan: "/beranda", saatBerubah: tampilRute });

function jalankanBersih() {
  if (bersihkan) { try { bersihkan(); } catch { /* abaikan */ } bersihkan = null; }
}

// ---------- Layar landing / aplikasi ----------
function tampilkanPesan(pesan, jenis) {
  const b = $("#pesan-landing");
  if (!pesan) { b.hidden = true; b.textContent = ""; return; }
  b.className = "banner banner-" + (jenis === "galat" ? "galat" : jenis === "ok" ? "ok" : "info");
  b.hidden = false;
  b.textContent = pesan;
}

function tampilkanLanding(pesan, jenis = "info") {
  modeApp = false;
  nomorTampil++;
  siswa = null;
  jalankanBersih();
  document.body.classList.remove("mode-fokus");
  router.berhenti();
  tutupDrawer(false);
  app.hidden = true;
  muatAwal.hidden = true;
  landing.hidden = false;
  history.replaceState(null, "", location.pathname + location.search);
  document.title = JUDUL_LANDING;
  tampilkanPesan(pesan, jenis);
  window.scrollTo(0, 0);
}

function masukAplikasi(s) {
  siswa = s;
  modeApp = true;
  tampilkanPesan(null);
  landing.hidden = true;
  muatAwal.hidden = true;
  app.hidden = false;
  perbaruiHeader(s);
  if (!cariRute(RUTE, rutaSaatIni())) history.replaceState(null, "", "#/beranda");
  router.mulai();
}

async function keluarPaksa(pesan, jenis = "info") {
  if (!modeApp) return;
  modeApp = false; // cegah pemanggilan ganda
  keluarSendiri = true;
  await keluar();
  keluarSendiri = false;
  tampilkanLanding(pesan, jenis);
}

function perbaruiHeader(s) {
  $("#nama-anak").textContent = s.child_name;
  $("#lencana-bayar").replaceChildren(badgeBayar(s.payment_status));
  const terkunci = s.payment_status !== "Lunas";
  document.querySelectorAll("[data-butuh-lunas] .kunci-kecil").forEach((el) => { el.hidden = !terkunci; });
}

function tandaiMenu(path) {
  document.querySelectorAll(".menu-tautan[data-rute], .bn-tautan[data-rute]").forEach((a) => {
    if (a.dataset.rute === path) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

// ---------- Pindah halaman ----------
async function tampilRute(r, params, query) {
  const nomor = ++nomorTampil;
  const aktif = () => modeApp && nomor === nomorTampil;
  jalankanBersih();
  document.body.classList.toggle("mode-fokus", r.pola === "/latihan/:aid"); // sembunyikan bilah bawah saat mengerjakan soal
  document.title = `${r.judul} — ANORA`;
  tandaiMenu(r.menu);
  tutupDrawer(false);
  ganti(konten, elMemuat());
  konten.focus({ preventScroll: true });
  window.scrollTo(0, 0);

  // Segarkan data siswa setiap pindah halaman (status bayar bisa berubah oleh admin)
  try {
    const s = await ambilSiswa();
    if (!aktif()) return;
    if (!s) { keluarPaksa("Sesi berakhir, silakan masuk lagi.", "galat"); return; }
    if (!s.is_active) { keluarPaksa("Akun dinonaktifkan, hubungi admin bimbel.", "galat"); return; }
    siswa = s;
    perbaruiHeader(s);
  } catch (e) {
    if (!aktif()) return;
    ganti(konten, elGalat(pesanGalat(e), () => tampilRute(r, params, query)));
    return;
  }
  const hasil = await r.tampil(konten, { siswa, aktif, params, query });
  if (typeof hasil === "function") {
    if (aktif()) bersihkan = hasil;
    else hasil();
  }
}

// ---------- Drawer menu (HP) ----------
let lepasFokusMenu = null;
function bukaDrawer() {
  sidebar.classList.add("terbuka");
  scrimMenu.classList.add("tampil");
  tombolMenu.setAttribute("aria-expanded", "true");
  tombolMenu.setAttribute("aria-label", "Tutup menu");
  document.body.classList.add("kunci-gulir");
  lepasFokusMenu = perangkapFokus(sidebar);
  const pertama = sidebar.querySelector("a");
  if (pertama) pertama.focus();
}
function tutupDrawer(kembaliFokus) {
  if (!sidebar.classList.contains("terbuka")) return;
  sidebar.classList.remove("terbuka");
  scrimMenu.classList.remove("tampil");
  tombolMenu.setAttribute("aria-expanded", "false");
  tombolMenu.setAttribute("aria-label", "Buka menu");
  document.body.classList.remove("kunci-gulir");
  if (lepasFokusMenu) lepasFokusMenu();
  lepasFokusMenu = null;
  if (kembaliFokus) tombolMenu.focus();
}

function pasangEvent() {
  tombolMenu.addEventListener("click", () =>
    sidebar.classList.contains("terbuka") ? tutupDrawer(true) : bukaDrawer());
  scrimMenu.addEventListener("click", () => tutupDrawer(true));
  $("#bn-menu").addEventListener("click", () => (sidebar.classList.contains("terbuka") ? tutupDrawer(true) : bukaDrawer()));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") tutupDrawer(true);
  });
  window.matchMedia("(min-width: 900px)").addEventListener("change", () => tutupDrawer(false));
  sidebar.addEventListener("click", (e) => {
    if (e.target.closest("a.menu-tautan")) tutupDrawer(false);
  });
  $("#tombol-keluar").addEventListener("click", () => keluarPaksa("Anda sudah keluar. Sampai jumpa!", "ok"));

  document.querySelector("[data-lewati]").addEventListener("click", (e) => {
    e.preventDefault();
    const utama = [...document.querySelectorAll("main")].find((m) => !m.closest("[hidden]"));
    if (utama) utama.focus();
  });

  window.addEventListener("anora:sesi-berakhir", (e) => {
    if (e.detail && e.detail.nonaktif) keluarPaksa("Akun dinonaktifkan, hubungi admin bimbel.", "galat");
    else keluarPaksa("Sesi berakhir, silakan masuk lagi.", "galat");
  });

  // Catatan: jangan memanggil fungsi Supabase di dalam callback ini (bisa macet).
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT" && modeApp && !keluarSendiri) {
      tampilkanLanding("Sesi berakhir, silakan masuk lagi.", "galat");
    }
  });
}

// ---------- Mulai ----------
async function mulai() {
  hidrasiIkon(document);
  pasangEvent();
  siapkanPanelLogin({ saatBerhasil: masukAplikasi });

  if (belumDiatur) {
    tampilkanLanding("Website belum disambungkan ke Supabase. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di berkas js/config.js, lalu unggah ulang.", "galat");
    return;
  }

  try {
    const { data } = await supabase.auth.getSession();
    if (data && data.session) {
      const s = await ambilSiswa();
      if (s && s.is_active) { masukAplikasi(s); return; }
      await keluar();
      tampilkanLanding(s && !s.is_active ? "Akun dinonaktifkan, hubungi admin bimbel." : null, "galat");
      return;
    }
  } catch (e) {
    if (galatSesi(e)) {
      await keluar();
      tampilkanLanding("Sesi berakhir, silakan masuk lagi.", "galat");
    } else {
      tampilkanLanding(pesanGalat(e), "galat");
    }
    return;
  }
  tampilkanLanding();
}

mulai();