// Neighbourhood Tycoon — saves players in the browser.
//
// Each player's game is saved in cookies (split into chunks, because one cookie holds ~4 KB).
// A small "index" cookie lists the players so the game can show "Who's playing?".
// If cookies are blocked (for example when opening the file straight from your computer),
// it falls back to localStorage, and if that fails too the game still works but won't save.
// Nothing here is sent anywhere except the normal cookie header to this same website.

NT.store = (function () {
  "use strict";

  const IDX = "nt_idx";
  const LAST = "nt_last";
  const PFX = "nt_p_";
  const CHUNK = 3000;            // characters per cookie chunk
  const MAX_AGE = 60 * 60 * 24 * 400; // about 13 months (browsers cap cookie life near this)
  const MAX_PLAYERS = 8;

  // ---------- low-level storage (cookie first, then localStorage) ----------
  function cookieSet(name, value) {
    document.cookie = name + "=" + value + "; max-age=" + MAX_AGE + "; path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
  }
  function cookieGet(name) {
    const parts = document.cookie ? document.cookie.split("; ") : [];
    for (const p of parts) if (p.startsWith(name + "=")) return p.slice(name.length + 1);
    return null;
  }
  function cookieDel(name) {
    document.cookie = name + "=; max-age=0; path=/; SameSite=Lax";
  }

  let mode = "none";
  try { cookieSet("nt_test", "1"); if (cookieGet("nt_test") === "1") mode = "cookie"; cookieDel("nt_test"); } catch (e) { /* ignore */ }
  if (mode === "none") { try { localStorage.setItem("nt_test", "1"); localStorage.removeItem("nt_test"); mode = "local"; } catch (e) { /* ignore */ } }

  function put(k, v) { try { if (mode === "cookie") cookieSet(k, v); else if (mode === "local") localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function get(k) { try { if (mode === "cookie") return cookieGet(k); if (mode === "local") return localStorage.getItem(k); } catch (e) { /* ignore */ } return null; }
  function del(k) { try { if (mode === "cookie") cookieDel(k); else if (mode === "local") localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  // ---------- encoding: JSON <-> cookie-safe text ----------
  function enc(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function dec(str) {
    try {
      let b = str.replace(/-/g, "+").replace(/_/g, "/");
      while (b.length % 4) b += "=";
      return JSON.parse(decodeURIComponent(escape(atob(b))));
    } catch (e) { return null; }
  }

  // ---------- players ----------
  function list() {
    const raw = get(IDX);
    const arr = raw ? dec(raw) : null;
    return Array.isArray(arr) ? arr : [];
  }
  function writeIndex(arr) { put(IDX, enc(arr)); }

  function newId() { return Math.random().toString(36).slice(2, 8); }

  function save(state, summary) {
    const text = enc(state);
    const chunks = [];
    for (let i = 0; i < text.length; i += CHUNK) chunks.push(text.slice(i, i + CHUNK));
    const oldCount = Number(get(PFX + state.id + "_n")) || 0;
    chunks.forEach((c, i) => put(PFX + state.id + "_" + i, c));
    put(PFX + state.id + "_n", String(chunks.length));
    for (let i = chunks.length; i < oldCount; i++) del(PFX + state.id + "_" + i);

    const idx = list().filter((p) => p.i !== state.id);
    idx.push({ i: state.id, n: state.name, a: state.av, y: state.y, w: state.w, nw: Math.round(summary.nw), t: Date.now() });
    idx.sort((a, b) => a.t - b.t);
    writeIndex(idx);
    put(LAST, state.id);
  }

  function load(id) {
    const n = Number(get(PFX + id + "_n")) || 0;
    if (!n) return null;
    let text = "";
    for (let i = 0; i < n; i++) { const c = get(PFX + id + "_" + i); if (c == null) return null; text += c; }
    return dec(text);
  }

  function remove(id) {
    const n = Number(get(PFX + id + "_n")) || 0;
    for (let i = 0; i < n; i++) del(PFX + id + "_" + i);
    del(PFX + id + "_n");
    writeIndex(list().filter((p) => p.i !== id));
    if (get(LAST) === id) del(LAST);
  }

  return {
    mode: () => mode,
    list, save, load, remove, newId,
    last: () => get(LAST),
    setLast: (id) => put(LAST, id),
    canAddPlayer: () => list().length < MAX_PLAYERS,
    MAX_PLAYERS,
  };
})();
