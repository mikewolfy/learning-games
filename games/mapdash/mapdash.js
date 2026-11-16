// Map Dash — a geography game: find places on the map, name them, and learn their capitals.
(function () {
  "use strict";

  const MD = window.MD, W = MD.world, US = MD.us;
  const store = createProfileStore("md", { prefer: "local" });
  const app = document.getElementById("app");
  const NS = "http://www.w3.org/2000/svg";
  const CLOCK_SECONDS = 90;
  const SHAPE = Object.fromEntries(W.shapes.map((s) => [s.i, s]));
  const CONT_COLORS = { "North America": "#f4a261", "South America": "#e9c46a", Europe: "#a8c5e6", Asia: "#9bd1a0", Africa: "#e7a7a1", Oceania: "#c9a8e0", Antarctica: "#e8eef2" };

  let P = null;        // the current player's profile: { id, name, av, best, miss, played }
  let G = null;        // the game being played
  let sel = { mapId: "us", type: "find", len: "10", tricky: false };

  // ===================================================================
  // Helpers
  // ===================================================================
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const $ = (id) => document.getElementById(id);
  const fmtTime = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  function persist() { if (P) store.save(P, { g: P.played }); }

  // ===================================================================
  // The maps you can play
  // ===================================================================
  const REGIONS = ["Northeast", "Midwest", "South", "West"];
  const MAPS = [
    { id: "us", group: "United States", name: "All 50 States", emoji: "🇺🇸", kind: "us" },
    ...REGIONS.map((r) => ({ id: "us-" + r.toLowerCase(), group: "United States", name: r + " States", emoji: { Northeast: "🦞", Midwest: "🌽", South: "🍑", West: "🏔️" }[r], kind: "us", region: r })),
    { id: "continents", group: "The World", name: "The 7 Continents", emoji: "🌍", kind: "continents" },
    { id: "world", group: "The World", name: "Famous Countries", emoji: "🗺️", kind: "world", view: "world", set: "world" },
    { id: "europe", group: "Continents", name: "Europe", emoji: "🏰", kind: "world", view: "europe", set: "europe" },
    { id: "asia", group: "Continents", name: "Asia", emoji: "🏯", kind: "world", view: "asia", set: "asia" },
    { id: "africa", group: "Continents", name: "Africa", emoji: "🦁", kind: "world", view: "africa", set: "africa" },
    { id: "namerica", group: "Continents", name: "North America", emoji: "🦅", kind: "world", view: "namerica", set: "namerica" },
    { id: "samerica", group: "Continents", name: "South America", emoji: "🦙", kind: "world", view: "samerica", set: "samerica" },
    { id: "oceania", group: "Continents", name: "Oceania", emoji: "🦘", kind: "world", view: "oceania", set: "oceania" },
  ];
  const mapById = (id) => MAPS.find((m) => m.id === id);

  function places(map) {
    if (map.kind === "us") return US.states.filter((s) => !map.region || s.r === map.region).map((s) => ({ id: s.i, name: s.n, cap: s.c }));
    if (map.kind === "continents") return W.continents.map((c) => ({ id: c, name: c, cap: null }));
    return W.sets[map.set].map((id) => ({ id, name: SHAPE[id].n, cap: W.caps[id] || null }));
  }
  const canCapitals = (map) => map.kind !== "continents" && places(map).filter((p) => p.cap).length >= 4;
  const trickyOf = (map) => places(map).filter((p) => (P.miss[map.id + ":" + p.id] || 0) > 0);
  const bestKey = () => `${sel.mapId}|${sel.type}|${sel.len}`;

  // ===================================================================
  // Drawing a map
  // ===================================================================
  // Draws the map into an <svg>. Returns { els: id -> [paths], base: viewBox, sx }.
  function drawMap(svg, map, opt) {
    opt = opt || {};
    svg.innerHTML = "";
    const els = {};
    let base, sx = 1, parent = svg;
    const mk = (d, cls, tid, fill) => {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d); p.setAttribute("class", cls);
      if (tid != null) p.dataset.t = tid;
      if (fill) p.style.fill = fill;
      parent.appendChild(p);
      return p;
    };
    if (map.kind === "us") {
      const inSet = new Set(places(map).map((p) => p.id));
      US.states.forEach((s) => {
        const t = inSet.has(s.i);
        const p = mk(s.d, t ? "t" : "bg", t ? s.i : null);
        if (t) (els[s.i] = els[s.i] || []).push(p);
      });
      base = { x: US.vb[0], y: US.vb[1], w: US.vb[2], h: US.vb[3] };
    } else {
      const key = map.kind === "continents" ? "continents" : map.view;
      const v = key === "continents" ? [-180, 180, -88, 84, 1] : W.views[key];
      sx = v[4];
      const g = document.createElementNS(NS, "g");
      g.setAttribute("transform", `scale(${sx} 1)`);
      svg.appendChild(g); parent = g;
      const set = map.kind === "world" ? new Set(W.sets[map.set]) : null;
      W.shapes.forEach((s) => {
        if (map.kind === "continents") {
          const p = mk(s.d, "t", s.k, CONT_COLORS[s.k]);
          if (s.i === "RUS") p.dataset.alt = "Asia";
          (els[s.k] = els[s.k] || []).push(p);
        } else {
          const t = set.has(s.i);
          const p = mk(s.d, t ? "t" : "bg", t ? s.i : null);
          if (t) (els[s.i] = els[s.i] || []).push(p);
        }
      });
      base = { x: (v[0] + 180) * W.S * sx, y: (90 - v[3]) * W.S, w: (v[1] - v[0]) * W.S * sx, h: (v[3] - v[2]) * W.S };
    }
    return { els, base, sx, group: parent };
  }

  // A zoomable, draggable map used while playing
  function MapView(svg, map, onPick) {
    const drawn = drawMap(svg, map);
    const { els, sx } = drawn;
    let base = drawn.base;
    if (map.kind === "us" && map.region) {            // zoom a region map in on its own states
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      Object.values(els).flat().forEach((p) => { const b = p.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
      const padX = (x1 - x0) * 0.06, padY = (y1 - y0) * 0.06;
      base = { x: x0 - padX, y: y0 - padY, w: x1 - x0 + 2 * padX, h: y1 - y0 + 2 * padY };
    }
    let vb = { ...base };
    const apply = () => { svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); pins.forEach((c) => { const r = 9 / pxPerUnit(); c.setAttribute("ry", r); c.setAttribute("rx", r / sx); }); };
    const pxPerUnit = () => (svg.getBoundingClientRect().width || 600) / vb.w;
    svg.setAttribute("viewBox", `${base.x} ${base.y} ${base.w} ${base.h}`);

    // invisible, bigger click targets for places that are tiny on the map
    const pins = [];
    Object.entries(els).forEach(([id, list]) => {
      if (map.kind === "continents") return;
      let b = { x: 1e9, y: 1e9, x2: -1e9, y2: -1e9 };
      list.forEach((p) => { const q = p.getBBox(); b = { x: Math.min(b.x, q.x), y: Math.min(b.y, q.y), x2: Math.max(b.x2, q.x + q.width), y2: Math.max(b.y2, q.y + q.height) }; });
      const rel = ((b.x2 - b.x) * sx * (b.y2 - b.y)) / (base.w * base.h);
      if (rel < 0.0012) {
        const c = document.createElementNS(NS, "ellipse");
        c.setAttribute("class", "pin"); c.dataset.t = id;
        c.setAttribute("cx", (b.x + b.x2) / 2); c.setAttribute("cy", (b.y + b.y2) / 2);
        drawn.group.appendChild(c); pins.push(c);
      }
    });
    apply();

    // zoom and pan
    const zoomBy = (f) => {
      const nw = clamp(vb.w / f, base.w / 10, base.w), nh = nw * (base.h / base.w);
      vb = { x: vb.x + (vb.w - nw) / 2, y: vb.y + (vb.h - nh) / 2, w: nw, h: nh };
      clampPan(); apply();
    };
    const clampPan = () => { vb.x = clamp(vb.x, base.x - base.w * 0.05, base.x + base.w * 1.05 - vb.w); vb.y = clamp(vb.y, base.y - base.h * 0.05, base.y + base.h * 1.05 - vb.h); };
    let down = null, moved = false;
    svg.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y }; moved = false; });
    svg.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!moved && Math.hypot(dx, dy) < 7) return;
      moved = true;
      const k = vb.w / (svg.getBoundingClientRect().width || 600);
      vb.x = down.vx - dx * k; vb.y = down.vy - dy * k; clampPan(); apply();
    });
    const up = (e) => {
      const wasMoved = moved; const d = down; down = null;
      if (!d || wasMoved) return;
      const el = e.target.closest && e.target.closest("[data-t]");
      if (el && onPick) onPick(el.dataset.t, el.dataset.alt);
    };
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", () => { down = null; });

    return {
      els, zoomBy,
      reset() { vb = { ...base }; apply(); },
      // zoom in on a place (used when the place is small)
      focus(id) {
        const list = els[id]; if (!list) return;
        let b = { x: 1e9, y: 1e9, x2: -1e9, y2: -1e9 };
        list.forEach((p) => { const q = p.getBBox(); b = { x: Math.min(b.x, q.x), y: Math.min(b.y, q.y), x2: Math.max(b.x2, q.x + q.width), y2: Math.max(b.y2, q.y + q.height) }; });
        const cx = ((b.x + b.x2) / 2) * sx, cy = (b.y + b.y2) / 2;
        const size = Math.max((b.x2 - b.x) * sx, (b.y2 - b.y) * (base.w / base.h)) * 3.2;
        const nw = clamp(size, base.w / 8, base.w), nh = nw * (base.h / base.w);
        vb = { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh }; clampPan(); apply();
      },
      clear() { svg.querySelectorAll("path").forEach((p) => p.classList.remove("lit", "right", "wrong", "reveal", "hint")); },
      mark(id, cls) { (els[id] || []).forEach((p) => p.classList.add(cls)); },
    };
  }

  // ===================================================================
  // Player + start screen
  // ===================================================================
  function playerScreen() {
    G = null; P = null;
    PlayerPicker.show({
      app, store, title: "Map Dash", blurb: "Race to find places on the map and learn where everything is!",
      summary: (p) => (p.g ? `${p.g} round${p.g === 1 ? "" : "s"} played` : "New player"),
      onPlay: (id) => { P = store.load(id); if (!P) return playerScreen(); P.best = P.best || {}; P.miss = P.miss || {}; P.played = P.played || 0; store.setLast(id); startScreen(); },
      onCreate: (name, av) => { P = { id: store.newId(), name, av, best: {}, miss: {}, played: 0 }; persist(); startScreen(); },
    });
  }

  function startScreen() {
    if (G && G.timer) clearInterval(G.timer);
    G = null;
    const map = mapById(sel.mapId);
    if (sel.type === "capital" && !canCapitals(map)) sel.type = "find";
    const tricky = trickyOf(map);
    if (sel.tricky && !tricky.length) sel.tricky = false;
    const groups = [...new Set(MAPS.map((m) => m.group))];
    const best = P.best[bestKey()];
    app.innerHTML = `
      <div class="pbar"><div class="who">${esc(P.av)} ${esc(P.name)}</div><button class="btn small secondary" id="switchBtn">👥 Switch player</button></div>
      <div class="card">
        <h3 class="section-title">1. Pick a map</h3>
        ${groups.map((g) => `<div class="group-title">${g}</div><div class="maps">${MAPS.filter((m) => m.group === g).map((m) => {
          const n = trickyOf(m).length;
          return `<button class="mapbtn ${m.id === sel.mapId ? "on" : ""}" data-map="${m.id}"><span class="em">${m.emoji}</span><b>${esc(m.name)}</b><small>${places(m).length} places${n ? ` • <span class="tricky">⭐ ${n} tricky</span>` : ""}</small></button>`;
        }).join("")}</div>`).join("")}
        <h3 class="section-title" style="margin-top:16px">2. Pick a game</h3>
        <div class="pill-row">
          <button class="pill ${sel.type === "find" ? "on" : ""}" data-type="find">📍 Find it on the map</button>
          <button class="pill ${sel.type === "name" ? "on" : ""}" data-type="name">🔤 Name the place</button>
          <button class="pill ${sel.type === "capital" ? "on" : ""}" data-type="capital" ${canCapitals(map) ? "" : "disabled"}>🏛️ Capitals</button>
        </div>
        <h3 class="section-title">3. How long?</h3>
        <div class="pill-row">
          <button class="pill ${sel.len === "10" ? "on" : ""}" data-len="10">🎯 10 questions</button>
          <button class="pill ${sel.len === "clock" ? "on" : ""}" data-len="clock">⏱️ Beat the clock (${CLOCK_SECONDS}s)</button>
          ${tricky.length ? `<button class="pill ${sel.tricky ? "on" : ""}" id="trickyBtn">⭐ Only my ${tricky.length} tricky place${tricky.length === 1 ? "" : "s"}</button>` : ""}
        </div>
        <p class="bestline">${best ? `🏆 Your best here: ${best}` : "No score yet for this one. Set the first!"}</p>
        <button class="btn good block" id="startBtn" style="font-size:1.25rem;min-height:58px">Start! ▶</button>
      </div>`;
    app.querySelectorAll("[data-map]").forEach((b) => (b.onclick = () => { sel.mapId = b.dataset.map; sel.tricky = false; startScreen(); }));
    app.querySelectorAll("[data-type]").forEach((b) => (b.onclick = () => { sel.type = b.dataset.type; startScreen(); }));
    app.querySelectorAll("[data-len]").forEach((b) => (b.onclick = () => { sel.len = b.dataset.len; startScreen(); }));
    const tb = $("trickyBtn"); if (tb) tb.onclick = () => { sel.tricky = !sel.tricky; startScreen(); };
    $("startBtn").onclick = () => startGame();
    $("switchBtn").onclick = playerScreen;
  }

  // ===================================================================
  // Playing
  // ===================================================================
  function startGame() {
    const map = mapById(sel.mapId);
    let pool = places(map);
    if (sel.type === "capital") pool = pool.filter((p) => p.cap);
    if (sel.tricky) pool = pool.filter((p) => (P.miss[map.id + ":" + p.id] || 0) > 0);
    if (!pool.length) return startScreen();
    // places you've missed before come up first
    const hard = shuffle(pool.filter((p) => (P.miss[map.id + ":" + p.id] || 0) > 0)), rest = shuffle(pool.filter((p) => !(P.miss[map.id + ":" + p.id] > 0)));
    G = {
      map, type: sel.type, clock: sel.len === "clock", pool, queue: [...hard.slice(0, 3), ...rest, ...hard.slice(3)],
      total: sel.len === "clock" ? Infinity : Math.min(10, pool.length), asked: 0, score: 0, streak: 0, bestStreak: 0, right: 0,
      answered: 0, results: {}, missed: [], cur: null, over: false, timer: null, deadline: Date.now() + CLOCK_SECONDS * 1000, start: Date.now(), retried: {},
    };
    app.innerHTML = `
      <div class="hud">
        <div id="hudA"><small>${G.clock ? "⏱️ Time" : "Question"}</small><b id="hudAv">–</b></div>
        <div><small>⭐ Score</small><b id="hudScore">0</b></div>
        <div><small>🔥 Streak</small><b id="hudStreak">0</b></div>
      </div>
      <div class="prompt" id="prompt"></div>
      <div class="mapwrap ${G.type === "find" ? "" : "mc"}">
        <svg id="svg" role="img" aria-label="Map"></svg>
        <div class="toast" id="toast"></div>
      </div>
      <div class="choices" id="choices"></div>
      <div class="below">
        <button class="btn secondary small" id="hintBtn">💡 Hint</button>
        <button class="btn secondary small zbtn" id="zIn" aria-label="Zoom in" title="Zoom in">🔍＋</button>
        <button class="btn secondary small zbtn" id="zOut" aria-label="Zoom out" title="Zoom out">🔍－</button>
        <button class="btn secondary small zbtn" id="zReset" aria-label="Show the whole map" title="Show the whole map">⌂</button>
        <button class="btn secondary small" id="quitBtn">Stop</button>
      </div>
      <p class="muted center" style="font-size:0.82rem;margin:6px 0 0">Tip: drag the map to move it, and zoom in to find small places.</p>`;
    G.view = MapView($("svg"), map, onPick);
    $("zIn").onclick = () => G.view.zoomBy(1.6); $("zOut").onclick = () => G.view.zoomBy(1 / 1.6); $("zReset").onclick = () => G.view.reset();
    $("hintBtn").onclick = hint;
    $("quitBtn").onclick = () => { if (G.timer) clearInterval(G.timer); finish(); };
    if (G.clock) { G.timer = setInterval(tick, 250); tick(); }
    ask();
  }

  function tick() {
    if (!G || G.over) return;
    const left = Math.max(0, Math.ceil((G.deadline - Date.now()) / 1000));
    $("hudAv").textContent = fmtTime(left);
    $("hudA").classList.toggle("low", left <= 10);
    if (left <= 0) { clearInterval(G.timer); finish(); }
  }

  function updateHud() {
    if (!G.clock) $("hudAv").textContent = `${Math.min(G.asked, G.total)} of ${G.total}`;
    $("hudScore").textContent = G.score;
    $("hudStreak").textContent = G.streak;
  }

  function ask() {
    if (G.over) return;
    if (!G.clock && G.asked >= G.total) return finish();
    if (!G.queue.length) { if (!G.clock) return finish(); G.queue = shuffle(G.pool); }
    const place = G.queue.shift();
    G.asked++;
    G.cur = { place, t0: Date.now(), locked: false, hinted: false };
    G.view.clear(); G.view.reset();
    $("toast").className = "toast";
    const ch = $("choices"); ch.innerHTML = "";
    const prompt = $("prompt");
    if (G.type === "find") {
      prompt.innerHTML = `📍 Find: <b>${esc(place.name)}</b>`;
      $("hintBtn").style.display = "";
      G.cur.hintTimer = setTimeout(() => hint(true), 9000);
    } else {
      G.view.mark(place.id, "lit"); G.view.focus(place.id);
      $("hintBtn").style.display = "none";
      const key = G.type === "name" ? "name" : "cap";
      prompt.innerHTML = G.type === "name" ? "Which place is lit up?" : `What is the capital of <b>${esc(place.name)}</b>?`;
      const others = shuffle(G.pool.filter((p) => p.id !== place.id && p[key])).slice(0, 3);
      shuffle([place, ...others]).forEach((p) => {
        const b = document.createElement("button");
        b.className = "btn secondary"; b.textContent = p[key]; b.dataset.id = p.id;
        b.onclick = () => choose(p.id, b);
        ch.appendChild(b);
      });
    }
    updateHud();
  }

  function hint(auto) {
    if (!G || !G.cur || G.cur.locked || G.type !== "find") return;
    G.cur.hinted = true;
    G.view.mark(G.cur.place.id, "hint");
    G.view.focus(G.cur.place.id);
    toast(auto === true ? "Here's a hint: look for the blinking place!" : "Look for the blinking place!", "");
  }

  function toast(text, cls) { const t = $("toast"); t.textContent = text; t.className = "toast show " + (cls || ""); }

  function onPick(id, alt) {
    if (!G || G.over || !G.cur || G.cur.locked || G.type !== "find") return;
    const ok = id === G.cur.place.id || alt === G.cur.place.id;
    resolve(ok, id);
  }
  function choose(id, btn) {
    if (!G || G.over || !G.cur || G.cur.locked) return;
    const ok = id === G.cur.place.id;
    document.querySelectorAll("#choices .btn").forEach((b) => { b.disabled = true; if (b.dataset.id === G.cur.place.id) b.classList.add("correct"); });
    if (!ok) btn.classList.add("incorrect");
    resolve(ok, id);
  }

  function resolve(ok, pickedId) {
    const c = G.cur, p = c.place;
    c.locked = true; clearTimeout(c.hintTimer);
    const secs = (Date.now() - c.t0) / 1000;
    const key = G.map.id + ":" + p.id;
    G.view.clear();
    if (ok) {
      const timeBonus = c.hinted ? 0 : Math.round(clamp((10 - secs) / 7, 0, 1) * 50);
      G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
      const pts = (c.hinted ? 50 : 100) + timeBonus + Math.min(50, (G.streak - 1) * 10);
      G.score += pts; G.right++; G.results[p.id] = G.results[p.id] === "miss" ? "miss" : "ok";
      G.view.mark(p.id, "right");
      toast(`${p.name} ✓  +${pts}`, "good");
      const m = (P.miss[key] || 0) - 1; if (m > 0) P.miss[key] = m; else delete P.miss[key];
    } else {
      G.streak = 0; G.results[p.id] = "miss";
      if (!G.missed.includes(p)) G.missed.push(p);
      P.miss[key] = (P.miss[key] || 0) + 1;
      if (G.type === "find" && pickedId && G.view.els[pickedId]) G.view.mark(pickedId, "wrong");
      G.view.mark(p.id, "reveal"); G.view.focus(p.id);
      const picked = G.type === "find" ? (G.map.kind === "continents" ? pickedId : (places(G.map).find((x) => x.id === pickedId) || {}).name) : null;
      toast(G.type === "capital" ? `${p.name}: ${p.cap}` : G.type === "find" && picked ? `That was ${picked}. Here's ${p.name}!` : `It's ${p.name}!`, "bad");
      // ask a missed place again a few questions later
      if (!G.retried[p.id] && !G.clock) { G.retried[p.id] = true; G.queue.splice(Math.min(3, G.queue.length), 0, p); }
    }
    G.answered++;
    updateHud(); persist();
    setTimeout(() => { if (G && !G.over) ask(); }, ok ? 800 : 2300);
  }

  // ===================================================================
  // Results
  // ===================================================================
  function finish() {
    if (!G || G.over) return;
    G.over = true;
    if (G.timer) clearInterval(G.timer);
    if (G.cur) clearTimeout(G.cur.hintTimer);
    const g = G;
    const answered = Object.keys(g.results).length;
    const key = `${g.map.id}|${g.type}|${g.clock ? "clock" : "10"}`;
    const prev = P.best[key] || 0;
    const newBest = g.score > prev && g.score > 0;
    if (newBest) P.best[key] = g.score;
    if (answered) P.played = (P.played || 0) + 1;
    persist();
    const secs = Math.round((Date.now() - g.start) / 1000);
    const asked = g.answered || 1;
    app.innerHTML = `
      <div class="card center">
        <p class="muted" style="margin:0">${esc(g.map.name)} • ${g.type === "find" ? "Find it" : g.type === "name" ? "Name it" : "Capitals"}</p>
        <p class="big-score">${g.score}</p>
        <p class="muted" style="margin:0">points</p>
        ${newBest && prev ? '<div class="newrec">🏆 New best score!</div>' : ""}
        <div class="end-stats">
          <div><b>${g.right}</b>correct</div>
          <div><b>${Math.round((g.right / asked) * 100)}%</b>accuracy</div>
          <div><b>${g.bestStreak}</b>best streak</div>
          <div><b>${fmtTime(secs)}</b>time</div>
        </div>
        <div class="legend"><span><i style="background:#3bb273"></i>Got it</span><span><i style="background:#e2463b"></i>Missed</span><span><i style="background:#cfcfc4"></i>Not asked</span></div>
        <div class="mapwrap" style="margin-top:6px"><svg id="svg"></svg></div>
        ${g.missed.length ? `<h3 class="section-title" style="margin:14px 0 0">Places to practice</h3><div class="missed">${g.missed.map((p) => `<div><b>${esc(p.name)}</b>${p.cap ? `<small>Capital: ${esc(p.cap)}</small>` : ""}</div>`).join("")}</div>` : `<p class="result-text" style="margin:12px 0">🌟 You didn't miss a single one!</p>`}
        <div class="pp-row" style="justify-content:center;margin-top:8px"><button class="btn good" id="againBtn">Play again</button><button class="btn secondary" id="changeBtn">Change map</button></div>
      </div>`;
    const drawn = drawMap($("svg"), g.map);
    $("svg").setAttribute("viewBox", `${drawn.base.x} ${drawn.base.y} ${drawn.base.w} ${drawn.base.h}`);
    if (g.map.kind === "us" && g.map.region) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      Object.values(drawn.els).flat().forEach((p) => { const b = p.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
      $("svg").setAttribute("viewBox", `${x0 - 8} ${y0 - 8} ${x1 - x0 + 16} ${y1 - y0 + 16}`);
    }
    $("svg").style.cursor = "default";
    Object.entries(g.results).forEach(([id, r]) => (drawn.els[id] || []).forEach((p) => p.classList.add(r === "ok" ? "rr" : "rm")));
    window.scrollTo({ top: 0 });
    $("againBtn").onclick = () => startGame();
    $("changeBtn").onclick = startScreen;
  }

  window.MD_DEBUG = () => ({ G, P, MAPS, places, sel, mapById });
  playerScreen();
})();
