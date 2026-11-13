// Neighbourhood Tycoon — game engine
(function () {
  "use strict";

  const app = document.getElementById("app");
  const JOBS = NT.jobs;
  const BY_ID = Object.fromEntries(JOBS.map((j) => [j.id, j]));
  const AVATARS = ["🧒", "👧", "👦", "🧑", "🦊", "🐼", "🦁", "🐸", "🤖", "🦄", "🐯", "🐙"];
  const START_CASH = 25;

  let s = null;      // saved game state for the current player
  let wx = null;     // this week's weather (not saved)
  let noise = {};    // this week's random customer luck per job (not saved)

  // ===================================================================
  // Helpers
  // ===================================================================
  const rand = () => Math.random();
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const r2 = (n) => Math.round(n * 100) / 100;
  const money = (n) => (n < -0.004 ? "-" : "") + "$" + Math.abs(n).toFixed(2).replace(/\.00$/, "");
  const money2 = (n) => (n < -0.004 ? "-" : "") + "$" + Math.abs(n).toFixed(2);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const pct = (x) => (x >= 0 ? "+" : "") + (x * 100).toFixed(1) + "%";

  function netWorth() { return r2(s.cash + s.bank + s.own.i * s.mk.i + s.own.s * s.mk.s); }
  function liquid() { return netWorth(); }
  function goalObj() { return NT.goals.find((g) => g.id === s.goal) || null; }
  function level(n) { let l = 1; NT.levels.forEach((t, i) => { if (n >= t) l = i + 1; }); return l; }
  function isReady(j) { const st = s.jobs[j.id]; return (!j.gear || st.g) && (!j.training || st.d >= j.training.hours); }
  function rateOf(j) { const r = s.jobs[j.id].r; return r === "p" && level(s.jobs[j.id].n) < 2 ? "n" : r; }
  function hoursAvail() { return NT.hoursFor(s.w); }
  function hoursPlanned() {
    let h = 0;
    JOBS.forEach((j) => { h += (s.plan[j.id] || 0) * j.hours + (s.tp[j.id] || 0) * 2; });
    return h;
  }

  function save() { if (s) NT.store.save(s, { nw: netWorth() }); }

  // ===================================================================
  // Modal
  // ===================================================================
  const modal = document.getElementById("modal");
  function openModal(opt) {
    document.getElementById("modalIcon").textContent = opt.icon || "";
    document.getElementById("modalTitle").textContent = opt.title || "";
    document.getElementById("modalBody").innerHTML = opt.html || "";
    const actions = document.getElementById("modalActions");
    actions.innerHTML = "";
    (opt.choices || [{ label: "Continue" }]).forEach((c) => {
      const b = document.createElement("button");
      b.className = "btn " + (c.cls || "");
      b.innerHTML = esc(c.label) + (c.hint ? `<small>${esc(c.hint)}</small>` : "");
      b.disabled = !!c.disabled;
      b.addEventListener("click", () => { closeModal(); if (c.onClick) c.onClick(); });
      actions.appendChild(b);
    });
    modal.classList.remove("hidden");
    const first = actions.querySelector("button:not(:disabled)");
    if (first) first.focus();
  }
  function closeModal() { modal.classList.add("hidden"); }

  // show a list of simple modals one after another, then call done
  function showQueue(queue, done) {
    if (!queue.length) return done && done();
    const m = queue.shift();
    openModal({ ...m, choices: [{ label: m.button || "Continue", cls: "ink", onClick: () => showQueue(queue, done) }] });
  }

  // ===================================================================
  // Money tips
  // ===================================================================
  function tipItem(id) {
    const t = NT.tips[id];
    return { icon: t.icon, title: "Money Tip: " + t.title, html: `<div class="fact"><b>${t.icon} ${esc(t.title)}</b>${esc(t.text)}</div>` };
  }
  // add tip to queue if it is new
  function learn(id, queue) {
    if (s.tips.includes(id)) return false;
    s.tips.push(id);
    if (queue) queue.push(tipItem(id));
    return true;
  }
  function tipsModal() {
    openModal({
      icon: "📖", title: "Money Tips",
      html: s.tips.length ? `<p class="muted">Ideas you've discovered:</p><ul class="dict">${s.tips.map((id) => `<li><b>${NT.tips[id].icon} ${esc(NT.tips[id].title)}</b><br>${esc(NT.tips[id].text)}</li>`).join("")}</ul>` : "<p>Play on to discover money tips!</p>",
      choices: [{ label: "Close", cls: "secondary" }],
    });
  }

  // ===================================================================
  // Players
  // ===================================================================
  function profileScreen() {
    closeModal();
    s = null;
    const players = NT.store.list();
    const mode = NT.store.mode();
    app.innerHTML = `
      <div class="card">
        <div class="center">
          <h2 class="title">Neighbourhood Tycoon</h2>
          <p class="muted" style="margin:4px 0 0">Work side jobs, learn new skills, save and invest. Build your money over the seasons!</p>
        </div>
        ${mode === "none" ? `<div class="notice">⚠️ Your browser is blocking cookies, so your progress <b>can't be saved</b>. You can still play, but it will be lost when you close this page.</div>` : ""}
        ${mode === "local" ? `<div class="notice">ℹ️ Cookies are blocked here, so progress is saved in this browser's local storage instead.</div>` : ""}
        <h3 class="section-title" style="margin-top:16px">${players.length ? "Who's playing?" : "Welcome! Let's set up your first player."}</h3>
        <div class="player-list" id="players">
          ${players.map((p) => `
            <div class="player">
              <div class="av">${esc(p.a)}</div>
              <div class="meta"><b>${esc(p.n)}</b><small>Year ${p.y} • ${NT.SEASONS[NT.seasonOf(p.w)].emoji} Week ${p.w} • Net worth ${money(p.nw)}</small></div>
              <button class="btn ink small go" data-play="${esc(p.i)}">Play ▶</button>
              <button class="del" data-del="${esc(p.i)}" aria-label="Delete ${esc(p.n)}" title="Delete this player">🗑️</button>
            </div>`).join("")}
        </div>
        ${NT.store.canAddPlayer() ? `<button class="btn go block" id="newBtn">➕ New player</button>` : `<p class="muted center">You've reached ${NT.store.MAX_PLAYERS} players. Delete one to add another.</p>`}
        <p class="muted center" style="font-size:0.85rem;margin:14px 0 0">Each player's game is saved on this device in the browser, so you can come back later and keep going.</p>
      </div>`;
    app.querySelectorAll("[data-play]").forEach((b) => (b.onclick = () => startProfile(b.dataset.play)));
    app.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => {
      const p = players.find((x) => x.i === b.dataset.del);
      openModal({
        icon: "🗑️", title: `Delete ${p.n}?`, html: "<p class=\"result-text\">This will erase all of this player's progress. This can't be undone.</p>",
        choices: [
          { label: "Yes, delete", cls: "", onClick: () => { NT.store.remove(p.i); profileScreen(); } },
          { label: "No, keep it", cls: "secondary" },
        ],
      });
    }));
    const nb = document.getElementById("newBtn");
    if (nb) nb.onclick = newPlayerScreen;
  }

  function newPlayerScreen() {
    let av = AVATARS[Math.floor(rand() * AVATARS.length)], season = 0, goal = "bike";
    app.innerHTML = `
      <div class="card">
        <h2 class="title" style="font-size:1.8rem">New Player</h2>
        <h3 class="section-title" style="margin-top:12px">1. Your name</h3>
        <input type="text" id="pname" maxlength="14" placeholder="Type your name or nickname" autocomplete="off">
        <h3 class="section-title">2. Pick a picture</h3>
        <div class="pill-row" id="avs">${AVATARS.map((a) => `<button class="pill" data-av="${a}" style="font-size:1.6rem">${a}</button>`).join("")}</div>
        <h3 class="section-title">3. When do you start?</h3>
        <div class="pill-row" id="seas">${NT.SEASONS.map((x, i) => `<button class="pill" data-se="${i}">${x.emoji} ${x.name}</button>`).join("")}</div>
        <h3 class="section-title">4. What are you saving for?</h3>
        <div class="pill-row" id="goals">${NT.goals.map((g) => `<button class="pill goal-opt" data-g="${g.id}"><span>${g.emoji} ${esc(g.name)}</span><small>${money(g.cost)}</small></button>`).join("")}</div>
        <p id="perr" class="warn" style="text-align:left"></p>
        <div class="action-row" style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn go" id="createBtn" style="flex:1 1 220px;font-size:1.15rem">Start playing! ▶</button>
          <button class="btn secondary" id="backBtn">Back</button>
        </div>
      </div>`;
    function refresh() {
      app.querySelectorAll("[data-av]").forEach((b) => b.classList.toggle("on", b.dataset.av === av));
      app.querySelectorAll("[data-se]").forEach((b) => b.classList.toggle("on", Number(b.dataset.se) === season));
      app.querySelectorAll("[data-g]").forEach((b) => b.classList.toggle("on", b.dataset.g === goal));
    }
    app.querySelectorAll("[data-av]").forEach((b) => (b.onclick = () => { av = b.dataset.av; refresh(); }));
    app.querySelectorAll("[data-se]").forEach((b) => (b.onclick = () => { season = Number(b.dataset.se); refresh(); }));
    app.querySelectorAll("[data-g]").forEach((b) => (b.onclick = () => { goal = b.dataset.g; refresh(); }));
    refresh();
    document.getElementById("backBtn").onclick = profileScreen;
    document.getElementById("createBtn").onclick = () => {
      const name = document.getElementById("pname").value.trim();
      if (!name) { document.getElementById("perr").textContent = "Please type a name first."; return; }
      s = newState(name, av, season, goal);
      save();
      const q = [];
      learn("goal", q);
      learn("opportunity", q);
      openModal({
        icon: "🏘️", title: `Welcome to the neighbourhood, ${name}!`,
        html: `<p class="result-text">You have ${money(START_CASH)} and a dream: ${esc(goalObj().emoji + " " + goalObj().name)} (${money(goalObj().cost)}).</p>
          <ul style="padding-left:20px;margin:8px 0">
            <li>Each <b>week</b> you have a few free <b>hours</b>. Choose which side jobs to do.</li>
            <li>Some jobs need <b>gear</b> or <b>training</b> before you can start. They cost money but may pay more.</li>
            <li>Jobs are busier or slower depending on the <b>season</b> and <b>weather</b>.</li>
            <li>Put money in <b>savings</b> or <b>stocks</b> and watch it grow (or wiggle!).</li>
          </ul>`,
        choices: [{ label: "Let's get started!", cls: "ink", onClick: () => showQueue(q, weekStart) }],
      });
    };
  }

  function newState(name, av, startSeason, goal) {
    const jobs = {};
    JOBS.forEach((j) => (jobs[j.id] = { g: 0, e: 0, d: 0, n: 0, r: "n" }));
    return {
      v: 1, id: NT.store.newId(), name, av,
      w: startSeason * 13 + 1, y: 1, tw: 0,
      cash: START_CASH, bank: 0,
      mk: { i: NT.fund.start, s: NT.single.start, ih: [NT.fund.start], sh: [NT.single.start] },
      own: { i: 0, s: 0 },
      jobs, plan: {}, tp: {}, last: {},
      goal, gd: [], gp: 0, tips: [], buff: 1,
      nw: [START_CASH], yr: { n0: START_CASH, w: 0, i: 0, j: {}, sp: 0 }, tot: { w: 0, i: 0 },
    };
  }

  function startProfile(id) {
    const loaded = NT.store.load(id);
    if (!loaded) { profileScreen(); return; }
    s = loaded;
    // fill in anything a future version might add
    JOBS.forEach((j) => { if (!s.jobs[j.id]) s.jobs[j.id] = { g: 0, e: 0, d: 0, n: 0, r: "n" }; });
    s.plan = s.plan || {}; s.tp = s.tp || {}; s.last = s.last || {};
    NT.store.setLast(id);
    if (s.py) yearScreen(); else weekStart();
  }

  // ===================================================================
  // Week setup
  // ===================================================================
  function weekStart() {
    closeModal();
    const table = NT.weather[NT.seasonOf(s.w)];
    let r = rand() * table.reduce((t, x) => t + x.w, 0);
    wx = table[0];
    for (const x of table) { r -= x.w; if (r <= 0) { wx = x; break; } }
    noise = {};
    JOBS.forEach((j) => (noise[j.id] = 0.75 + rand() * 0.5));
    // drop plans that no longer make sense
    JOBS.forEach((j) => { if (!isReady(j)) delete s.plan[j.id]; if (s.jobs[j.id].d >= (j.training ? j.training.hours : 0)) delete s.tp[j.id]; });
    trimPlan();
    planScreen();
  }

  function trimPlan() {
    const max = hoursAvail();
    while (hoursPlanned() > max) {
      const ids = Object.keys(s.plan).filter((k) => s.plan[k] > 0);
      const tids = Object.keys(s.tp).filter((k) => s.tp[k] > 0);
      if (ids.length) { const k = ids[ids.length - 1]; s.plan[k]--; if (!s.plan[k]) delete s.plan[k]; }
      else if (tids.length) { const k = tids[tids.length - 1]; s.tp[k]--; if (!s.tp[k]) delete s.tp[k]; }
      else break;
    }
  }

  // ===================================================================
  // Demand and pay
  // ===================================================================
  function expected(j) {
    const sea = NT.seasonOf(s.w);
    let m = j.season[sea];
    if (m <= 0) return 0;
    m *= 1 + (wx.out - 1) * j.outdoor;
    if (j.thirst) m *= wx.thirst || 1;
    if (j.snow) m *= wx.snow == null ? 0 : wx.snow;
    m *= 1 + 0.07 * (level(s.jobs[j.id].n) - 1);
    m *= NT.rates[rateOf(j)].dem;
    m *= s.buff || 1;
    return j.base * m;
  }
  function payPer(j) { return j.pay * (1 + 0.08 * (level(s.jobs[j.id].n) - 1)) * NT.rates[rateOf(j)].pay; }
  function demandLabel(j) {
    const sea = NT.seasonOf(s.w), e = expected(j);
    if (j.season[sea] <= 0) return { t: "Closed this season", c: "cold" };
    if (e < 0.5) return { t: j.snow ? "No snow this week" : "Very slow", c: "cold" };
    const ratio = e / j.base;
    if (ratio < 0.5) return { t: "😴 Slow", c: "cold" };
    if (ratio < 0.95) return { t: "🙂 OK", c: "" };
    if (ratio < 1.35) return { t: "👍 Steady", c: "good" };
    return { t: "🔥 Busy", c: "hot" };
  }
  function estimate() {
    let t = 0;
    JOBS.forEach((j) => { const k = s.plan[j.id] || 0; if (k && isReady(j)) t += Math.min(k, expected(j)) * (payPer(j) - j.supplies); });
    return t;
  }

  // ===================================================================
  // Plan screen
  // ===================================================================
  function rerender() { const y = window.scrollY; planScreen(); window.scrollTo(0, y); }

  function jobCard(j) {
    const st = s.jobs[j.id], sea = NT.seasonOf(s.w), ready = isReady(j);
    const lvl = level(st.n), k = s.plan[j.id] || 0, e = expected(j);
    const used = hoursPlanned(), avail = hoursAvail();
    const dl = demandLabel(j);
    const closed = j.season[sea] <= 0 || e < 0.5;
    let body = "";

    if (!ready) {
      if (j.gear && !st.g) {
        body += `<p class="sub" style="margin:8px 0 4px">Needs <b>${esc(j.gear.name)}</b> to get started.</p>
          <button class="btn small ink block" data-a="gear" data-id="${j.id}" ${s.cash < j.gear.cost ? "disabled" : ""}>Buy for ${money(j.gear.cost)}</button>`;
      } else if (j.training) {
        if (!st.e) {
          body += `<p class="sub" style="margin:8px 0 4px">Needs <b>${esc(j.training.name)}</b> (${j.training.hours} study hours).</p>
            <button class="btn small ink block" data-a="enroll" data-id="${j.id}" ${s.cash < j.training.cost ? "disabled" : ""}>Enroll for ${money(j.training.cost)}</button>`;
        } else {
          const left = j.training.hours - st.d, blocks = s.tp[j.id] || 0, maxB = Math.ceil(left / 2);
          body += `<div class="train"><b>🎓 ${esc(j.training.name)}</b>
            <div class="bar" style="margin:6px 0"><i style="width:${(st.d / j.training.hours) * 100}%"></i></div>
            <span class="sub">${st.d} of ${j.training.hours} hours done. Study this week:</span>
            <div class="stepper">
              <button data-a="tminus" data-id="${j.id}" ${blocks <= 0 ? "disabled" : ""}>−</button>
              <span class="val"><b>${blocks * 2}h</b><small>of study</small></span>
              <button data-a="tplus" data-id="${j.id}" ${blocks >= maxB || used + 2 > avail ? "disabled" : ""}>+</button>
            </div></div>`;
        }
      }
      if (closed && ready === false) body += `<p class="sub" style="margin:6px 0 0">💡 ${esc(j.seasonNote)}</p>`;
    } else {
      const over = k > Math.round(e) + 1 && k > 0;
      const rate = rateOf(j);
      body += `<div class="facts">
          <span class="fact-chip ${dl.c}">${dl.t}</span>
          <span class="fact-chip">~${Math.round(e)} customers</span>
          <span class="fact-chip good">${money2(payPer(j))} each</span>
          ${j.supplies ? `<span class="fact-chip">supplies ${money(j.supplies)}</span>` : ""}
        </div>
        <div class="stepper">
          <button data-a="minus" data-id="${j.id}" ${k <= 0 ? "disabled" : ""}>−</button>
          <span class="val"><b>${k}</b><small>${j.hours}h each</small></span>
          <button data-a="plus" data-id="${j.id}" ${used + j.hours > avail || (closed && j.season[sea] <= 0) ? "disabled" : ""}>+</button>
        </div>
        <div class="rates">${["l", "n", "p"].map((r) => `<button data-a="rate" data-id="${j.id}" data-r="${r}" title="${esc(NT.rates[r].tip)}" class="${rate === r ? "on" : ""}" ${r === "p" && lvl < 2 ? "disabled" : ""}>${NT.rates[r].emoji} ${NT.rates[r].name}${r === "p" && lvl < 2 ? " 🔒" : ""}</button>`).join("")}</div>
        ${over ? `<p class="warn">⚠️ Only about ${Math.round(e)} customers expected!</p>` : ""}`;
    }

    const stars = ready ? `<span class="lvl" title="${NT.levelNames[lvl - 1]}">${"⭐".repeat(lvl)}</span>` : "";
    return `<div class="job ${k > 0 || (s.tp[j.id] || 0) > 0 ? "active" : ""} ${ready && closed ? "off" : ""}">
      <div class="top"><div class="em">${j.emoji}</div>
        <div><h3>${esc(j.name)}</h3><div class="sub">${esc(j.blurb)}</div></div>${stars}</div>
      ${body}
      ${ready && closed ? `<p class="sub" style="margin:6px 0 0">💡 ${esc(j.seasonNote)}</p>` : ""}
    </div>`;
  }

  function planScreen() {
    closeModal();
    const sea = NT.SEASONS[NT.seasonOf(s.w)];
    const used = hoursPlanned(), avail = hoursAvail();
    const g = goalObj();
    const nw = netWorth();
    const est = estimate();
    const hasLast = Object.keys(s.last).length > 0;

    app.innerHTML = `
      <div class="pbar"><div class="who">${esc(s.av)} ${esc(s.name)}</div>
        <button class="btn small secondary" id="switchBtn">👥 Switch player</button></div>

      <div class="scene ${wx.name.match(/Rain|Thunder/i) ? "rain" : ""}" style="background:${sea.bg}">
        <div class="big">${wx.emoji}</div>
        <h2>${sea.emoji} ${sea.name} • Week ${s.w} of 52 • Year ${s.y}</h2>
        <p>This week: <b>${wx.emoji} ${wx.name}</b></p>
        <p>${NT.breakName(s.w)}</p>
        <div class="tags"><span class="chip">${sea.months}</span><span class="chip">⏰ ${avail} free hours</span></div>
      </div>

      <div class="stat-row">
        <div><small>💵 Cash</small><b>${money2(s.cash)}</b></div>
        <div><small>🏦 Savings</small><b>${money2(s.bank)}</b></div>
        <div><small>📈 Investments</small><b>${money2(s.own.i * s.mk.i + s.own.s * s.mk.s)}</b></div>
        <div><small>⭐ Net worth</small><b>${money2(nw)}</b></div>
      </div>

      ${g ? `<div class="goalbox"><div class="row"><span>🎯 Saving for: ${g.emoji} ${esc(g.name)}</span><span>${money(Math.min(nw, g.cost))} / ${money(g.cost)}</span></div>
        <div class="bar"><i style="width:${clamp((nw / g.cost) * 100, 0, 100)}%"></i></div>
        ${nw >= g.cost ? `<button class="btn go small" id="buyGoalBtn" style="margin-top:8px">🎉 You can afford it! Buy it</button>` : ""}</div>` : ""}

      <div class="goalbox"><div class="row"><span>⏰ Hours planned</span><span>${used} of ${avail}</span></div>
        <div class="bar hours ${used > avail ? "over" : ""}"><i style="width:${clamp((used / avail) * 100, 0, 100)}%"></i></div></div>

      <div class="jobs" id="jobs">${JOBS.map(jobCard).join("")}</div>

      <div class="actionbar">
        <div class="sum"><span>Planned: ${Object.values(s.plan).reduce((a, b) => a + b, 0)} jobs, ${used}h</span><span>Estimated earnings: <b class="accent">${money2(est)}</b></span></div>
        <div class="btns">
          <button class="btn go" id="goBtn">Start the week ▶</button>
          ${hasLast ? '<button class="btn secondary" id="sameBtn">🔁 Same as last week</button>' : ""}
          <button class="btn secondary" id="clearBtn">Clear</button>
          <button class="btn secondary" id="moneyBtn">💰 Bank &amp; stocks</button>
          <button class="btn secondary" id="tipsBtn">📖 Tips (${s.tips.length})</button>
        </div>
      </div>`;

    document.getElementById("jobs").onclick = onJobClick;
    document.getElementById("goBtn").onclick = startWeek;
    document.getElementById("clearBtn").onclick = () => { s.plan = {}; s.tp = {}; rerender(); };
    const same = document.getElementById("sameBtn");
    if (same) same.onclick = () => {
      s.plan = {}; s.tp = {};
      Object.entries(s.last.plan || {}).forEach(([k, v]) => { if (BY_ID[k] && isReady(BY_ID[k])) s.plan[k] = v; });
      Object.entries(s.last.tp || {}).forEach(([k, v]) => { if (BY_ID[k] && s.jobs[k].e && !isReady(BY_ID[k])) s.tp[k] = v; });
      trimPlan(); rerender();
    };
    document.getElementById("moneyBtn").onclick = moneyScreen;
    document.getElementById("tipsBtn").onclick = tipsModal;
    document.getElementById("switchBtn").onclick = () => { save(); profileScreen(); };
    const bg = document.getElementById("buyGoalBtn");
    if (bg) bg.onclick = goalModal;
  }

  function onJobClick(e) {
    const b = e.target.closest("[data-a]");
    if (!b || b.disabled) return;
    const j = BY_ID[b.dataset.id], st = s.jobs[j.id], a = b.dataset.a, q = [];
    if (a === "plus") { s.plan[j.id] = (s.plan[j.id] || 0) + 1; }
    else if (a === "minus") { s.plan[j.id] = Math.max(0, (s.plan[j.id] || 0) - 1); if (!s.plan[j.id]) delete s.plan[j.id]; }
    else if (a === "tplus") { s.tp[j.id] = (s.tp[j.id] || 0) + 1; }
    else if (a === "tminus") { s.tp[j.id] = Math.max(0, (s.tp[j.id] || 0) - 1); if (!s.tp[j.id]) delete s.tp[j.id]; }
    else if (a === "rate") { st.r = b.dataset.r; if (learn("rate", q)) { /* queued */ } }
    else if (a === "gear") { s.cash = r2(s.cash - j.gear.cost); s.yr.sp = r2((s.yr.sp || 0) + j.gear.cost); st.g = 1; learn("startup", q); save(); }
    else if (a === "enroll") { s.cash = r2(s.cash - j.training.cost); s.yr.sp = r2((s.yr.sp || 0) + j.training.cost); st.e = 1; learn("training", q); save(); }
    if (q.length) { rerender(); showQueue(q, null); } else rerender();
  }

  // ===================================================================
  // Money screen: savings and stocks
  // ===================================================================
  function spark(arr, color) {
    const W = 300, H = 54, min = Math.min(...arr), max = Math.max(...arr), span = max - min || 1;
    const pts = arr.map((v, i) => `${(i / Math.max(1, arr.length - 1)) * W},${H - 4 - ((v - min) / span) * (H - 8)}`).join(" ");
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/></svg>`;
  }

  function moneyScreen() {
    const f = NT.fund, st = NT.single;
    const fv = s.own.i * s.mk.i, sv = s.own.s * s.mk.s;
    const lastF = s.mk.ih.length > 1 ? s.mk.i / s.mk.ih[s.mk.ih.length - 2] - 1 : 0;
    const lastS = s.mk.sh.length > 1 ? s.mk.s / s.mk.sh[s.mk.sh.length - 2] - 1 : 0;
    const proj = (s.bank > 0 ? s.bank : 100) * Math.pow(1 + NT.bankRate, 52);
    const movers = (key, hasAmount, hasCash) => `
      <div class="mv"><span class="lbl">Move money in from your wallet:</span>
        ${[10, 50, "all"].map((x) => `<button class="in" data-m="${key}" data-d="in" data-x="${x}" ${!hasCash ? "disabled" : ""}>${x === "all" ? "All" : "+$" + x}</button>`).join("")}
        <span class="lbl">Take money out to your wallet:</span>
        ${[10, 50, "all"].map((x) => `<button data-m="${key}" data-d="out" data-x="${x}" ${!hasAmount ? "disabled" : ""}>${x === "all" ? "All" : "−$" + x}</button>`).join("")}
      </div>`;
    const range = (arr) => `Past ${arr.length - 1 || 0} weeks: low ${money2(Math.min(...arr))}, high ${money2(Math.max(...arr))}`;

    app.innerHTML = `
      <div class="pbar"><div class="who">💰 Bank &amp; Stocks</div><button class="btn small secondary" id="backBtn">← Back to jobs</button></div>
      <div class="stat-row">
        <div><small>💵 Wallet cash</small><b>${money2(s.cash)}</b></div>
        <div><small>⭐ Net worth</small><b>${money2(netWorth())}</b></div>
      </div>
      <p class="muted" style="margin:0 4px 10px">Cash in your wallet doesn't grow. Savings grow slowly and safely. Stocks can grow faster, but their prices wiggle up and down, so you can lose money too.</p>
      <div class="accts">
        <div class="acct">
          <h3>🏦 Kid Savings Account</h3><span class="risk low">🟢 Very safe</span>
          <div class="amt">${money2(s.bank)}</div>
          <p class="desc">Pays ${(NT.bankRate * 100).toFixed(2)}% interest every week. ${s.bank > 0 ? "" : "Try it with $100:"} In a year ${s.bank > 0 ? "your balance would grow" : "it would grow"} to about <b>${money2(proj)}</b>. (Real banks pay less!)</p>
          ${movers("bank", s.bank > 0.004, s.cash > 0.004)}
        </div>
        <div class="acct">
          <h3>${f.emoji} ${f.name}</h3><span class="risk med">🟡 Medium risk</span>
          <div class="amt">${money2(fv)}</div>
          <p class="desc">Tiny pieces of hundreds of companies. Price now <b>${money2(s.mk.i)}</b> (${pct(lastF)} last week).</p>
          ${spark(s.mk.ih, "#4a3cc0")}
          <p class="desc" style="margin-top:2px">${range(s.mk.ih)}</p>
          ${movers("fund", fv > 0.004, s.cash > 0.004)}
        </div>
        <div class="acct">
          <h3>${st.emoji} ${st.name}</h3><span class="risk high">🔴 High risk</span>
          <div class="amt">${money2(sv)}</div>
          <p class="desc">Just ONE company that makes electric scooters. Price now <b>${money2(s.mk.s)}</b> (${pct(lastS)} last week). Big jumps and big drops!</p>
          ${spark(s.mk.sh, "#e2463b")}
          <p class="desc" style="margin-top:2px">${range(s.mk.sh)}</p>
          ${movers("stock", sv > 0.004, s.cash > 0.004)}
        </div>
      </div>
      ${chartNetWorth()}`;
    document.getElementById("backBtn").onclick = planScreen;
    app.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => moveMoney(b.dataset.m, b.dataset.d, b.dataset.x)));
  }

  function moveMoney(acct, dir, x) {
    const q = [];
    const price = acct === "fund" ? s.mk.i : acct === "stock" ? s.mk.s : 1;
    const bal = acct === "bank" ? s.bank : acct === "fund" ? s.own.i * price : s.own.s * price;
    let amt = x === "all" ? Infinity : Number(x);
    if (dir === "in") {
      amt = r2(Math.min(amt, s.cash));
      if (amt <= 0) return;
      s.cash = r2(s.cash - amt);
      if (acct === "bank") { s.bank = r2(s.bank + amt); learn("interest", q); }
      else if (acct === "fund") { s.own.i += amt / price; learn("risk", q); }
      else { s.own.s += amt / price; learn("risk", q); learn("diversify", q); }
    } else {
      amt = r2(Math.min(amt, bal));
      if (amt <= 0) return;
      s.cash = r2(s.cash + amt);
      if (acct === "bank") s.bank = r2(s.bank - amt);
      else if (acct === "fund") s.own.i = Math.max(0, s.own.i - amt / price);
      else s.own.s = Math.max(0, s.own.s - amt / price);
      if (acct !== "bank") learn("liquidity", q);
    }
    if (s.own.i < 1e-6) s.own.i = 0;
    if (s.own.s < 1e-6) s.own.s = 0;
    save();
    const y = window.scrollY; moneyScreen(); window.scrollTo(0, y);
    if (q.length) showQueue(q, null);
  }

  // pay a bill from cash, then savings, then investments. Returns what was used.
  function payFrom(amount) {
    let left = amount;
    const used = [];
    const take = Math.min(s.cash, left); s.cash = r2(s.cash - take); left = r2(left - take);
    if (left > 0 && s.bank > 0) { const t = Math.min(s.bank, left); s.bank = r2(s.bank - t); left = r2(left - t); used.push("savings"); }
    if (left > 0 && s.own.i > 0) { const t = Math.min(s.own.i * s.mk.i, left); s.own.i -= t / s.mk.i; left = r2(left - t); used.push("fund"); }
    if (left > 0 && s.own.s > 0) { const t = Math.min(s.own.s * s.mk.s, left); s.own.s -= t / s.mk.s; left = r2(left - t); used.push("stock"); }
    return { short: left, used };
  }

  // ===================================================================
  // Charts
  // ===================================================================
  function chartNetWorth(title) {
    const pts = s.nw.slice();
    if (pts.length < 2) return "";
    const W = 340, H = 170, L = 46, B = 22, T = 10, R = 10;
    const max = Math.max(...pts) * 1.05, min = Math.min(0, ...pts);
    const xs = (i) => L + (i / (pts.length - 1)) * (W - L - R);
    const ys = (v) => T + (1 - (v - min) / (max - min || 1)) * (H - T - B);
    const line = pts.map((v, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
    return `<div class="chart-box"><h4>${title || "⭐ Your net worth over time"}</h4><p>Everything you own: cash, savings and investments.</p>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Net worth over time">
        <line x1="${L}" x2="${W - R}" y1="${ys(0)}" y2="${ys(0)}" stroke="#d8d4fa"/>
        <text x="${L - 6}" y="${ys(0) + 4}" font-size="11" text-anchor="end" fill="#6b6878">$0</text>
        <text x="${L - 6}" y="${ys(max) + 10}" font-size="11" text-anchor="end" fill="#6b6878">$${Math.round(max)}</text>
        <path d="${line}" fill="none" stroke="#4a3cc0" stroke-width="3" stroke-linejoin="round"/>
        <text x="${L}" y="${H - 5}" font-size="11" fill="#6b6878">${pts.length - 1} weeks ago</text><text x="${W - R}" y="${H - 5}" font-size="11" text-anchor="end" fill="#6b6878">Now</text>
      </svg></div>`;
  }

  // ===================================================================
  // Running the week
  // ===================================================================
  function stepMarket() {
    const m = s.mk, notes = [];
    let ri = NT.fund.mean + NT.fund.sd * gauss();
    if (rand() < 0.03) { ri = -0.06; notes.push({ icon: "📉", bad: true, text: "Market jitters! Investors got nervous and fund prices dipped." }); }
    else if (rand() < 0.03) { ri = 0.045; notes.push({ icon: "📈", text: "Good economy news! Fund prices jumped." }); }
    ri = Math.max(-0.12, ri);
    let rs = NT.single.mean + NT.single.sd * gauss();
    if (rand() < 0.035) { rs = 0.25; notes.push({ icon: "🛵", text: "Zoom Scooters launched a hit new scooter! Its stock soared." }); }
    else if (rand() < 0.035) { rs = -0.3; notes.push({ icon: "⚠️", bad: true, text: "Zoom Scooters recalled a scooter model! Its stock crashed." }); }
    rs = Math.max(-0.5, rs);
    m.i = r2(Math.max(10, m.i * (1 + ri)));
    m.s = r2(Math.max(5, m.s * (1 + rs)));
    m.ih.push(m.i); m.sh.push(m.s);
    if (m.ih.length > 53) { m.ih.shift(); m.sh.shift(); }
    return { ri, rs, notes };
  }

  function startWeek() {
    const res = { rows: [], train: [], wages: 0, worked: false, idle: 0, supplies: 0, events: [], market: [], tipsQ: [], levelUps: [], done: 0 };
    const tipQ = res.tipsQ;
    const before = netWorth();
    const oldW = s.w;

    // work and study
    const dataBefore = {};
    JOBS.forEach((j) => (dataBefore[j.id] = isReady(j)));
    JOBS.forEach((j) => {
      const st = s.jobs[j.id];
      const tb = s.tp[j.id] || 0;
      if (tb > 0 && st.e && j.training && st.d < j.training.hours) {
        st.d = Math.min(j.training.hours, st.d + tb * 2);
        res.train.push({ j, hours: tb * 2, done: st.d >= j.training.hours });
      }
      const k = s.plan[j.id] || 0;
      if (k > 0 && dataBefore[j.id]) {
        const dem = Math.round(expected(j) * noise[j.id]);
        const done = Math.min(k, dem);
        let gross = 0;
        for (let i = 0; i < done; i++) gross += payPer(j) * (0.9 + 0.2 * rand());
        gross = r2(gross);
        const sup = r2(j.supplies * done);
        const lb = level(st.n);
        st.n += done;
        if (level(st.n) > lb) res.levelUps.push({ j, lvl: level(st.n) });
        res.rows.push({ j, planned: k, done, gross, sup, net: r2(gross - sup), idle: k - done, dem });
        res.wages = r2(res.wages + gross - sup);
        res.supplies = r2(res.supplies + sup);
        res.idle += k - done; res.done += done;
        s.yr.j[j.id] = r2((s.yr.j[j.id] || 0) + gross - sup);
      }
    });
    res.worked = res.done > 0;
    s.cash = r2(s.cash + res.wages);
    s.tot.w = r2(s.tot.w + res.wages); s.yr.w = r2(s.yr.w + res.wages);
    s.last = { plan: { ...s.plan }, tp: { ...s.tp } };
    s.plan = {}; s.tp = {};

    // interest
    res.interest = r2(s.bank * NT.bankRate);
    s.bank = r2(s.bank + res.interest);
    s.tot.i = r2(s.tot.i + res.interest); s.yr.i = r2(s.yr.i + res.interest);

    // markets
    const fvB = s.own.i * s.mk.i, svB = s.own.s * s.mk.s;
    const mk = stepMarket();
    res.fundChange = r2(s.own.i * s.mk.i - fvB);
    res.stockChange = r2(s.own.s * s.mk.s - svB);
    res.mk = mk;
    mk.notes.forEach((n) => res.market.push(n));

    // surprise events
    let nextBuff = 1;
    if (rand() < 0.4) {
      const pool = NT.events.filter((ev) => !ev.needsWork || res.worked);
      let r = rand() * pool.reduce((t, x) => t + x.w, 0), ev = pool[0];
      for (const x of pool) { r -= x.w; if (r <= 0) { ev = x; break; } }
      const e = { icon: ev.icon, text: ev.text, gain: ev.gain || 0, cost: 0, bad: false };
      if (ev.gain) s.cash = r2(s.cash + ev.gain);
      if (ev.cost) {
        const p = payFrom(ev.cost);
        e.cost = ev.cost; e.bad = true; s.yr.sp = r2((s.yr.sp || 0) + ev.cost);
        if (p.used.length) { e.text += ` You had to take it from your ${p.used.join(" and ")}.`; learn("liquidity", tipQ); }
        else if (ev.tip === "emergency") learn("emergency", tipQ);
        if (p.short > 0) e.text += " (Mom covered the rest.)";
        if (ev.tip === "emergency" && p.used.length === 0 && s.bank + s.cash < 20) learn("emergency", tipQ);
        if (ev.tip === "wants") learn("wants", tipQ);
      }
      if (ev.buff) nextBuff = ev.buff;
      res.events.push(e);
    }
    s.buff = nextBuff;

    // tips triggered by this week
    if (res.supplies > 0) learn("margin", tipQ);
    if (res.idle > 0) learn("waste", tipQ);
    if (res.levelUps.length) learn("skill", tipQ);
    if (res.interest > 0) { learn("interest", tipQ); if (s.tot.i >= 3) learn("compound", tipQ); }
    if (res.market.some((n) => n.icon === "🛵") || res.market.some((n) => n.icon === "⚠️")) { if (s.own.s > 0) learn("diversify", tipQ); }

    // calendar
    s.w++; s.tw++;
    let yearEnd = false;
    if (s.w > 52) { s.w = 1; s.y++; yearEnd = true; s.py = 1; }
    const newSeason = NT.seasonOf(oldW) !== NT.seasonOf(s.w);
    if (newSeason) learn("seasons", tipQ);

    res.nw = netWorth();
    res.change = r2(res.nw - before);
    s.nw.push(Math.round(res.nw * 100) / 100);
    if (s.nw.length > 53) s.nw.shift();
    save();
    resultsScreen(res, yearEnd, newSeason, oldW);
  }

  function resultsScreen(res, yearEnd, newSeason, oldW) {
    const sea = NT.SEASONS[NT.seasonOf(oldW)];
    let delay = 0;
    const row = (em, title, sub, amt, cls) => { const d = (delay += 0.18); return `<div class="res-row" style="animation-delay:${d}s"><div class="em">${em}</div><div><b>${title}</b><small>${sub}</small></div><b class="${cls || ""}">${amt}</b></div>`; };
    let rows = "";
    res.rows.forEach((r) => {
      const sub = [`${r.done} job${r.done === 1 ? "" : "s"} done` + (r.sup ? ` • supplies −${money2(r.sup)}` : "")];
      if (r.idle) sub.push(`😴 ${r.idle} planned shift${r.idle === 1 ? "" : "s"} had no customers (wasted ${r.idle * r.j.hours}h)`);
      rows += row(r.j.emoji, esc(r.j.name), sub.join("<br>"), (r.net >= 0 ? "+" : "") + money2(r.net), r.net > 0 ? "pos" : "");
    });
    res.train.forEach((t) => { rows += row("🎓", esc(t.j.training.name), t.done ? "🎉 Training complete! You can start this job now." : `${t.hours} study hours`, "", ""); });
    if (!res.rows.length && !res.train.length) rows += row("🛋️", "A relaxing week", "You didn't plan any work. That's okay, but money won't grow itself!", "", "");
    if (res.interest > 0.004) rows += row("🏦", "Savings interest", `${(NT.bankRate * 100).toFixed(2)}% on your savings`, "+" + money2(res.interest), "pos");
    if (Math.abs(res.fundChange) > 0.004 || s.own.i > 0) rows += row(NT.fund.emoji, NT.fund.name, `price ${pct(res.mk.ri)}`, (res.fundChange >= 0 ? "+" : "") + money2(res.fundChange), res.fundChange >= 0 ? "pos" : "neg");
    if (Math.abs(res.stockChange) > 0.004 || s.own.s > 0) rows += row(NT.single.emoji, NT.single.name, `price ${pct(res.mk.rs)}`, (res.stockChange >= 0 ? "+" : "") + money2(res.stockChange), res.stockChange >= 0 ? "pos" : "neg");
    res.events.forEach((e) => { rows += row(e.icon, "Surprise!", esc(e.text), (e.gain ? "+" + money2(e.gain) : "−" + money2(e.cost)), e.gain ? "pos" : "neg"); });

    const news = res.market.map((n) => `<div class="news ${n.bad ? "bad" : ""}">${n.icon} ${esc(n.text)}</div>`).join("");
    const nextSea = NT.SEASONS[NT.seasonOf(s.w)];

    app.innerHTML = `
      <div class="card">
        <p class="muted center" style="margin:0">${sea.emoji} ${sea.name} • Week ${oldW} results</p>
        <p class="center muted" style="margin:0">You earned (after supplies)</p>
        <p class="big-num center ${res.wages > 0 ? "pos" : ""}">${money2(res.wages)}</p>
        <div>${rows}</div>
        <div class="res-row" style="animation-delay:${delay + 0.2}s;border:none"><div class="em">⭐</div><div><b>Net worth change</b><small>Now ${money2(res.nw)}</small></div><b class="${res.change >= 0 ? "pos" : "neg"}">${res.change >= 0 ? "+" : "−"}${money2(Math.abs(res.change))}</b></div>
        ${news}
        ${newSeason ? `<div class="news">${nextSea.emoji} <b>${nextSea.name} is here!</b> Some jobs are busier now, and some are closed. Check the "best" notes on each job.</div>` : ""}
      </div>
      <div class="action-row" style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
        <button class="btn go" id="nextBtn" style="flex:1 1 220px;min-height:56px;font-size:1.2rem">${yearEnd ? "See my year! 🏁" : "Plan next week ▶"}</button>
        <button class="btn secondary" id="moneyBtn">💰 Bank &amp; stocks</button>
      </div>`;
    window.scrollTo({ top: 0 });
    document.getElementById("moneyBtn").onclick = () => { moneyScreen(); };

    // queue: level ups, training, tips, then goal, then year end
    const q = [];
    res.levelUps.forEach((l) => q.push({ icon: "⭐", title: "Level Up!", html: `<p class="result-text">${l.j.emoji} ${esc(l.j.name)} is now Level ${l.lvl}: <b>${NT.levelNames[l.lvl - 1]}</b>!</p><p>You earn a little more per job and customers ask for you more${l.lvl === 2 ? ", and you can now charge <b>Premium</b> prices" : ""}.</p>` }));
    res.train.filter((t) => t.done).forEach((t) => q.push({ icon: "🎓", title: "Training Complete!", html: `<p class="result-text">You finished <b>${esc(t.j.training.name)}</b>! ${t.j.emoji} ${esc(t.j.name)} is now unlocked.</p>` }));
    const items = [...q, ...res.tipsQ];

    document.getElementById("nextBtn").onclick = () => {
      const after = () => { if (yearEnd) yearScreen(); else weekStart(); };
      const g = goalObj();
      const finalQ = items.slice();
      const afterTips = () => {
        if (g && !s.gp && netWorth() >= g.cost) { s.gp = 1; save(); goalModal(after); }
        else after();
      };
      showQueue(finalQ, afterTips);
    };
  }

  // ===================================================================
  // Goals
  // ===================================================================
  function goalModal(then) {
    const g = goalObj();
    if (!g) return then ? then() : planScreen();
    openModal({
      icon: g.emoji, title: "You can afford your goal!",
      html: `<p class="result-text">You've saved enough for ${esc(g.name)} (${money(g.cost)}). Buy it now, or keep saving and growing your money?</p>
        <p class="muted">If you buy it, the money comes from your cash first, then your savings, then your investments.</p>`,
      choices: [
        { label: `Buy it! (${money(g.cost)})`, cls: "go", onClick: () => buyGoal(then) },
        { label: "Keep saving for now", cls: "secondary", onClick: () => (then ? then() : planScreen()) },
      ],
    });
  }

  function buyGoal(then) {
    const g = goalObj();
    const p = payFrom(g.cost);
    s.yr.sp = r2((s.yr.sp || 0) + g.cost);
    s.gd.push(g.id); s.gp = 0; s.goal = null;
    const q = [];
    if (p.used.length) learn("liquidity", q);
    save();
    const remaining = NT.goals.filter((x) => !s.gd.includes(x.id));
    const cont = () => {
      if (!remaining.length) {
        openModal({ icon: "🏆", title: "All goals achieved!", html: "<p class=\"result-text\">You've bought everything on your list! Keep growing your net worth and see how far you can go.</p>", choices: [{ label: "Keep playing", cls: "ink", onClick: () => (then ? then() : planScreen()) }] });
      } else {
        openModal({
          icon: "🎯", title: "Pick your next goal",
          html: "<p class=\"result-text\">What will you save for next?</p>",
          choices: remaining.map((x) => ({ label: `${x.emoji} ${x.name}`, hint: money(x.cost), cls: "ink", onClick: () => { s.goal = x.id; save(); (then ? then() : planScreen()); } })),
        });
      }
    };
    openModal({
      icon: "🎉", title: `You bought the ${g.name}!`,
      html: `<p class="result-text">${g.emoji} Congratulations! You earned it with your own hard work.</p>${p.used.length ? '<p class="muted">You had to use some of your savings or investments to pay for it. That\'s why having cash on hand matters.</p>' : ""}`,
      choices: [{ label: "Awesome!", cls: "go", onClick: () => (q.length ? showQueue(q, cont) : cont()) }],
    });
  }

  // ===================================================================
  // Year end + quiz
  // ===================================================================
  function yearScreen() {
    closeModal();
    const y = s.y - 1;
    const nw = netWorth();
    const growth = r2(nw - s.yr.n0);
    const bestEntry = Object.entries(s.yr.j).sort((a, b) => b[1] - a[1])[0];
    const best = bestEntry ? BY_ID[bestEntry[0]] : null;
    const snapshot = { ...s.yr };
    s.yr = { n0: nw, w: 0, i: 0, j: {}, sp: 0 };
    s.py = 0;
    save();
    app.innerHTML = `
      <div class="card center">
        <div style="font-size:3rem">🎊</div>
        <h2 class="title" style="font-size:2rem">Year ${y} Complete!</h2>
        <p class="result-text" style="margin:4px 0">${esc(s.name)}'s net worth grew by <span class="accent">${money2(growth)}</span> this year!</p>
        <div class="end-stats">
          <div><b>${money2(nw)}</b>net worth now</div>
          <div><b>${money2(snapshot.w)}</b>earned from jobs</div>
          <div><b>${money2(snapshot.i)}</b>savings interest</div>
          <div><b>${money2(snapshot.sp || 0)}</b>spent on gear, training, goals &amp; surprises</div>
          <div><b>${best ? best.emoji + " " + esc(best.name) : "–"}</b>top earning job</div>
        </div>
        ${chartNetWorth("⭐ Your net worth this year")}
        <p class="muted">Jobs you've mastered: ${JOBS.filter((j) => s.jobs[j.id].n > 0).map((j) => j.emoji + "×" + s.jobs[j.id].n).join("  ") || "none yet"}</p>
        <div class="action-row" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn go" id="contBtn">Start year ${s.y} ▶</button>
          <button class="btn ink" id="quizBtn">📝 Money Quiz</button>
        </div>
      </div>`;
    document.getElementById("contBtn").onclick = weekStart;
    document.getElementById("quizBtn").onclick = quizScreen;
    window.scrollTo({ top: 0 });
  }

  function quizScreen() {
    const questions = shuffle(NT.quiz).slice(0, 6);
    let i = 0, right = 0;
    function show() {
      if (i >= questions.length) return finish();
      const q = questions[i];
      const answers = shuffle(q.a.map((text, idx) => ({ text, correct: idx === 0 })));
      app.innerHTML = `
        <div class="card">
          <p class="muted" style="margin:0">Question ${i + 1} of ${questions.length}</p>
          <h2 style="color:var(--ink);margin:6px 0 16px">${esc(q.q)}</h2>
          <div style="display:flex;flex-direction:column;gap:10px">${answers.map((a, n) => `<button class="btn secondary quiz-option" data-n="${n}">${esc(a.text)}</button>`).join("")}</div>
          <div id="explain"></div>
        </div>`;
      app.querySelectorAll("[data-n]").forEach((btn) => {
        btn.onclick = () => {
          const chosen = answers[Number(btn.dataset.n)];
          app.querySelectorAll("[data-n]").forEach((b) => { b.disabled = true; if (answers[Number(b.dataset.n)].correct) b.classList.add("correct"); });
          if (chosen.correct) right++; else btn.classList.add("incorrect");
          document.getElementById("explain").innerHTML = `<p class="result-text" style="margin-top:14px">${chosen.correct ? "✅ Correct!" : "❌ Not quite."} ${esc(q.explain)}</p><button class="btn go" id="nextQ">${i + 1 < questions.length ? "Next question ▶" : "See my score"}</button>`;
          document.getElementById("nextQ").onclick = () => { i++; show(); };
        };
      });
    }
    function finish() {
      const stars = right >= 6 ? 3 : right >= 4 ? 2 : right >= 2 ? 1 : 0;
      app.innerHTML = `<div class="card center"><div style="font-size:3rem;letter-spacing:6px">${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}</div>
        <h2 style="color:var(--ink);margin:6px 0">You got ${right} out of ${questions.length}!</h2>
        <p>${stars === 3 ? "You think like a money pro!" : stars === 2 ? "Great work! You know your money basics." : "Nice try! Keep playing to learn more."}</p>
        <button class="btn go" id="contBtn">Continue my game ▶</button></div>`;
      document.getElementById("contBtn").onclick = weekStart;
    }
    show();
  }

  window.NT_DEBUG = () => ({ s, wx, noise, planScreen, save });

  // ===================================================================
  // Start: show the player list
  // ===================================================================
  profileScreen();
})();
