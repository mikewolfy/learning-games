// Ecosystem Builder — build a food web and keep it balanced for 10 years.
(function () {
  "use strict";
  const { BIOMES, EVENTS } = ECO_DATA;
  const store = createProfileStore("eco", { prefer: "local" });
  const app = document.getElementById("app");
  const YEARS = 10;
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KIND = { P: "Producer", H: "Plant-eater", C: "Meat-eater" };
  let P = null, G = null;
  const persist = () => P && store.save(P, { n: Object.values(P.b).filter((x) => x.s > 0).length, st: Object.values(P.b).reduce((a, x) => a + x.s, 0) });
  const biomeUnlocked = (i) => i === 0 || (P.b[BIOMES[i - 1].id] || { s: 0 }).s > 0;
  const M = (biome) => { const m = {}; biome.species.forEach((s) => (m[s.id] = s)); return m; };

  function playerScreen() {
    P = null; G = null;
    PlayerPicker.show({
      app, store, title: "Ecosystem Builder", blurb: "Build a food web and keep nature in balance!",
      summary: (p) => (p.n ? `${p.n} habitat${p.n > 1 ? "s" : ""} • ${p.st}★` : "New player"),
      onPlay: (id) => { P = store.load(id); if (!P) return playerScreen(); P.b = P.b || {}; store.setLast(id); home(); },
      onCreate: (name, av) => { P = { id: store.newId(), name, av, b: {} }; persist(); home(); },
    });
  }

  function home() {
    G = null;
    app.innerHTML = `
      <div class="pbar"><div class="who">${esc(P.av)} ${esc(P.name)}</div><button class="btn small secondary" id="switchBtn">👥 Switch player</button></div>
      <div class="card"><h3 class="section-title">Pick a habitat</h3>
      <p class="muted" style="margin:0 0 6px">Choose which plants and animals live there. Then watch ${YEARS} years and help keep everything alive! Earn a star to open the next habitat.</p>
      <div class="biomes">${BIOMES.map((b, i) => {
        const r = P.b[b.id] || { s: 0, p: 0 }, ok = biomeUnlocked(i);
        return `<button class="biome" data-i="${i}" ${ok ? "" : "disabled"} style="--bc:${b.color}"><span class="em">${ok ? b.emoji : "🔒"}</span><b>${esc(b.name)}</b><small>${esc(b.blurb)}</small><span class="st">${"★".repeat(r.s)}${"☆".repeat(3 - r.s)}</span>${r.p ? `<span class="bestp">best ${r.p}</span>` : ""}</button>`;
      }).join("")}</div></div>
      <div class="card"><h3 class="section-title">How it works</h3><ul class="how">
        <li>🌿 <b>Producers</b> (plants) make food from sunlight.</li><li>🐇 <b>Plant-eaters</b> eat the producers.</li><li>🐺 <b>Meat-eaters</b> eat the plant-eaters.</li>
        <li>Too many of one kind and the rest starve. It's all about <b>balance</b>!</li></ul></div>`;
    app.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => pickScreen(BIOMES[Number(b.dataset.i)])));
    $("switchBtn").onclick = playerScreen;
  }

  // ---------------- diagram ----------------
  function webSVG(biome, ids, pops, opt) {
    opt = opt || {};
    const m = M(biome), rows = { C: [], H: [], P: [] };
    ids.forEach((id) => rows[m[id].kind].push(id));
    const W = 360, H = 292, ys = { C: 40, H: 134, P: 228 }, pos = {};
    ["C", "H", "P"].forEach((k) => rows[k].forEach((id, i) => (pos[id] = { x: ((i + 0.5) * W) / rows[k].length, y: ys[k] })));
    let s = `<svg class="web" viewBox="0 0 ${W} ${H}" role="img" aria-label="Food web"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#8a8f98"/></marker></defs>`;
    ids.forEach((id) => m[id].eats.forEach((p) => {
      if (!pos[p]) return; const a = pos[p], b = pos[id];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const dead = pops && (pops[p] < 1 || pops[id] < 1);
      s += `<line x1="${a.x + ux * 26}" y1="${a.y + uy * 26}" x2="${b.x - ux * 30}" y2="${b.y - uy * 30}" stroke="${dead ? "#d5d8dd" : "#8a8f98"}" stroke-width="2" marker-end="url(#ar)"/>`;
    }));
    ids.forEach((id) => {
      const p = pos[id], v = pops ? pops[id] : 50, dead = pops && v < 1, low = pops && !dead && v < 12;
      const sel = opt.sel && opt.sel === id;
      s += `<g class="node ${dead ? "dead" : ""} ${opt.pick ? "tap" : ""}" ${opt.pick ? `data-sp="${id}"` : ""}>
        <circle cx="${p.x}" cy="${p.y}" r="24" fill="#fff" stroke="${sel ? "#7048e8" : low ? "#e2463b" : dead ? "#bbb" : m[id].kind === "P" ? "#3bb273" : m[id].kind === "H" ? "#f2a516" : "#d9480f"}" stroke-width="${sel ? 5 : 3}"/>
        <text x="${p.x}" y="${p.y + 9}" font-size="26" text-anchor="middle">${dead ? "💀" : m[id].e}</text>
        <text x="${p.x}" y="${p.y + 41}" font-size="10.5" text-anchor="middle" font-weight="700" fill="#444">${esc(m[id].name)}</text>
        ${pops ? `<rect x="${p.x - 20}" y="${p.y + 44}" width="40" height="5" rx="2.5" fill="#e6e8ec"/><rect x="${p.x - 20}" y="${p.y + 44}" width="${(40 * Math.min(100, v)) / 100}" height="5" rx="2.5" fill="${low ? "#e2463b" : "#3bb273"}"/>` : ""}</g>`;
    });
    return s + `</svg>`;
  }

  // ---------------- choose species ----------------
  function pickScreen(biome, chosen) {
    chosen = chosen || [];
    const m = M(biome), left = biome.pick - chosen.length;
    const warn = [];
    chosen.forEach((id) => { const s = m[id]; if (s.kind !== "P" && !s.eats.some((p) => chosen.includes(p))) warn.push(`${s.e} ${s.name} have nothing to eat yet. They eat ${s.eats.map((x) => m[x].name).join(" or ")}.`); });
    if (chosen.length && !chosen.some((id) => m[id].kind === "P")) warn.push("🌿 Every food web needs plants to start with!");
    const hasP = chosen.some((id) => m[id].kind === "P"), hasH = chosen.some((id) => m[id].kind === "H"), hasC = chosen.some((id) => m[id].kind === "C");
    const ready = chosen.length === biome.pick;
    app.innerHTML = `
      <div class="qtop"><button class="btn small secondary" id="backBtn">← Habitats</button><b>${biome.emoji} ${esc(biome.name)}</b><span class="muted">${chosen.length}/${biome.pick} chosen</span></div>
      <div class="intro">🧭 Pick <b>${biome.pick}</b> living things. A good food web has plants, plant-eaters <i>and</i> meat-eaters, and every animal needs something to eat!</div>
      ${["P", "H", "C"].map((k) => `<div class="group-title">${KIND[k]}s</div><div class="spgrid">${biome.species.filter((s) => s.kind === k).map((s) => `<button class="sp ${chosen.includes(s.id) ? "on" : ""}" data-id="${s.id}" ${!chosen.includes(s.id) && left === 0 ? "disabled" : ""}><span class="e">${s.e}</span><b>${esc(s.name)}</b><small>${k === "P" ? "Makes food from sunlight" : "Eats: " + s.eats.map((x) => m[x].name).join(", ")}</small></button>`).join("")}</div>`).join("")}
      <div class="card" style="margin-top:12px"><div class="ptitle">Your food web <span class="muted">(arrows point to the eater)</span></div>
        ${chosen.length ? webSVG(biome, chosen, null) : `<p class="muted">Tap living things above to add them.</p>`}
        ${warn.map((w) => `<div class="warn">⚠️ ${esc(w)}</div>`).join("")}
        <div class="row"><button class="btn good" id="goBtn" ${ready && hasP && hasH && hasC ? "" : "disabled"}>🌱 Start the ecosystem!</button></div>
        ${ready && !(hasP && hasH && hasC) ? `<p class="muted center">Pick at least one plant, one plant-eater and one meat-eater.</p>` : ""}
      </div>`;
    $("backBtn").onclick = home;
    app.querySelectorAll("[data-id]").forEach((b) => (b.onclick = () => {
      const id = b.dataset.id, i = chosen.indexOf(id);
      pickScreen(biome, i >= 0 ? chosen.filter((x) => x !== id) : chosen.concat(id));
    }));
    $("goBtn").onclick = () => start(biome, chosen);
  }

  // ---------------- the years ----------------
  function start(biome, ids) {
    G = { biome, st: ECO.newState(biome, ids), ev: null, act: { type: "none" }, rec: null, series: [Object.assign({}, ECO.newState(biome, ids).pops)] };
    nextYear();
  }
  function nextYear() {
    G.ev = ECO.drawEvent(G.st, EVENTS, Math.random); G.act = { type: "none" }; G.rec = null; G.mode = "none";
    yearScreen();
  }
  const evInfo = (e) => EVENTS.find((x) => x.id === e.id);

  function yearScreen() {
    const { biome, st, ev } = G, m = M(biome), info = evInfo(ev), y = st.year + 1;
    const target = ev.target ? m[ev.target] : null;
    const modeIds = G.mode === "add" ? biome.species.filter((s) => st.ids.includes(s.id)).map((s) => s.id) : G.mode === "none" ? [] : st.ids.filter((id) => st.pops[id] >= 1);
    app.innerHTML = `
      <div class="hud"><div><small>Year</small><b>${y} of ${YEARS}</b></div><div><small>Alive</small><b>${st.ids.filter((i) => st.pops[i] >= 1).length}/${st.ids.length}</b></div><div><small>Habitat</small><b>${biome.emoji}</b></div></div>
      <div class="card">${webSVG(biome, st.ids, st.pops, { pick: G.mode !== "none", sel: G.act.id })}
        <div class="legend">Bars show how many. <span class="dot" style="background:#e2463b"></span>Red ring = endangered</div></div>
      <div class="event"><span class="ei">${info.icon}</span><div><b>${info.name}</b><br>${info.text}${target ? ` <b>${target.e} ${esc(target.name)}</b> are affected.` : ""}</div></div>
      <div class="card"><div class="ptitle">What will you do this year? <span class="muted">(pick one)</span></div>
        <div class="acts">
          ${[["none", "🤝", "Do nothing", "Let nature handle it"], ["add", "➕", "Add some", "Bring in more of a species (even one that's gone!)"], ["cull", "➖", "Thin out", "Remove some of one species"], ["protect", "🛡️", "Protect", "Shield one species this year"]].map(([k, e, n, d]) => `<button class="act ${G.mode === k ? "on" : ""}" data-m="${k}"><span>${e}</span><b>${n}</b><small>${d}</small></button>`).join("")}
        </div>
        ${G.mode !== "none" ? `<p class="muted center" style="margin:6px 0 0">${G.act.id ? `${m[G.act.id].e} <b>${esc(m[G.act.id].name)}</b> chosen.` : "Now tap a species in the picture above."}</p>` : ""}
        <div class="row"><button class="btn good" id="runBtn" ${G.mode !== "none" && !G.act.id ? "disabled" : ""}>▶ Run year ${y}</button></div></div>`;
    app.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => { G.mode = b.dataset.m; G.act = { type: b.dataset.m, id: null }; if (G.mode === "none") G.act = { type: "none" }; yearScreen(); }));
    app.querySelectorAll("[data-sp]").forEach((n) => (n.onclick = () => {
      if (G.mode === "none") return; const id = n.dataset.sp;
      if (G.mode !== "add" && st.pops[id] < 1) return;
      G.act = { type: G.mode, id }; yearScreen();
    }));
    $("runBtn").onclick = runYear;
  }

  function runYear() {
    const before = Object.assign({}, G.st.pops);
    G.rec = ECO.step(G.st, G.ev, G.act, Math.random);
    G.series.push(Object.assign({}, G.st.pops));
    reportScreen(before);
  }

  function reportScreen(before) {
    const { biome, st, rec } = G, m = M(biome), last = st.year >= YEARS;
    const lines = st.ids.filter((id) => rec.reasons[id] && (before[id] >= 1 || rec.after[id] >= 1)).map((id) => {
      const a = Math.round(before[id]), b = Math.round(rec.after[id]), up = b > a;
      return `<div class="rep ${b < 1 ? "gone" : up ? "up" : "down"}"><span>${b < 1 ? "💀" : m[id].e}</span><div><b>${esc(m[id].name)}</b> ${b < 1 ? "<b>died out!</b>" : up ? "▲" : "▼"} <small>${a} → ${b}</small><br>${esc(rec.reasons[id].join(" "))}</div></div>`;
    });
    const act = rec.act && rec.act.id ? `${{ add: "➕ You added", cull: "➖ You thinned out", protect: "🛡️ You protected" }[rec.act.type]} ${m[rec.act.id].e} ${esc(m[rec.act.id].name)}.` : "";
    app.innerHTML = `
      <div class="hud"><div><small>Year</small><b>${st.year} of ${YEARS}</b></div><div><small>Alive</small><b>${st.ids.filter((i) => st.pops[i] >= 1).length}/${st.ids.length}</b></div><div><small>Habitat</small><b>${biome.emoji}</b></div></div>
      <div class="card"><div class="ptitle">End of year ${st.year}</div>${webSVG(biome, st.ids, st.pops)}
        ${act ? `<p class="muted center" style="margin:4px 0">${act}</p>` : ""}
        <div class="reps">${lines.length ? lines.join("") : `<p class="muted center">A quiet year. Everything stayed about the same.</p>`}</div>
        <div class="row"><button class="btn acc" id="contBtn">${last ? "See how you did 🏁" : "Next year ▶"}</button></div></div>`;
    $("contBtn").onclick = last ? endScreen : nextYear;
  }

  function chartSVG() {
    const { biome, st } = G, m = M(biome), W = 340, H = 150, n = G.series.length - 1;
    const colors = ["#2b8a3e", "#74b816", "#f59f00", "#e8590c", "#c92a2a", "#7048e8", "#1971c2", "#0c8599", "#862e9c"];
    let s = `<svg class="chart" viewBox="0 0 ${W + 10} ${H + 24}"><rect x="30" y="4" width="${W - 30}" height="${H}" fill="#f8f9fb" stroke="#e1e4ea"/>`;
    for (let g = 0; g <= 100; g += 50) s += `<text x="26" y="${H + 4 - (g / 100) * (H - 4)}" font-size="9" text-anchor="end" fill="#888">${g}</text>`;
    for (let i = 0; i <= n; i += 2) s += `<text x="${30 + (i / n) * (W - 30)}" y="${H + 18}" font-size="9" text-anchor="middle" fill="#888">${i}</text>`;
    st.ids.forEach((id, k) => {
      const pts = G.series.map((p, i) => `${30 + (i / n) * (W - 30)},${H + 4 - (Math.min(100, p[id]) / 100) * (H - 4)}`).join(" ");
      s += `<polyline points="${pts}" fill="none" stroke="${colors[k % colors.length]}" stroke-width="2.5" stroke-linejoin="round"/>`;
    });
    return s + `</svg><div class="legend2">${st.ids.map((id, k) => `<span><i style="background:${colors[k % colors.length]}"></i>${m[id].e} ${esc(m[id].name)}</span>`).join("")}</div>`;
  }

  const LESSONS = {
    balance: "A food web is a balance. When one kind of living thing changes, everything connected to it changes too.",
    top: "If there are too few meat-eaters, plant-eaters can multiply and eat all the plants. If there are too many meat-eaters, they run out of prey.",
    plants: "Producers are the base of every food web. Without plants, nothing else can live.",
    diverse: "Animals that can eat more than one kind of food (like wolves and foxes here) survive better when one food gets scarce.",
  };
  function endScreen() {
    const { biome, st } = G, m = M(biome), sc = ECO.score(st, YEARS);
    const prev = P.b[biome.id] || { s: 0, p: 0 }, newBest = sc.points > prev.p;
    P.b[biome.id] = { s: Math.max(prev.s, sc.stars), p: Math.max(prev.p, sc.points) }; persist();
    const gone = st.ids.filter((id) => st.pops[id] < 1);
    const tips = [];
    if (gone.length) { const g = gone[0]; tips.push(`${m[g].e} ${esc(m[g].name)} died out. ${m[g].kind === "P" ? "Too many plant-eaters ate them." : m[g].kind === "H" ? "Maybe meat-eaters ate too many, or their plants ran low." : "Their prey may have run low."}`); }
    if (!sc.complete) tips.push(LESSONS.plants);
    tips.push(gone.length ? LESSONS.top : LESSONS.diverse);
    tips.push(LESSONS.balance);
    const nextB = BIOMES[BIOMES.indexOf(biome) + 1];
    app.innerHTML = `
      <div class="card center"><p class="muted" style="margin:0">${biome.emoji} ${esc(biome.name)} • ${YEARS} years</p>
        <div class="stars">${"★".repeat(sc.stars)}${"☆".repeat(3 - sc.stars)}</div>
        <p class="big-num">${sc.points}</p><p class="muted" style="margin:0">ecosystem points${newBest && prev.p ? " 🏆 a new best!" : ""}</p>
        <div class="end-stats"><div><b>${sc.alive}/${st.ids.length}</b>species alive</div><div><b>${sc.thriving}</b>thriving</div><div><b>${sc.complete ? "Yes" : "No"}</b>full food web</div></div>
        ${sc.stars === 3 ? `<p class="result-text">🌟 A perfect balance! Everything survived and thrived.</p>` : sc.stars === 0 ? `<p class="muted">Not enough survived. Try again with a different mix!</p>` : `<p class="muted">Get every species alive and thriving for 3 stars.</p>`}
        <div class="ptitle" style="text-align:left">Populations over the years</div>${chartSVG()}
        <div class="lessons">${tips.map((t) => `<div class="explain">${t}</div>`).join("")}</div>
        <div class="row"><button class="btn good" id="againBtn">Try again</button>${nextB && biomeUnlocked(BIOMES.indexOf(nextB)) ? `<button class="btn acc" id="nextBtn">${nextB.emoji} ${esc(nextB.name)} ▶</button>` : ""}<button class="btn secondary" id="homeBtn">All habitats</button></div></div>`;
    window.scrollTo({ top: 0 });
    $("againBtn").onclick = () => pickScreen(biome);
    if ($("nextBtn")) $("nextBtn").onclick = () => pickScreen(nextB);
    $("homeBtn").onclick = home;
  }

  window.ECO_DEBUG = () => ({ G, P, BIOMES });
  playerScreen();
})();
