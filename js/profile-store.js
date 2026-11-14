// Shared player-profile storage for the learning games.
//
//   const store = createProfileStore("bb");     // "bb" keeps this game's players separate from other games
//   store.list()            -> [{ i, n, a, t, ...summary }]   (the "Who's playing?" list)
//   store.save(state, summary)   state needs { id, name, av }; summary is extra fields for the list
//   store.load(id), store.remove(id), store.newId(), store.last(), store.setLast(id)
//
// Each player's game is saved in cookies, split into chunks (one cookie holds about 4 KB).
// A small "index" cookie lists the players. If cookies are blocked (for example when opening the
// file straight from a computer), it falls back to localStorage, and if that fails too the game
// still works but won't save. Nothing is sent anywhere except the normal cookie header to this site.

(function (root) {
  "use strict";

  function createProfileStore(game, options) {
    // prefer: "cookie" (default) or "local". Big saves are better in localStorage, because cookies are
    // sent to the server with every request.
    const opt = Object.assign({ maxPlayers: 8, chunk: 3000, days: 400, prefer: "cookie" }, options);
    const IDX = game + "_idx", LAST = game + "_last", PFX = game + "_p_";
    const MAX_AGE = 60 * 60 * 24 * opt.days;

    // ---------- low-level storage (cookie first, then localStorage) ----------
    const secure = () => (typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "");
    const cookieSet = (n, v) => { document.cookie = n + "=" + v + "; max-age=" + MAX_AGE + "; path=/; SameSite=Lax" + secure(); };
    const cookieGet = (n) => { const parts = document.cookie ? document.cookie.split("; ") : []; for (const p of parts) if (p.startsWith(n + "=")) return p.slice(n.length + 1); return null; };
    const cookieDel = (n) => { document.cookie = n + "=; max-age=0; path=/; SameSite=Lax"; };

    const tryCookie = () => { try { cookieSet(game + "_test", "1"); const ok = cookieGet(game + "_test") === "1"; cookieDel(game + "_test"); return ok; } catch (e) { return false; } };
    const tryLocal = () => { try { localStorage.setItem(game + "_test", "1"); localStorage.removeItem(game + "_test"); return true; } catch (e) { return false; } };
    let mode = "none";
    const order = opt.prefer === "local" ? [["local", tryLocal], ["cookie", tryCookie]] : [["cookie", tryCookie], ["local", tryLocal]];
    for (const [name, test] of order) { if (test()) { mode = name; break; } }

    const put = (k, v) => { try { if (mode === "cookie") cookieSet(k, v); else if (mode === "local") localStorage.setItem(k, v); } catch (e) { /* ignore */ } };
    const get = (k) => { try { if (mode === "cookie") return cookieGet(k); if (mode === "local") return localStorage.getItem(k); } catch (e) { /* ignore */ } return null; };
    const del = (k) => { try { if (mode === "cookie") cookieDel(k); else if (mode === "local") localStorage.removeItem(k); } catch (e) { /* ignore */ } };

    // ---------- encoding: JSON <-> cookie-safe text ----------
    const enc = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    function dec(str) {
      try { let b = str.replace(/-/g, "+").replace(/_/g, "/"); while (b.length % 4) b += "="; return JSON.parse(decodeURIComponent(escape(atob(b)))); }
      catch (e) { return null; }
    }

    const list = () => { const raw = get(IDX); const arr = raw ? dec(raw) : null; return Array.isArray(arr) ? arr : []; };
    const newId = () => Math.random().toString(36).slice(2, 8);

    function save(state, summary) {
      const text = enc(state);
      const chunks = [];
      for (let i = 0; i < text.length; i += opt.chunk) chunks.push(text.slice(i, i + opt.chunk));
      const oldCount = Number(get(PFX + state.id + "_n")) || 0;
      chunks.forEach((c, i) => put(PFX + state.id + "_" + i, c));
      put(PFX + state.id + "_n", String(chunks.length));
      for (let i = chunks.length; i < oldCount; i++) del(PFX + state.id + "_" + i);
      const idx = list().filter((p) => p.i !== state.id);
      idx.push(Object.assign({ i: state.id, n: state.name, a: state.av, t: Date.now() }, summary || {}));
      idx.sort((a, b) => a.t - b.t);
      put(IDX, enc(idx));
      put(LAST, state.id);
      return { chunks: chunks.length, bytes: text.length };
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
      put(IDX, enc(list().filter((p) => p.i !== id)));
      if (get(LAST) === id) del(LAST);
    }

    return {
      mode: () => mode, list, save, load, remove, newId,
      last: () => get(LAST), setLast: (id) => put(LAST, id),
      canAddPlayer: () => list().length < opt.maxPlayers, MAX_PLAYERS: opt.maxPlayers,
    };
  }

  root.createProfileStore = createProfileStore;
  if (typeof module !== "undefined" && module.exports) module.exports = { createProfileStore };
})(typeof window !== "undefined" ? window : globalThis);
