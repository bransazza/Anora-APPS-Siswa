// ANORA siswa — kunci.js (layar kunci; dipakai ulang di Materi, Latihan, Try Out, Nilai)
import { h, ikon } from "../ui.js";

export function elKunci() {
  return h("section", { class: "kartu kunci", "aria-labelledby": "jdl-kunci" },
    h("div", { class: "kunci-ikon" }, ikon("kunci", 36)),
    h("h2", { id: "jdl-kunci" }, "Halaman ini terkunci"),
    h("p", {}, "Akses belum aktif. Pembayaran belum dikonfirmasi admin. Silakan hubungi admin bimbel."));
}