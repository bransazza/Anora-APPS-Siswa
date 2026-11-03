// ANORA siswa — supabase.js (klien Supabase dan penanganan galat)
// Jika mengubah bagian umum berkas ini, ubah juga di admin/js/supabase.js
// (nilai storageKey di folder admin dibuat berbeda).
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// True bila config.js belum diisi. Dipakai agar halaman tidak blank, melainkan menampilkan petunjuk.
// Yang ditolak hanya: kosong, masih berisi placeholder "ISI_DI_SINI", atau URL bukan https://...supabase.co
const url = String(SUPABASE_URL || "").trim();
const kunci = String(SUPABASE_ANON_KEY || "").trim();
export const belumDiatur =
  !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) ||
  url.includes("ISI_DI_SINI") ||
  kunci.length < 20 ||
  kunci.includes("ISI_DI_SINI");

export const supabase = createClient(
  belumDiatur ? "https://belum-diatur.invalid" : url.replace(/\/$/, ""),
  belumDiatur ? "belum-diatur" : kunci,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "anora-siswa-auth",
    },
  },
);

// Apakah galat ini berarti sesi login habis / tidak sah?
export function galatSesi(error, status) {
  if (!error) return false;
  return (
    status === 401 ||
    error.code === "PGRST301" ||
    error.code === "PGRST303" ||
    error.details === "BELUM_LOGIN" ||
    /jwt/i.test(error.message || "")
  );
}

function galatJaringan(e) {
  const pesan = String(e?.message || "");
  return (
    !navigator.onLine ||
    e?.name === "AuthRetryableFetchError" ||
    /failed to fetch|networkerror|network request failed|load failed/i.test(pesan)
  );
}

// Bungkus semua pemanggilan data: kembalikan data, atau lempar galat.
// Jika sesi habis / akun dinonaktifkan, kirim sinyal ke main.js.
export async function ambil(janji) {
  const { data, error, status } = await janji;
  if (error) {
    if (error.details === "AKUN_NONAKTIF") {
      window.dispatchEvent(new CustomEvent("anora:sesi-berakhir", { detail: { nonaktif: true } }));
    } else if (galatSesi(error, status)) {
      window.dispatchEvent(new CustomEvent("anora:sesi-berakhir", { detail: {} }));
    }
    throw error;
  }
  return data;
}

// Pesan galat ramah untuk ditampilkan ke pengguna.
export function pesanGalat(e) {
  if (galatJaringan(e)) return "Tidak ada koneksi. Periksa internet lalu coba lagi.";
  if (e?.details === "AKSES_BELUM_AKTIF") {
    return "Akses belum aktif. Pembayaran belum dikonfirmasi admin.";
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}