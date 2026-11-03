// ANORA siswa — ui.js (fungsi bantu tampilan)
// Jika mengubah berkas ini, ubah juga di admin/js/ui.js
// KEAMANAN: semua teks dari database dimasukkan lewat createTextNode / textContent.
// innerHTML hanya dipakai untuk ikon SVG bawaan di bawah (teks tetap, bukan data pengguna).

const IKON = {
  centang: '<polyline points="20 6 9 17 4 12"/>',
  silang: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  mata: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  "mata-coret": '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  rumah: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  kalender: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  buku: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  jam: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  medali: '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
  keluar: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  kunci: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  tanya: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  tambah: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  surat: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  panduan: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  peringatan: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  bintang: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
};

function svg(nama) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">${IKON[nama] || ""}</svg>`;
}

export function ikon(nama, ukuran) {
  const s = document.createElement("span");
  s.className = "ikon";
  s.setAttribute("aria-hidden", "true");
  s.innerHTML = svg(nama);
  if (ukuran) {
    s.style.width = ukuran + "px";
    s.style.height = ukuran + "px";
  }
  return s;
}

// Isi elemen statis yang memakai atribut data-ikon="nama"
export function hidrasiIkon(akar = document) {
  akar.querySelectorAll("[data-ikon]").forEach((el) => {
    if (!el.firstChild) {
      el.innerHTML = svg(el.dataset.ikon);
      el.setAttribute("aria-hidden", "true");
    }
  });
}

// ---------- Pembuat elemen yang aman (tanpa innerHTML) ----------
export function h(tag, attrs = {}, ...anak) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  for (const a of anak.flat(Infinity)) {
    if (a === null || a === undefined || a === false) continue;
    el.append(a instanceof Node ? a : document.createTextNode(String(a)));
  }
  return el;
}

export function ganti(wadah, ...isi) {
  // nilai kosong (null/undefined/false) dibuang, jika tidak browser menampilkannya sebagai teks "null"
  wadah.replaceChildren(...isi.flat(Infinity).filter((x) => x !== null && x !== undefined && x !== false));
}

// ---------- Tanggal dan angka (Indonesia, Asia/Jakarta) ----------
const ZONA = "Asia/Jakarta";
const fPanjang = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fAngka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const fWaktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: ZONA,
});

// Tanggal tanpa jam ("2026-11-03") diperlakukan apa adanya, tanpa geser zona waktu.
function dariIso(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export const tanggalPanjang = (iso) => (iso ? fPanjang.format(dariIso(iso)) : "");
export const waktuJakarta = (ts) => (ts ? fWaktu.format(new Date(ts)).replace(".", ":") + " WIB" : "");
export const angka = (n) => fAngka.format(Number(n) || 0);

export function hariIniJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function selisihHari(iso) {
  return Math.round((dariIso(hariIniJakarta()) - dariIso(iso)) / 86400000);
}
export function salamWaktu() {
  const jam = Number(new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (jam >= 4 && jam < 11) return "Selamat pagi";
  if (jam >= 11 && jam < 15) return "Selamat siang";
  if (jam >= 15 && jam < 18) return "Selamat sore";
  return "Selamat malam";
}

// ---------- Lencana ----------
const BAYAR = {
  Lunas: ["b-hijau", "centang"],
  Pending: ["b-kuning", "jam"],
  "Belum Bayar": ["b-merah", "peringatan"],
};
export function badgeBayar(status) {
  const [kelas, nama] = BAYAR[status] || ["b-biru", "info"];
  return h("span", { class: `badge ${kelas}` }, ikon(nama, 16), status);
}

const ABSEN = {
  Hadir: ["b-hijau", "centang"],
  Izin: ["b-biru", "surat"],
  Sakit: ["b-kuning", "tambah"],
  "Tanpa Keterangan": ["b-merah", "tanya"],
};
export function lencanaAbsen(status) {
  const [kelas, nama] = ABSEN[status] || ["b-biru", "info"];
  return h("span", { class: `badge ${kelas}` }, ikon(nama, 16), status);
}

// ---------- Keadaan memuat / kosong / galat ----------
export function elMemuat(teks = "Memuat…") {
  return h("div", { class: "keadaan memuat", role: "status", "aria-live": "polite" },
    h("div", { class: "skeleton lebar" }),
    h("div", { class: "skeleton sedang" }),
    h("div", { class: "skeleton kotak" }),
    h("span", { class: "sr-only" }, teks));
}
export function elKosong(judul, teks, namaIkon = "bintang") {
  return h("div", { class: "keadaan kosong" }, ikon(namaIkon, 40), h("h2", {}, judul), h("p", { class: "lembut" }, teks));
}
export function elGalat(pesan, ulangi) {
  return h("div", { class: "keadaan galat-kotak", role: "alert" },
    ikon("peringatan", 40),
    h("p", {}, pesan),
    ulangi ? h("button", { type: "button", class: "tombol tombol-garis", onclick: ulangi }, "Coba lagi") : null);
}

// ---------- Teks panjang (parent guide) ----------
// Baris kosong = paragraf baru. Baris diawali "- " = daftar bertanda. Tidak ada HTML mentah.
export function renderTeks(teks) {
  const frag = document.createDocumentFragment();
  const baris = String(teks ?? "").replace(/\r\n?/g, "\n").split("\n");
  let para = [];
  let daftar = null;
  const tutupPara = () => {
    if (!para.length) return;
    const p = document.createElement("p");
    para.forEach((b, i) => {
      if (i) p.append(document.createElement("br"));
      p.append(document.createTextNode(b));
    });
    frag.append(p);
    para = [];
  };
  const tutupDaftar = () => {
    if (daftar) frag.append(daftar);
    daftar = null;
  };
  for (const mentah of baris) {
    if (mentah.trim() === "") { tutupPara(); tutupDaftar(); continue; }
    const m = mentah.match(/^\s*-\s+(.*)$/);
    if (m) {
      tutupPara();
      if (!daftar) daftar = document.createElement("ul");
      const li = document.createElement("li");
      li.textContent = m[1];
      daftar.append(li);
    } else {
      tutupDaftar();
      para.push(mentah.trim());
    }
  }
  tutupPara();
  tutupDaftar();
  return frag;
}

// ---------- Aksesibilitas ----------
// Menjaga Tab tetap di dalam panel. Mengembalikan fungsi untuk melepas.
export function perangkapFokus(wadah) {
  const sel = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  function tekan(e) {
    if (e.key !== "Tab") return;
    const f = [...wadah.querySelectorAll(sel)].filter((x) => x.getClientRects().length > 0);
    if (!f.length) return;
    const awal = f[0];
    const akhir = f[f.length - 1];
    if (e.shiftKey && document.activeElement === awal) { e.preventDefault(); akhir.focus(); }
    else if (!e.shiftKey && document.activeElement === akhir) { e.preventDefault(); awal.focus(); }
  }
  document.addEventListener("keydown", tekan);
  return () => document.removeEventListener("keydown", tekan);
}