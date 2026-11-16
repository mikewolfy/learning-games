// Ecosystem Builder engine (pure logic): one year of a food web.
(function (root) {
  "use strict";
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const START = { P: 60, H: 35, C: 20 };
  const CAP = { P: 100, H: 100, C: 70 };
  const P_REGROW = 0.9, P_K = 90, NEED = 0.5, GAIN = 1.5, SATIATED = 0.62, MAX_EAT = 0.6;

  function newState(biome, ids) {
    const sp = biome.species.filter((s) => ids.includes(s.id));
    const pops = {}; sp.forEach((s) => (pops[s.id] = START[s.kind]));
    return { biome, ids: sp.map((s) => s.id), pops, year: 0, gone: {}, history: [] };
  }
  const by = (biome) => { const m = {}; biome.species.forEach((s) => (m[s.id] = s)); return m; };

  // act: { type: "add"|"cull"|"protect"|"none", id }   ev: { id, target }
  function pickEventTargets(state, ev, rng) {
    const M = by(state.biome), alive = Object.keys(state.pops).filter((k) => state.pops[k] >= 1);
    const choose = (f) => { const c = alive.filter((k) => f(M[k])); return c.length ? c[Math.floor(rng() * c.length)] : null; };
    const e = { id: ev.id, target: null };
    if (ev.id === "disease") e.target = choose((s) => s.kind !== "P");
    if (ev.id === "boom") e.target = choose((s) => s.kind !== "P");
    if (ev.id === "hunt") e.target = choose((s) => s.kind === "C");
    return e;
  }
  function drawEvent(state, events, rng) {
    const total = events.reduce((a, b) => a + b.w, 0); let r = rng() * total, ev = events[0];
    for (const e of events) { r -= e.w; if (r <= 0) { ev = e; break; } }
    let e = pickEventTargets(state, ev, rng);
    if (ev.id !== "calm" && ev.id !== "rain" && e.id !== "drought" && ["disease", "boom", "hunt"].includes(ev.id) && !e.target) e = { id: "calm", target: null };
    return e;
  }

  function step(state, ev, act, rng) {
    const M = by(state.biome), pops = Object.assign({}, state.pops), before = Object.assign({}, state.pops);
    const reasons = {}, why = (id, t) => { (reasons[id] = reasons[id] || []).push(t); };
    const protectedId = act && act.type === "protect" ? act.id : null;
    // 1. the player's action
    if (act && act.id) {
      if (act.type === "add") { pops[act.id] = pops[act.id] >= 1 ? Math.min(CAP[M[act.id].kind], pops[act.id] + 15) : 25; delete state.gone[act.id]; }
      if (act.type === "cull") pops[act.id] = pops[act.id] * 0.65;
    }
    // 2. the event
    let K = P_K;
    const hit = (id, f, text) => { if (id === protectedId || pops[id] < 1) return; pops[id] *= f; why(id, text); };
    state.ids.forEach((id) => {
      const k = M[id].kind;
      if (ev.id === "drought" && k === "P") { hit(id, 0.8, "The drought dried them out."); }
      if (ev.id === "rain" && k === "P") pops[id] = Math.min(CAP.P, pops[id] * 1.2);
      if (ev.id === "fire" && k === "P") hit(id, 0.65, "The wildfire burned them.");
      if (ev.id === "fire" && k === "H") hit(id, 0.8, "The wildfire hurt them.");
      if (ev.id === "cold" && k !== "P") hit(id, 0.85, "The harsh season was hard on them.");
    });
    if (ev.id === "drought") K = P_K * 0.6;
    if (ev.id === "rain") K = P_K * 1.1;
    if (ev.id === "disease" && ev.target) hit(ev.target, 0.55, "A disease made many of them sick.");
    if (ev.id === "hunt" && ev.target) hit(ev.target, 0.6, "Hunters took many of them.");
    if (ev.id === "boom" && ev.target && pops[ev.target] >= 1) pops[ev.target] = Math.min(CAP[M[ev.target].kind], pops[ev.target] * 1.3 + 3);

    // 3. who eats whom
    const demand = {}, plan = {};
    state.ids.forEach((id) => {
      const s = M[id]; if (s.kind === "P" || pops[id] < 1) return;
      const prey = s.eats.filter((p) => state.ids.includes(p) && pops[p] >= 1);
      plan[id] = prey;
      prey.forEach((p) => (demand[p] = (demand[p] || 0) + (pops[id] * NEED) / prey.length));
    });
    const eaten = {}, ratio = {};
    Object.keys(demand).forEach((p) => {
      const cap = (p === protectedId ? 0.15 : MAX_EAT) * pops[p];
      eaten[p] = Math.min(cap, demand[p]); ratio[p] = eaten[p] / demand[p];
    });
    const fed = {};
    Object.keys(plan).forEach((id) => {
      const prey = plan[id];
      fed[id] = prey.length ? prey.reduce((a, p) => a + ratio[p] / prey.length, 0) : 0;
    });
    // 4. everyone's numbers change
    state.ids.forEach((id) => {
      const s = M[id], p0 = pops[id]; if (p0 < 1) { pops[id] = 0; return; }
      let p;
      if (s.kind === "P") {
        p = p0 - (eaten[id] || 0) + P_REGROW * p0 * (1 - p0 / K) * 1;
        if (p0 > K) p = Math.min(p, p0 * 0.9 - (eaten[id] || 0) + 0.1 * K);
      } else {
        const f = fed[id] || 0;
        p = p0 * (1 + GAIN * (f - SATIATED)) - (eaten[id] || 0);
      }
      p *= 0.97 + Math.random() * 0 + (rng() - 0.5) * 0.08;
      pops[id] = clamp(p, 0, CAP[s.kind]); if (pops[id] < 2 && s.kind !== "P") pops[id] = 0;
    });
    // 5. reasons
    state.ids.forEach((id) => {
      const s = M[id], a = before[id], b = pops[id];
      if (a < 1 && b < 1) return;
      if (b < 1) { why(id, "Not enough left to survive. They are gone!"); return; }
      const d = (b - a) / Math.max(a, 1);
      if (d < -0.15) {
        if (s.kind === "P" && eaten[id] > 0.3 * Math.max(a, 1)) { const eaters = state.ids.filter((x) => M[x].kind === "H" && M[x].eats.includes(id) && pops[x] >= 1).map((x) => M[x].name); why(id, `${eaters.join(" and ") || "Plant-eaters"} ate lots of them.`); }
        else if (s.kind !== "P" && fed[id] < 0.45) why(id, plan[id] && plan[id].length ? "Not enough food to go around, so many went hungry." : `They have nothing to eat! (They eat ${s.eats.map((x) => M[x].name).join(" or ")}.)`);
        else if (s.kind !== "P" && (eaten[id] || 0) > 0.25 * Math.max(a, 1)) { const hunters = state.ids.filter((x) => M[x].eats.includes(id) && pops[x] >= 1).map((x) => M[x].name); why(id, `${hunters.join(" and ")} hunted lots of them.`); }
        else if (!reasons[id]) why(id, "Crowding and food shortages shrank their numbers.");
      } else if (d > 0.15 && !reasons[id]) {
        if (s.kind === "P") why(id, "Plenty of sun and water. They grew back!");
        else if ((fed[id] || 0) > 0.85) why(id, "Lots of food, so lots of babies!");
        else why(id, "Fewer hunters meant more survived.");
      }
    });
    state.pops = pops; state.year++;
    state.ids.forEach((id) => { if (before[id] >= 1 && pops[id] < 1) state.gone[id] = state.year; });
    const rec = { year: state.year, ev, act, before, after: Object.assign({}, pops), reasons };
    state.history.push(rec);
    return rec;
  }

  // 0-3 stars after the final year
  function score(state, years) {
    const M = by(state.biome), alive = state.ids.filter((id) => state.pops[id] >= 1);
    const kinds = new Set(alive.map((id) => M[id].kind));
    const complete = ["P", "H", "C"].every((k) => kinds.has(k));
    const n = alive.length, goal = state.biome.goal;
    let stars = 0;
    if (kinds.has("P") && kinds.has("H")) stars = 1;
    const thriving = alive.filter((id) => state.pops[id] >= 12).length;
    if (complete && n >= goal) stars = 2;
    if (complete && n === state.ids.length && thriving >= goal) stars = 3;
    // a healthy web has nobody exploding or just barely hanging on
    const points = alive.reduce((a, id) => a + 10 + (state.pops[id] >= 15 ? 5 : 0), 0) + (complete ? 20 : 0);
    return { stars, alive: n, thriving, points, complete };
  }
  const api = { newState, step, drawEvent, score, START, CAP };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.ECO = api;
})(typeof window !== "undefined" ? window : globalThis);
