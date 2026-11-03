// ANORA siswa — segera.js (halaman "Segera hadir" untuk Materi, Try Out, Nilai Saya)
import { h, ikon, ganti } from "../ui.js";
import { elKunci } from "./kunci.js";

export function buatHalaman({ judul, ikonNama, isi }) {
  return {
    async tampil(wadah, ctx) {
      const kepala = h("header", { class: "halaman-kepala" }, h("h1", {}, judul));
      if (ctx.siswa.payment_status !== "Lunas") {
        ganti(wadah, h("div", { class: "halaman" }, kepala, elKunci()));
        return;
      }
      ganti(wadah, h("div", { class: "halaman" }, kepala,
        h("section", { class: "kartu segera" },
          ikon(ikonNama, 40),
          h("h2", {}, "Segera hadir"),
          h("p", { class: "lembut" }, isi))));
    },
  };
}