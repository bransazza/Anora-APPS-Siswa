// ANORA siswa — auth.js (masuk dan keluar siswa)
import { supabase, ambil, pesanGalat } from "./supabase.js";
import { AUTH_EMAIL_DOMAIN } from "./config.js";

export class GalatMasuk extends Error {}

export function bersihkanUsername(u) {
  return String(u || "").trim().toLowerCase();
}
export function usernameValid(u) {
  return /^[a-z0-9._-]{3,30}$/.test(u) && !u.startsWith(".") && !u.endsWith(".") && !u.includes("..");
}

// Baris siswa milik pengguna yang sedang login (null bila tidak ada sesi / bukan siswa).
export async function ambilSiswa() {
  const { data } = await supabase.auth.getSession();
  const uid = data?.session?.user?.id;
  if (!uid) return null;
  return await ambil(
    supabase.from("students")
      .select("id,username,child_name,grade,payment_status,is_active")
      .eq("id", uid)
      .maybeSingle(),
  );
}

// Keluar dari perangkat ini saja (tidak memutus perangkat lain).
export async function keluar() {
  try { await supabase.auth.signOut({ scope: "local" }); } catch { /* abaikan */ }
}

async function adalahAdmin() {
  try {
    const d = await ambil(supabase.from("admins").select("user_id").limit(1).maybeSingle());
    return !!d;
  } catch {
    return false;
  }
}

function pesanGalatMasuk(err) {
  const kode = err?.code || "";
  const msg = String(err?.message || "").toLowerCase();
  if (kode === "user_banned" || msg.includes("banned")) return "Akun dinonaktifkan, hubungi admin bimbel.";
  if (kode === "invalid_credentials" || msg.includes("invalid login")) return "Username atau password salah.";
  if (err?.status === 429 || kode === "over_request_rate_limit") return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (err?.name === "AuthRetryableFetchError" || err?.status === 0 || /fetch|network|load failed/.test(msg)) {
    return "Tidak ada koneksi, coba lagi.";
  }
  return "Gagal masuk. Coba lagi.";
}

// Username diubah otomatis menjadi username@AUTH_EMAIL_DOMAIN (tidak ada email yang dikirim).
export async function masuk(usernameMentah, password) {
  const username = bersihkanUsername(usernameMentah);
  if (!username || !password) throw new GalatMasuk("Isi username dan password dulu.");
  if (!usernameValid(username)) {
    throw new GalatMasuk("Username hanya berisi huruf kecil, angka, titik, garis bawah, atau minus (3–30 karakter).");
  }
  if (!navigator.onLine) throw new GalatMasuk("Tidak ada koneksi, coba lagi.");

  const { error } = await supabase.auth.signInWithPassword({
    email: `${username}@${AUTH_EMAIL_DOMAIN}`,
    password,
  });
  if (error) throw new GalatMasuk(pesanGalatMasuk(error));

  let siswa;
  try {
    siswa = await ambilSiswa();
  } catch (e) {
    await keluar();
    throw new GalatMasuk(pesanGalat(e));
  }
  if (!siswa) {
    const admin = await adalahAdmin();
    await keluar();
    throw new GalatMasuk(admin ? "Akun admin masuk lewat website admin." : "Username atau password salah.");
  }
  if (!siswa.is_active) {
    await keluar();
    throw new GalatMasuk("Akun dinonaktifkan, hubungi admin bimbel.");
  }
  return siswa;
}