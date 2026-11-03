// ANORA siswa — soal-tampil.js (bantu menampilkan gambar soal / pembahasan)
import { supabase } from "./supabase.js";
import { h } from "./ui.js";

export const BUCKET_SOAL = "soal-gambar";
export const BUCKET_BAHAS = "pembahasan-gambar";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Hasil submit_attempt dititipkan agar layar hasil langsung tampil tanpa menunggu lagi
export const titipan = { aid: null, data: null };

export async function petaUrl(bucket, paths) {
  const unik = [...new Set((paths || []).filter(Boolean))];
  const peta = new Map();
  if (!unik.length) return peta;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(unik, 3600);
  (data || []).forEach((d) => { if (d.signedUrl) peta.set(d.path, d.signedUrl); });
  return peta;
}

// <img> dengan tautan bertanda tangan; bila tautan kedaluwarsa dibuat ulang satu kali
export function elGambar(peta, bucket, path, alt) {
  if (!path) return null;
  const img = h("img", { class: "gambar-soal", alt, loading: "lazy", draggable: "false" });
  const u = peta.get(path);
  if (u) img.src = u;
  let coba = 0;
  img.addEventListener("error", async () => {
    if (coba++ > 0) return;
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (data && data.signedUrl) { peta.set(path, data.signedUrl); img.src = data.signedUrl; }
  });
  if (!u) img.dispatchEvent(new Event("error"));
  return img;
}

export function kumpulPathSoal(daftar) {
  const p = [];
  for (const q of daftar) {
    p.push(q.question_image_path, q.stimulus_image_path);
    for (const o of q.options || []) p.push(o.image_path);
  }
  return p.filter(Boolean);
}