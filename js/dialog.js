// ANORA siswa — dialog.js (dialog konfirmasi yang aksesibel)
import { h, perangkapFokus } from "./ui.js";

export function konfirmasi({ judul, isi, ya = "Ya", tidak = "Batal" }) {
  return new Promise((selesai) => {
    const pembuka = document.activeElement;
    let hasil = false;
    const tutup = () => {
      lepas();
      document.removeEventListener("keydown", tekan);
      latar.remove();
      document.body.classList.remove("kunci-gulir");
      if (pembuka && pembuka.focus) pembuka.focus();
      selesai(hasil);
    };
    const bYa = h("button", { type: "button", class: "tombol tombol-utama", onclick: () => { hasil = true; tutup(); } }, ya);
    const bTidak = h("button", { type: "button", class: "tombol tombol-garis", onclick: tutup }, tidak);
    const latar = h("div", { class: "dlg-latar" },
      h("div", { class: "dlg", role: "dialog", "aria-modal": "true", "aria-labelledby": "dlg-judul" },
        h("h2", { id: "dlg-judul" }, judul), typeof isi === "string" ? h("p", {}, isi) : isi,
        h("div", { class: "dlg-aksi" }, bTidak, bYa)));
    const tekan = (e) => { if (e.key === "Escape") { e.preventDefault(); tutup(); } };
    document.body.append(latar);
    document.body.classList.add("kunci-gulir");
    const lepas = perangkapFokus(latar);
    document.addEventListener("keydown", tekan);
    bYa.focus();
  });
}