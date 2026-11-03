// ANORA siswa — router.js (routing berbasis hash dengan parameter, contoh: #/materi/baca/:id)

export function parseHash() {
  const h = location.hash.replace(/^#/, "");
  const [p, q = ""] = h.split("?");
  return { path: p.startsWith("/") ? p : "", query: new URLSearchParams(q) };
}
export const rutaSaatIni = () => parseHash().path;

// Cocokkan pola seperti "/materi/baca/:id" dengan path. Hasil: objek parameter atau null.
export function cocokkan(pola, path) {
  const a = pola.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const p = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] === ":") {
      try { p[a[i].slice(1)] = decodeURIComponent(b[i]); } catch { return null; }
    } else if (a[i] !== b[i]) return null;
  }
  return p;
}

export function cariRute(rute, path) {
  for (const r of rute) {
    const params = cocokkan(r.pola, path);
    if (params) return { rute: r, params };
  }
  return null;
}

export function buatRouter({ rute, bawaan, saatBerubah }) {
  let jalan = false;
  function proses() {
    const { path, query } = parseHash();
    let c = cariRute(rute, path);
    if (!c) {
      history.replaceState(null, "", "#" + bawaan);
      c = cariRute(rute, bawaan);
    }
    saatBerubah(c.rute, c.params, query);
  }
  return {
    mulai() { if (jalan) return; jalan = true; window.addEventListener("hashchange", proses); proses(); },
    berhenti() { if (!jalan) return; jalan = false; window.removeEventListener("hashchange", proses); },
  };
}