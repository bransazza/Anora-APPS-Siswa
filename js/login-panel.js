// ANORA siswa — login-panel.js (sidebar login dari kanan)
import { masuk, GalatMasuk } from "./auth.js";
import { perangkapFokus, ikon } from "./ui.js";

export function siapkanPanelLogin({ saatBerhasil }) {
  const panel = document.getElementById("panel-login");
  const scrim = document.getElementById("scrim-login");
  const form = document.getElementById("form-login");
  const inUser = document.getElementById("in-username");
  const inSandi = document.getElementById("in-sandi");
  const tombolKirim = document.getElementById("kirim-login");
  const tombolMata = document.getElementById("tombol-mata");
  const kotakGalat = document.getElementById("galat-login");
  let pembuka = null;
  let lepasFokus = null;
  let sibuk = false;

  const terbuka = () => panel.classList.contains("terbuka");

  function buka(dari) {
    pembuka = dari || document.activeElement;
    kotakGalat.hidden = true;
    panel.classList.add("terbuka");
    scrim.classList.add("tampil");
    document.body.classList.add("kunci-gulir");
    lepasFokus = perangkapFokus(panel);
    setTimeout(() => inUser.focus(), 60);
  }

  function tutup(kembaliFokus = true) {
    panel.classList.remove("terbuka");
    scrim.classList.remove("tampil");
    document.body.classList.remove("kunci-gulir");
    if (lepasFokus) lepasFokus();
    lepasFokus = null;
    if (kembaliFokus && pembuka && pembuka.focus) pembuka.focus();
  }

  function tampilGalat(teks) {
    kotakGalat.textContent = teks;
    kotakGalat.hidden = false;
  }

  function aturMata(tampil) {
    inSandi.type = tampil ? "text" : "password";
    tombolMata.setAttribute("aria-pressed", String(tampil));
    tombolMata.setAttribute("aria-label", tampil ? "Sembunyikan password" : "Tampilkan password");
    tombolMata.replaceChildren(ikon(tampil ? "mata-coret" : "mata"));
  }
  aturMata(false);

  document.querySelectorAll("[data-buka-login]").forEach((b) =>
    b.addEventListener("click", () => buka(b)));
  document.getElementById("tutup-login").addEventListener("click", () => tutup());
  scrim.addEventListener("click", () => tutup());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && terbuka()) tutup();
  });
  tombolMata.addEventListener("click", () => aturMata(inSandi.type === "password"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sibuk) return; // cegah klik ganda
    sibuk = true;
    tombolKirim.disabled = true;
    tombolKirim.classList.add("sibuk");
    tombolKirim.textContent = "Memproses…";
    kotakGalat.hidden = true;
    try {
      const siswa = await masuk(inUser.value, inSandi.value);
      form.reset();
      aturMata(false);
      tutup(false);
      saatBerhasil(siswa);
    } catch (err) {
      tampilGalat(err instanceof GalatMasuk ? err.message : "Gagal masuk. Coba lagi.");
      inSandi.focus();
      inSandi.select();
    } finally {
      sibuk = false;
      tombolKirim.disabled = false;
      tombolKirim.classList.remove("sibuk");
      tombolKirim.textContent = "Masuk";
    }
  });
}