// Business Builder — screens and game flow
(function () {
  "use strict";

  const BB = window.BB, E = BB.engine;
  const store = createProfileStore("bb", { prefer: "local" });
  const app = document.getElementById("app");
  const AVATARS = ["🧑", "👩", "👨", "🧒", "🦊", "🐼", "🦁", "🐸", "🤖", "🦄", "🐯", "🐙"];
  const STAR_GOALS = [40000, 120000, 350000, 900000, 2000000];
  const TITLES = ["Dreamer", "Side Hustler", "Small Business Owner", "Entrepreneur", "Business Tycoon", "Business Legend 👑"];

  let b = null;                                          // the business being run
  let ui = { tab: "run", role: null, cands: {}, candQ: -1 };

  // ===================================================================
  // Helpers
  // ===================================================================
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const r0 = Math.round;
  const n0 = (n) => Math.round(n).toLocaleString("en-US");
  const money = (n) => (n < -0.5 ? "-" : "") + "$" + Math.abs(r0(n)).toLocaleString("en-US");
  const price2 = (n) => "$" + n.toFixed(2).replace(/\.00$/, "");
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const T = () => BB.types[b.type];
  const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
  const bar = (v, max, warn) => `<div class="bar ${warn ? "warn" : ""}"><i style="width:${clamp((v / max) * 100, 0, 100)}%"></i></div>`;
  const roleName = (r) => T().roles[r];

  function persist() {
    if (!b) return;
    store.save(b, { biz: b.biz, ty: T().emoji, y: E.year(b), q: (b.qi % 4) + 1, w: E.ownerWorth(b), o: b.over || "" });
  }

  // ===================================================================
  // Modal + tips
  // ===================================================================
  const modal = document.getElementById("modal");
  function openModal(opt) {
    document.getElementById("modalIcon").textContent = opt.icon || "";
    document.getElementById("modalTitle").textContent = opt.title || "";
    document.getElementById("modalBody").innerHTML = opt.html || "";
    const actions = document.getElementById("modalActions");
    actions.innerHTML = "";
    (opt.choices || [{ label: "Continue" }]).forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "btn " + (c.cls || "");
      btn.innerHTML = esc(c.label) + (c.hint ? `<small>${esc(c.hint)}</small>` : "");
      btn.disabled = !!c.disabled;
      btn.addEventListener("click", () => { closeModal(); if (c.onClick) c.onClick(); });
      actions.appendChild(btn);
    });
    modal.classList.remove("hidden");
    const first = actions.querySelector("button:not(:disabled)");
    if (first) first.focus();
  }
  function closeModal() { modal.classList.add("hidden"); }
  function showQueue(queue, done) {
    if (!queue.length) return done && done();
    const m = queue.shift();
    openModal({ ...m, choices: [{ label: m.button || "Continue", cls: "acc", onClick: () => showQueue(queue, done) }] });
  }
  const tipBox = (id) => { const t = BB.tips[id]; return `<div class="fact"><b>${t.icon} Business Tip: ${esc(t.title)}</b>${esc(t.text)}</div>`; };
  function learn(id, queue) {
    if (!id || b.tips.includes(id) || !BB.tips[id]) return false;
    b.tips.push(id);
    if (queue) queue.push({ icon: BB.tips[id].icon, title: "Business Tip", html: tipBox(id) });
    return true;
  }
  function glossary() {
    openModal({
      icon: "📖", title: "Business Tips",
      html: b.tips.length ? `<p class="muted">Ideas you've discovered:</p><ul class="dict">${b.tips.map((id) => `<li><b>${BB.tips[id].icon} ${esc(BB.tips[id].title)}</b><br>${esc(BB.tips[id].text)}</li>`).join("")}</ul>` : "<p>Play on to discover business tips!</p>",
      choices: [{ label: "Close", cls: "secondary" }],
    });
  }

  // ===================================================================
  // Profiles: who's playing?
  // ===================================================================
  function profileScreen() {
    closeModal(); b = null;
    const players = store.list(), mode = store.mode();
    app.innerHTML = `
      <div class="card">
        <div class="center">
          <h2 class="title">Business Builder</h2>
          <p class="muted" style="margin:4px 0 0">Start a business, grow a team, and live through the ups and downs. How far can you take it?</p>
        </div>
        ${mode === "none" ? `<div class="notice">⚠️ Your browser is blocking storage, so progress <b>can't be saved</b>. You can still play, but it will be lost when you close this page.</div>` : ""}
        <h3 class="section-title" style="margin-top:16px">${players.length ? "Who's playing?" : "Welcome! Let's set up your first player."}</h3>
        <div class="player-list">
          ${players.map((p) => `
            <div class="player">
              <div class="av">${esc(p.a)}</div>
              <div class="meta"><b>${esc(p.n)}</b><small>${p.biz ? `${esc(p.ty || "")} ${esc(p.biz)} • Year ${p.y} Q${p.q} • Worth ${money(p.w || 0)}${p.o === "bankrupt" ? " (closed)" : p.o === "sold" ? " (sold)" : ""}` : "New player"}</small></div>
              <button class="btn acc small go" data-play="${esc(p.i)}">Play ▶</button>
              <button class="del" data-del="${esc(p.i)}" aria-label="Delete ${esc(p.n)}" title="Delete this player">🗑️</button>
            </div>`).join("")}
        </div>
        ${store.canAddPlayer() ? `<button class="btn go block" id="newBtn">➕ New player</button>` : `<p class="muted center">You've reached ${store.MAX_PLAYERS} players. Delete one to add another.</p>`}
        <p class="muted center" style="font-size:0.85rem;margin:14px 0 0">Each player's game is saved in this browser, so you can come back and keep going.</p>
      </div>`;
    app.querySelectorAll("[data-play]").forEach((btn) => (btn.onclick = () => playProfile(btn.dataset.play)));
    app.querySelectorAll("[data-del]").forEach((btn) => (btn.onclick = () => {
      const p = players.find((x) => x.i === btn.dataset.del);
      openModal({ icon: "🗑️", title: `Delete ${p.n}?`, html: '<p class="result-text">This erases all of this player\'s progress and can\'t be undone.</p>',
        choices: [{ label: "Yes, delete", onClick: () => { store.remove(p.i); profileScreen(); } }, { label: "No, keep it", cls: "secondary" }] });
    }));
    const nb = document.getElementById("newBtn");
    if (nb) nb.onclick = () => pickBusinessScreen({ id: store.newId(), name: "", av: AVATARS[Math.floor(Math.random() * AVATARS.length)], runs: [], tips: [] });
  }

  function playProfile(id) {
    const loaded = store.load(id);
    if (!loaded) return profileScreen();
    b = loaded;
    if (!b.runs) b.runs = [];
    store.setLast(id);
    ui = { tab: "run", role: null, cands: {}, candQ: -1 };
    if (b.over) return endScreen(b.over);
    mainScreen();
  }

  // ===================================================================
  // Starting a business
  // ===================================================================
  function pickBusinessScreen(carry) {
    let typeId = "bakery", av = carry.av;
    const returning = !!carry.name;
    app.innerHTML = `
      <div class="card">
        <h2 class="title" style="font-size:1.8rem">${returning ? "Start a New Business" : "New Player"}</h2>
        ${returning ? "" : `<h3 class="section-title" style="margin-top:12px">1. Your name</h3>
          <input type="text" id="pname" maxlength="14" placeholder="Type your name or nickname" autocomplete="off">
          <h3 class="section-title">2. Pick a picture</h3>
          <div class="pill-row" id="avs">${AVATARS.map((a) => `<button class="pill" data-av="${a}" style="font-size:1.5rem">${a}</button>`).join("")}</div>`}
        <h3 class="section-title">${returning ? "1" : "3"}. What business will you start?</h3>
        <p class="muted-s" style="margin:0 0 8px">You'll start as a one-person business with $${E.START_SAVINGS.toLocaleString()} of savings. Different businesses have different costs, seasons and risks.</p>
        <div class="biz-grid" id="bizGrid">
          ${Object.entries(BB.types).map(([k, t]) => `
            <button class="biz" data-t="${k}"><span class="em">${t.emoji}</span><b>${esc(t.name)}</b><small>${esc(t.blurb)}</small>
              <div class="chips"><span class="chip">Start-up ${money(t.startup)}</span><span class="chip ${t.risk === "Low" ? "g" : t.risk === "High" ? "r" : "o"}">${t.risk} risk</span></div></button>`).join("")}
        </div>
        <h3 class="section-title">${returning ? "2" : "4"}. Name your business</h3>
        <input type="text" id="bname" maxlength="26" autocomplete="off">
        <p id="perr" style="color:var(--bad);font-weight:600"></p>
        <div class="row2"><button class="btn go" id="createBtn" style="flex:2 1 220px;font-size:1.15rem">Open for business! ▶</button><button class="btn secondary" id="backBtn">Back</button></div>
      </div>`;
    const bname = document.getElementById("bname");
    const defaults = { bakery: "Sweet Treats", lawn: "Green Thumb Services", tech: "Bright Ideas Apps", shirts: "Print It Up", bikes: "Spoke & Wheel", pets: "Happy Tails", tutor: "Bright Minds", eco: "Green Earth Goods" };
    function refresh() {
      app.querySelectorAll("[data-av]").forEach((x) => x.classList.toggle("on", x.dataset.av === av));
      app.querySelectorAll("[data-t]").forEach((x) => x.classList.toggle("on", x.dataset.t === typeId));
      if (!bname.dataset.edited) bname.value = defaults[typeId];
    }
    bname.addEventListener("input", () => (bname.dataset.edited = "1"));
    app.querySelectorAll("[data-av]").forEach((x) => (x.onclick = () => { av = x.dataset.av; refresh(); }));
    app.querySelectorAll("[data-t]").forEach((x) => (x.onclick = () => { typeId = x.dataset.t; refresh(); }));
    refresh();
    document.getElementById("backBtn").onclick = profileScreen;
    document.getElementById("createBtn").onclick = () => {
      const owner = returning ? carry.name : document.getElementById("pname").value.trim();
      if (!owner) { document.getElementById("perr").textContent = "Please type your name first."; return; }
      const biz = bname.value.trim() || defaults[typeId];
      b = E.newGame(typeId, biz, owner, av);
      b.id = carry.id; b.runs = carry.runs || []; b.tips = carry.tips ? carry.tips.slice() : [];
      ui = { tab: "run", role: null, cands: {}, candQ: -1 };
      persist();
      const q = [];
      learn("solo", q); learn("profit", q);
      openModal({
        icon: T().emoji, title: `Welcome to ${b.biz}!`,
        html: `<p class="result-text">You paid ${money(T().startup)} to get started. You put ${money(E.START_CASH)} into the business and kept ${money(b.savings)} in personal savings.</p>
          <ul style="padding-left:20px;margin:8px 0"><li>You're a <b>sole proprietor</b>: just you, doing everything.</li><li>Each <b>quarter</b> (3 months) you set your price, marketing and quality, then see how it goes.</li><li>As you grow you can <b>hire a team</b>, <b>form a company</b>, borrow money and expand, but watch out for the ups and downs!</li></ul>`,
        choices: [{ label: "Let's go!", cls: "acc", onClick: () => showQueue(q, mainScreen) }],
      });
    };
  }

  // ===================================================================
  // Main screen
  // ===================================================================
  const stageName = () => (b.structure === "corp" ? (b.reach >= 2 ? "🏙️ Major Company" : "🏛️ Growing Corporation") : b.staff.length === 0 && b.structure === "solo" ? "🌱 Side Hustle" : b.structure === "llc" ? "🛡️ Small Company (LLC)" : "🏪 Small Business");

  function advice(pv) {
    const out = [];
    const t = T();
    const next = (b.qi + 1) % 4;
    if (pv.demand > pv.capacity * 1.15) out.push({ c: "", t: `📦 About ${n0(pv.demand)} customers want to buy, but you can only serve ${n0(pv.capacity)}. You're losing sales! Hire a ${roleName("maker").toLowerCase()} or buy better equipment.` });
    else if (pv.capacity > pv.demand * 1.5 && b.qi >= 2) out.push({ c: "", t: `😴 You could serve ${n0(pv.capacity)} customers but only about ${n0(pv.demand)} are expected. More marketing or better quality could fill the gap.` });
    if (pv.net < 0) out.push({ c: "bad", t: `📉 At this plan you'd lose about ${money(-pv.net)} this quarter. Check your price, costs and team.` });
    if (b.cash < pv.payroll + pv.rent) out.push({ c: "bad", t: `💵 Your cash (${money(b.cash)}) is lower than one quarter of payroll and rent. Keep a cushion so you can pay your bills!` });
    if (b.structure === "solo" && E.annual(b, "prof") >= 8000) out.push({ c: "", t: "🛡️ You're earning real money. As a sole proprietor your personal savings are at risk if you're sued. See the Grow tab about forming an LLC." });
    if (b.econ.phase === "recession") out.push({ c: "", t: "📉 The economy is in a recession. Customers are cutting back, so go easy on spending and save cash." });
    if (b.econ.phase === "boom") out.push({ c: "good", t: "📈 The economy is booming! Customers are spending freely. Save some profit for tougher times." });
    const m = t.season[next] / t.season[b.qi % 4];
    if (m > 1.25) out.push({ c: "good", t: `🌤️ Your busy season is coming up next quarter (${E.SEASON_NAMES[next]}).` });
    else if (m < 0.75) out.push({ c: "", t: `❄️ Next quarter (${E.SEASON_NAMES[next]}) is a slower season, so plan your cash.` });
    if (b.staff.length && b.staff.reduce((s, e) => s + e.m, 0) / b.staff.length < 50) out.push({ c: "bad", t: "😟 Your team's morale is low. Fair pay and a manager help keep good people." });
    if (b.Q < 4) out.push({ c: "bad", t: `🎯 Your quality has slipped to ${b.Q.toFixed(1)}. Customers see less value, so demand falls. Try a quality program or hire an expert.` });
    if (b.rep < 40) out.push({ c: "bad", t: "⭐ Your reputation is low. Invest in quality and keep customers happy." });
    return out.sort((x, y) => (y.c === "bad") - (x.c === "bad")).slice(0, 3);   // problems first
  }

  function mainScreen() {
    closeModal();
    b.plan.price = clamp(+b.plan.price.toFixed(2), E.PRICE_MIN, E.PRICE_MAX);
    const t = T(), pv = E.preview(b, b.plan);
    const worth = E.ownerWorth(b);
    const debt = b.debt + b.edebt;
    const season = E.season(b);
    const team = b.staff.map((e) => `<span title="${esc(roleName(e.r))}: ${esc(e.n)}">${BB.roles[e.r].emoji}</span>`).join("");
    const sea = ["❄️", "🌸", "☀️", "🍂"][season];

    app.innerHTML = `
      <div class="pbar"><div class="who">${esc(b.av)} ${esc(b.name)}</div><button class="btn small secondary" id="switchBtn">👥 Switch player</button></div>
      <div class="bhero ${b.econ.phase}">
        <h2>${t.emoji} ${esc(b.biz)}</h2>
        <p class="sub">${stageName()} • Year ${E.year(b)}, Q${(b.qi % 4) + 1} of ${E.TOTAL_Q / 4} years</p>
        <div class="badges">
          <span class="badge">${sea} ${E.SEASON_NAMES[season]}</span>
          <span class="badge">${b.econ.phase === "boom" ? "📈 Boom" : b.econ.phase === "recession" ? "📉 Recession" : "📊 Normal economy"}</span>
          <span class="badge">${BB.structures[b.structure].emoji} ${BB.structures[b.structure].name}</span>
          <span class="badge">📍 ${E.REACH_NAMES[b.reach]}</span>
          ${b.comp.level ? `<span class="badge">🥊 Rival ${"●".repeat(b.comp.level)}</span>` : ""}
          ${b.ins ? `<span class="badge">☂️ Insured</span>` : ""}
        </div>
        <div class="shop"><span class="bld">${["🏠", "🏪", "🏬", "🏙️"][b.reach]}</span><span title="You">${esc(b.av)}</span>${team}</div>
      </div>

      <div class="stats">
        <div class="s"><small>💵 Business cash</small><b class="${b.cash < 0 ? "neg" : ""}">${money(b.cash)}</b></div>
        <div class="s"><small>🐷 Personal savings</small><b>${money(b.savings)}</b></div>
        <div class="s"><small>🏦 Debt</small><b>${money(debt)}</b></div>
        <div class="s"><small>⭐ Reputation</small><b>${r0(b.rep)}</b>${bar(b.rep, 100, b.rep < 35)}</div>
        <div class="s"><small>🎯 Quality</small><b>${b.Q.toFixed(1)}/10</b>${bar(b.Q, 10, b.Q < 3)}</div>
        <div class="s"><small>📣 Awareness</small><b>${r0(b.buzz)}</b>${bar(b.buzz, 100)}</div>
        <div class="s"><small>👥 Team</small><b>${b.staff.length}</b><small>${money(pv.payroll)}/qtr</small></div>
        <div class="s" title="Your savings plus your share of what the business could be sold for"><small>🏆 You're worth</small><b>${money(worth)}</b><small>savings + your share of the business</small></div>
      </div>

      ${advice(pv).map((a) => `<div class="advice ${a.c}">${esc(a.t)}</div>`).join("")}

      <div class="forecast">
        <div class="line"><span>🔮 Forecast for this quarter</span><span>About ${n0(pv.demand)} customers • you can serve ${n0(pv.capacity)}</span></div>
        <div class="line" style="margin-top:4px"><span>Sales ≈ ${money(pv.revenue)}</span><span style="color:${pv.net >= 0 ? "var(--good)" : "var(--bad)"}">Profit after taxes ≈ ${money(pv.net)}</span></div>
      </div>

      <div class="tabs" id="tabs">
        ${[["run", "📈 Run it"], ["team", "👥 Team"], ["money", "🏦 Money"], ["grow", "🏗️ Grow"]].map(([k, l]) => `<button class="tab ${ui.tab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}
      </div>
      <div class="panel" id="panel">${ui.tab === "run" ? tabRun(pv) : ui.tab === "team" ? tabTeam() : ui.tab === "money" ? tabMoney() : tabGrow()}</div>

      <div class="actionbar"><div class="btns">
        <button class="btn go" id="endBtn">End the quarter ▶</button>
        <button class="btn secondary" id="tipsBtn">📖 Tips (${b.tips.length})</button>
      </div></div>`;

    app.querySelectorAll("[data-tab]").forEach((x) => (x.onclick = () => { ui.tab = x.dataset.tab; rerender(); }));
    document.getElementById("panel").onclick = onAct;
    document.getElementById("endBtn").onclick = endQuarter;
    document.getElementById("tipsBtn").onclick = glossary;
    document.getElementById("switchBtn").onclick = () => { persist(); profileScreen(); };
  }
  function rerender() { const y = window.scrollY; mainScreen(); window.scrollTo(0, y); }

  // ---------------- tabs ----------------
  function tabRun(pv) {
    const t = T();
    const acc = E.acceptablePrice(b);
    return `
      <div class="card"><h3>🏷️ Price</h3>
        <p class="hint">At your current quality, customers see what you sell as worth about <b>${price2(acc)}</b>. Charge more and fewer will buy; charge less and more will.</p>
        <div class="stepper">
          <button data-act="price" data-v="-0.05">−5%</button>
          <span class="val"><b>${price2(t.price * b.plan.price)}</b><small>${r0(b.plan.price * 100)}% of normal</small></span>
          <button data-act="price" data-v="0.05">+5%</button>
        </div>
        <p class="hint" style="text-align:center;margin:0">Each sale costs you about ${price2(pv.unitCost)} to make.</p>
      </div>
      <div class="card"><h3>📣 Marketing</h3><p class="hint">Awareness builds slowly and fades if you stop. Spending more has smaller and smaller payoffs.</p>
        <div class="opts">${E.MK_NAMES.map((n, i) => `<button class="opt ${b.plan.mk === i ? "on" : ""}" data-act="mk" data-v="${i}"><span>${n}</span><b>${i ? money(E.mkSpend(b, i)) : "Free"}</b></button>`).join("")}</div></div>
      <div class="card"><h3>🎯 Quality</h3><p class="hint">Training and improvements raise your quality. Without them, quality slowly slips.</p>
        <div class="opts">${E.QT_NAMES.map((n, i) => `<button class="opt ${b.plan.qt === i ? "on" : ""}" data-act="qt" data-v="${i}"><span>${n}</span><b>${i ? money(E.qtSpend(b, i)) : "Free"}</b></button>`).join("")}</div></div>`;
  }

  function candidates(role) {
    if (ui.candQ !== b.qi) { ui.cands = {}; ui.candQ = b.qi; }
    if (!ui.cands[role]) ui.cands[role] = E.candidates(b, role);
    return ui.cands[role];
  }

  function tabTeam() {
    const t = T();
    const staffHTML = b.staff.length ? b.staff.map((e) => {
      const ratio = e.w / E.marketWage(b, e.r, e.s);
      return `<div class="staff"><div class="em">${BB.roles[e.r].emoji}</div>
        <div><b>${esc(e.n)}</b> • ${esc(roleName(e.r))} <span class="stars">${"★".repeat(e.s)}${"☆".repeat(5 - e.s)}</span>
          <small>${money(e.w)}/qtr ${ratio < 0.9 ? "• 💸 underpaid" : ""} • morale ${r0(e.m)}${e.t === 0 ? " • new" : ""}</small>${bar(e.m, 100, e.m < 40)}</div>
        <div class="row2" style="flex-wrap:nowrap"><button class="btn small secondary" data-act="raise" data-id="${e.id}" title="Give a 10% raise">+10%</button><button class="btn small secondary" data-act="fire" data-id="${e.id}" title="Let go">Let go</button></div></div>`;
    }).join("") : `<p class="hint">It's just you right now. You do everything, but you can only do so much!</p>`;
    const role = ui.role;
    return `
      <div class="card"><h3>👥 Your team</h3><p class="hint">Payroll costs ${money(E.payroll(b))} a quarter (wages plus taxes and benefits). Managers keep teams efficient: about 5 people per manager.</p>${staffHTML}</div>
      <div class="card"><h3>➕ Hire someone</h3>
        <div class="pill-row">${Object.keys(BB.roles).map((r) => `<button class="pill ${role === r ? "on" : ""}" data-act="role" data-v="${r}">${BB.roles[r].emoji} ${esc(t.roles[r])}</button>`).join("")}</div>
        ${role ? `<p class="hint">${BB.roles[role].desc} Recruiting costs about 35% of a quarter's wage, and new hires take a quarter to get up to speed.</p>
          ${candidates(role).map((c, i) => `<div class="cand"><div><b>${esc(c.n)}</b> <span class="stars">${"★".repeat(c.s)}${"☆".repeat(5 - c.s)}</span><small>Wants ${money(c.w)}/qtr • recruiting fee ${money(c.fee)}</small></div><button class="btn small go" data-act="hire" data-v="${i}" ${b.cash < c.fee ? "disabled" : ""}>Hire</button></div>`).join("")}` : `<p class="hint">Pick a role to see candidates.</p>`}
      </div>`;
  }

  function tabMoney() {
    const lim = E.loanLimit(b);
    const corp = b.structure === "corp";
    return `
      <div class="card"><h3>🏦 Loans</h3>
        <p class="hint">You owe ${money(b.debt)} at ${(E.rate(b) * 100).toFixed(1)}% interest per quarter${b.edebt ? ` and ${money(b.edebt)} of emergency loans at 4.5%` : ""}. You can borrow up to ${money(lim)} more. A better legal structure gets better rates.</p>
        <div class="row2">${[2000, 5000, 15000].map((a) => `<button class="btn small secondary" data-act="borrow" data-v="${a}" ${lim < a ? "disabled" : ""}>Borrow ${money(a)}</button>`).join("")}</div>
        <div class="row2" style="margin-top:6px">${[1000, 5000].map((a) => `<button class="btn small secondary" data-act="repay" data-v="${a}" ${b.debt + b.edebt <= 0 || b.cash < 1 ? "disabled" : ""}>Repay ${money(a)}</button>`).join("")}<button class="btn small secondary" data-act="repay" data-v="all" ${b.debt + b.edebt <= 0 || b.cash < 1 ? "disabled" : ""}>Repay all I can</button></div></div>
      <div class="card"><h3>🐷 You and the business</h3>
        <p class="hint">Business cash ${money(b.cash)}. Personal savings ${money(b.savings)}. ${b.structure === "solo" ? "As a sole proprietor, your savings back up the business, so they're at risk." : "Your company's problems can't touch your savings."}${corp ? " Money you take out of a corporation is taxed again (8%)." : ""}</p>
        <div class="row2">${[1000, 5000].map((a) => `<button class="btn small secondary" data-act="draw" data-v="${a}" ${b.cash < a ? "disabled" : ""}>Pay myself ${money(a)}</button>`).join("")}</div>
        <div class="row2" style="margin-top:6px">${[1000, 5000].map((a) => `<button class="btn small secondary" data-act="putin" data-v="${a}" ${b.savings < a ? "disabled" : ""}>Put in ${money(a)}</button>`).join("")}</div></div>
      <div class="card"><h3>☂️ Insurance</h3>
        <p class="hint">Costs about ${money(E.insurancePremium(b) || 100 + 0.014 * (b.hist.rev.length ? b.hist.rev.slice(-4).reduce((s, x) => s + x, 0) / Math.min(4, b.hist.rev.length) : 0))} a quarter and pays 75% of lawsuits, repairs and similar surprises.</p>
        <button class="btn small ${b.ins ? "go" : "secondary"}" data-act="ins">${b.ins ? "✅ Insured (tap to cancel)" : "Buy insurance"}</button></div>
      <div class="card"><h3>🥧 Investors</h3>
        ${corp ? `<p class="hint">Sell a slice of your company for cash. Investors own ${r0(b.inv * 100)}% so far (you can sell up to 45% total). Your company is valued around ${money(E.value(b))}.</p>
          <div class="row2">${[0.1, 0.2].map((p) => `<button class="btn small secondary" data-act="equity" data-v="${p}" ${b.inv + p > 0.45 ? "disabled" : ""}>Sell ${p * 100}% for ${money(E.investorOffer(b, p))}</button>`).join("")}</div>`
          : `<p class="hint">Only corporations can sell shares to investors. Incorporate in the Grow tab to unlock this.</p>`}</div>`;
  }

  function tabGrow() {
    const ec = E.EQUIP_COST[b.equip], exp = E.expandCost(b), sub = b.structure;
    const worth = E.ownerWorth(b, true);
    return `
      <div class="card"><h3>⚙️ Equipment</h3><p class="hint">Better equipment lets everyone make 18% more per level. <span class="pips">${"●".repeat(b.equip)}${"○".repeat(E.EQUIP_COST.length - b.equip)}</span></p>
        ${b.equip >= E.EQUIP_COST.length ? "<p><b>🏅 Fully equipped!</b></p>" : `<button class="btn small go" data-act="equip" ${b.cash < ec ? "disabled" : ""}>Upgrade for ${money(ec)}</button>`}</div>
      <div class="card"><h3>📍 Expand your market</h3>
        <p class="hint">You sell in: <b>${E.REACH_NAMES[b.reach]}</b>. A bigger market means many more customers but higher rent, head-office costs and you'll need a bigger team. People in the new place don't know you yet, so awareness drops.</p>
        ${exp == null ? "<p><b>🌎 You're everywhere!</b></p>" : `<button class="btn small go" data-act="expand" ${b.cash < exp ? "disabled" : ""}>Expand to ${E.REACH_NAMES[b.reach + 1]} for ${money(exp)}</button>`}</div>
      <div class="card"><h3>🏛️ Legal structure</h3>
        <div class="structs">${Object.entries(BB.structures).map(([k, s]) => {
          const can = k !== sub && !(sub === "corp") && !(k === "llc" && sub !== "solo") && !(k === "solo");
          return `<div class="struct ${sub === k ? "on" : ""}"><b>${s.emoji} ${esc(s.name)}</b> ${sub === k ? "✅ (you)" : ""}<p>${esc(s.text)}</p>${k === "solo" ? "" : `<small class="muted-s">Filing ${money(s.fee)} • ${money(s.quarterly)}/qtr • loans at ${(s.rate * 100).toFixed(1)}%</small>`}${can ? `<br><button class="btn small go" data-act="struct" data-v="${k}" ${b.cash < s.fee ? "disabled" : ""} style="margin-top:6px">Become ${esc(s.name)}</button>` : ""}</div>`;
        }).join("")}</div></div>
      <div class="card"><h3>🏁 Cash out</h3>
        ${b.qi >= 8 ? `<p class="hint">You can sell the whole business now. A buyer pays about 90% of its value. You'd walk away with roughly <b>${money(worth)}</b> in total.</p><button class="btn small gold" data-act="sell">Sell the business</button>` : `<p class="hint">You can sell your business after year 2 (the game also ends after 10 years).</p>`}</div>`;
  }

  // ---------------- actions ----------------
  function onAct(e) {
    const btn = e.target.closest("[data-act]");
    if (!btn || btn.disabled) return;
    const a = btn.dataset.act, v = btn.dataset.v, id = Number(btn.dataset.id);
    const q = [];
    if (a === "price") { b.plan.price = clamp(+(b.plan.price + Number(v)).toFixed(2), E.PRICE_MIN, E.PRICE_MAX); learn("demand", q); }
    else if (a === "mk") { b.plan.mk = Number(v); if (b.plan.mk) learn("marketing", q); }
    else if (a === "qt") { b.plan.qt = Number(v); }
    else if (a === "role") { ui.role = v; }
    else if (a === "hire") {
      const c = candidates(ui.role)[Number(v)];
      if (E.hire(b, c)) { ui.cands[ui.role].splice(Number(v), 1); learn("payroll", q); if (c.r === "manager") learn("delegation", q); }
    }
    else if (a === "fire") { E.fire(b, id); }
    else if (a === "raise") { E.raise(b, id); learn("morale", q); }
    else if (a === "equip") { E.buyEquip(b); }
    else if (a === "expand") { if (E.expand(b)) learn("scale", q); }
    else if (a === "struct") {
      if (E.setStructure(b, v)) { learn("liability", q); learn("llc", q); }
    }
    else if (a === "borrow") { E.borrow(b, Number(v)); learn("loan", q); }
    else if (a === "repay") { E.repay(b, v === "all" ? 1e9 : Number(v)); }
    else if (a === "draw") { E.payYourself(b, Number(v)); }
    else if (a === "putin") { E.putIn(b, Number(v)); }
    else if (a === "ins") { E.setInsurance(b, !b.ins); if (b.ins) learn("insurance", q); }
    else if (a === "equity") { if (E.sellEquity(b, Number(v))) learn("equity", q); }
    else if (a === "sell") {
      const worth = E.ownerWorth(b, true);
      openModal({ icon: "🏁", title: "Sell the business?", html: `<p class="result-text">A buyer will pay about 90% of your company's value. You'd finish with about ${money(worth)}. The game will end.</p>`,
        choices: [{ label: "Yes, sell it", cls: "gold", onClick: () => { b.savings += r0((1 - b.inv) * Math.max(0, E.value(b)) * 0.9); b.cash = 0; b.debt = 0; b.edebt = 0; b.over = "sold"; persist(); endScreen("sold"); } }, { label: "Keep going", cls: "secondary" }] });
      return;
    }
    persist();
    if (q.length) { rerender(); showQueue(q, null); } else rerender();
  }

  // ===================================================================
  // Running a quarter
  // ===================================================================
  function endQuarter() {
    const res = E.runQuarter(b, { ...b.plan });
    persist();
    resultsScreen(res);
  }

  function resultsScreen(res) {
    const t = T();
    const row = (label, val, cls) => (val ? `<tr class="${cls || ""}"><td>${label}</td><td>${val < 0 ? "−" : ""}${money(Math.abs(val))}</td></tr>` : "");
    const notes = [];
    if (res.lost > 0 && res.lost > 0.08 * res.demand) notes.push(["bad", `📦 About ${res.lost} customers wanted to buy but you didn't have the capacity. Lost sales!`]);
    else if (res.units >= res.capacity * 0.98 && res.demand <= res.capacity) notes.push(["good", "✅ You served everyone who came in."]);
    if (res.units < res.capacity * 0.5 && b.qi > 2) notes.push(["", `😴 You used only ${Math.round((res.units / Math.max(1, res.capacity)) * 100)}% of your capacity. Marketing or a better price could help.`]);
    const dRep = res.repAfter - res.repBefore;
    if (Math.abs(dRep) >= 1.5) notes.push([dRep > 0 ? "good" : "bad", `⭐ Reputation ${dRep > 0 ? "rose" : "fell"} to ${r0(res.repAfter)}.`]);
    if (res.nolUsed) notes.push(["good", `🧾 Earlier losses lowered your taxes by shielding ${money(res.nolUsed)} of profit.`]);
    res.quits.forEach((e) => notes.push(["bad", `👋 ${e.n} (${roleName(e.r)}) quit. You'll need to replace them.`]));
    res.skillUps.forEach((e) => notes.push(["good", `⭐ ${e.n} got better at their job and is now ${e.s} stars.`]));
    if (res.shortfall) {
      if (res.shortfall.savings) notes.push(["bad", `🐷 You ran short of cash, so ${money(res.shortfall.savings)} of YOUR personal savings went into the business. (Sole proprietors can lose their own money!)`]);
      if (res.shortfall.emergency) notes.push(["bad", `🚨 You took an emergency loan of ${money(res.shortfall.emergency)} at a high rate to cover your bills.`]);
      if (res.shortfall.rescued) notes.push(["bad", `🆘 You were out of money, so your family lent you ${money(res.shortfall.rescued)} as a one-time rescue. It adds to your debt, and there won't be a second rescue!`]);
      if (res.shortfall.bankrupt) notes.push(["bad", "💥 You couldn't pay your bills. The business has run out of money."]);
    }
    const q = [];
    learn("fixed", q);
    if (res.tax > 0) learn("taxes", q);
    if (res.lost > 0.1 * res.demand && res.lost > 5) learn("capacity", q);
    if (res.shortfall) learn("cashflow", q);
    if (res.quits.length) learn("morale", q);
    if (Math.abs(dRep) >= 3) learn("reputation", q);

    app.innerHTML = `
      <div class="card center">
        <p class="muted" style="margin:0">${esc(res.label)} • ${E.SEASON_NAMES[res.season]} results</p>
        <p class="muted" style="margin:0">Profit after taxes</p>
        <p class="big-num ${res.net >= 0 ? "pos" : "neg"}">${res.net < 0 ? "−" : ""}${money(Math.abs(res.net))}</p>
        <p class="muted-s" style="margin:0">${res.units.toLocaleString()} ${t.unit} sold${res.lost > 0 ? ` • ${res.lost.toLocaleString()} customers turned away` : ""}</p>
        <table class="ledger">
          <tr><td>Sales: ${res.units.toLocaleString()} × ${price2(res.price)}</td><td>${money(res.revenue)}</td></tr>
          ${row("Supplies &amp; materials", -res.cogs, "sub")}${row("Wages &amp; payroll", -res.payroll, "sub")}${row("Rent &amp; overhead", -res.rent, "sub")}
          ${row("Marketing", -res.marketing, "sub")}${row("Quality program", -res.quality, "sub")}${row("Insurance", -res.insurance, "sub")}${row("Legal &amp; filing fees", -res.fees, "sub")}${row("Loan interest", -res.interest, "sub")}
          <tr class="total"><td>Profit before taxes</td><td style="color:${res.profit >= 0 ? "var(--good)" : "var(--bad)"}">${res.profit < 0 ? "−" : ""}${money(Math.abs(res.profit))}</td></tr>
          ${row("Taxes", -res.tax, "sub")}
        </table>
        <p style="margin:0"><b>💵 Business cash now: ${money(b.cash)}</b></p>
        <div class="notes">${notes.map((n) => `<div class="${n[0]}">${esc(n[1])}</div>`).join("")}</div>
      </div>
      <div class="row2" style="margin-top:12px"><button class="btn go" id="contBtn" style="font-size:1.2rem;min-height:56px;flex:1 1 220px">${b.over === "bankrupt" ? "See what happened" : "Continue ▶"}</button></div>`;
    window.scrollTo({ top: 0 });
    document.getElementById("contBtn").onclick = () => showQueue(q, () => afterResults(res));
  }

  function newsItem(n) {
    if (n.type === "econ") {
      return n.phase === "boom" ? { icon: "📈", title: "The Economy Is Booming!", html: `<p class="result-text">People feel good about money and are spending more. Demand is up!</p>${tipBox("cycle")}` }
        : n.phase === "recession" ? { icon: "📉", title: "A Recession Begins", html: `<p class="result-text">People are worried about money and cutting back. Expect fewer customers for a while. Cash is king!</p>${tipBox("cycle")}` }
        : { icon: "📊", title: "The Economy Settles Down", html: `<p class="result-text">Things are back to normal. Customers are spending as usual.</p>` };
    }
    return { icon: "🥊", title: "Your Rival Is Struggling", html: `<p class="result-text">The competitor nearby has lost some steam. Customers are coming back to you.</p>` };
  }

  function afterResults(res) {
    if (b.over === "bankrupt") { persist(); return endScreen("bankrupt"); }
    const news = E.advance(b);
    const q = news.map(newsItem);
    news.forEach((n) => { if (n.type === "econ" && n.phase !== "normal") learn("cycle"); });
    if (b.qi >= E.TOTAL_Q) { persist(); return endScreen("retired"); }
    persist();
    const next = () => showQueue(q, runEvent);
    if (b.qi % 4 === 0) yearScreen(next); else next();
  }

  function runEvent() {
    const ev = E.rollEvent(b);
    if (!ev) { persist(); return mainScreen(); }
    persist();
    const q = [];
    const body = ev.text(b);
    openModal({
      icon: ev.icon, title: ev.title,
      html: `<p class="result-text">${esc(body)}</p><p class="muted">What will you do?</p>`,
      choices: ev.choices.map((c) => ({
        label: c.label, hint: c.hint, disabled: c.can ? !c.can(b) : false,
        onClick: () => {
          const result = c.run(b);
          persist();
          const tq = [];
          const evTipNew = ev.tip ? learn(ev.tip, tq) : false;     // the event's own tip is shown inside this result
          if (evTipNew) tq.shift();
          if (/personal savings/.test(result)) learn("liability", tq);
          openModal({
            icon: ev.icon, title: ev.title,
            html: `<p class="result-text">${esc(result)}</p>${evTipNew ? tipBox(ev.tip) : ""}`,
            choices: [{ label: "Continue", cls: "acc", onClick: () => { if (b.over === "sold") { persist(); return endScreen("sold"); } showQueue(tq, () => { persist(); mainScreen(); }); } }],
          });
        },
      })),
    });
  }

  // ===================================================================
  // Year summary
  // ===================================================================
  function chartBars(title, series, labels) {
    const W = 340, H = 170, L = 8, B = 28, T0 = 14, n = series.length;
    const max = Math.max(1, ...series.map((s) => Math.max(s.rev, s.prof))), min = Math.min(0, ...series.map((s) => s.prof));
    const ys = (v) => T0 + (1 - (v - min) / (max - min || 1)) * (H - T0 - B);
    const bw = (W - L * 2) / n;
    const bars = series.map((s, i) => `<rect x="${L + i * bw + 3}" y="${ys(Math.max(0, s.rev))}" width="${bw - 6}" height="${Math.max(1, ys(0) - ys(Math.max(0, s.rev)))}" fill="#9ad1cb"/>
      <circle cx="${L + i * bw + bw / 2}" cy="${ys(s.prof)}" r="5" fill="${s.prof >= 0 ? "#1b9a5c" : "#e2463b"}" stroke="#fff" stroke-width="1.5"/>
      <text x="${L + i * bw + bw / 2}" y="${H - 8}" font-size="10" text-anchor="middle" fill="#6b6878">${labels[i]}</text>`).join("");
    return `<div class="chart-box"><h4>${title}</h4><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}"><line x1="${L}" x2="${W - L}" y1="${ys(0)}" y2="${ys(0)}" stroke="#cfe3e0"/>${bars}</svg>
      <p class="muted-s" style="margin:2px 0 0">Bars: sales. Dots: profit (green = made money, red = lost money).</p></div>`;
  }

  function yearScreen(done) {
    const n = Math.min(8, b.hist.rev.length);
    const series = b.hist.rev.slice(-n).map((r, i) => ({ rev: r, prof: b.hist.prof.slice(-n)[i] }));
    const labels = series.map((_, i) => { const qi = b.qi - n + i; return `Y${Math.floor(qi / 4) + 1}Q${(qi % 4) + 1}`; });
    const y = E.year(b) - 1;
    const rev = E.annual(b, "rev"), prof = E.annual(b, "prof");
    const prevRev = b.hist.rev.slice(-8, -4).reduce((s, x) => s + x, 0);
    app.innerHTML = `
      <div class="card center">
        <div style="font-size:3rem">📅</div>
        <h2 class="title" style="font-size:2rem">Year ${y} Report</h2>
        <p class="result-text" style="margin:4px 0">${esc(b.biz)} • ${stageName()}</p>
        <div class="end-stats">
          <div><b>${money(rev)}</b>sales this year${prevRev ? `<br><small>${rev >= prevRev ? "▲" : "▼"} ${Math.abs(r0((rev / prevRev - 1) * 100))}% vs last year</small>` : ""}</div>
          <div><b style="color:${prof >= 0 ? "var(--good)" : "var(--bad)"}">${money(prof)}</b>profit (before taxes)</div>
          <div><b>${b.staff.length}</b>on your team</div>
          <div><b>${money(E.ownerWorth(b))}</b>you're worth</div>
        </div>
        ${chartBars("Last " + n + " quarters", series, labels)}
        <button class="btn go" id="yrBtn" style="margin-top:6px">Start year ${y + 1} ▶</button>
      </div>`;
    window.scrollTo({ top: 0 });
    document.getElementById("yrBtn").onclick = done;
  }

  // ===================================================================
  // The end
  // ===================================================================
  function chartWorth() {
    const pts = b.hist.worth.length ? b.hist.worth : [E.ownerWorth(b)];
    if (pts.length < 2 || Math.max(...pts) <= 0) return "";
    const W = 340, H = 160, L = 50, B = 22, T0 = 10, R = 8;
    const max = Math.max(...pts) * 1.05, min = Math.min(0, ...pts);
    const xs = (i) => L + (i / (pts.length - 1)) * (W - L - R), ys = (v) => T0 + (1 - (v - min) / (max - min || 1)) * (H - T0 - B);
    const line = pts.map((v, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
    const k = (v) => (v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "M" : "$" + Math.round(v / 1000) + "k");
    return `<div class="chart-box"><h4>🏆 What you were worth over time</h4><svg viewBox="0 0 ${W} ${H}"><line x1="${L}" x2="${W - R}" y1="${ys(0)}" y2="${ys(0)}" stroke="#cfe3e0"/>
      <text x="${L - 4}" y="${ys(0) + 4}" font-size="10" text-anchor="end" fill="#6b6878">$0</text><text x="${L - 4}" y="${ys(max) + 10}" font-size="10" text-anchor="end" fill="#6b6878">${k(max)}</text>
      <path d="${line}" fill="none" stroke="#0f766e" stroke-width="3" stroke-linejoin="round"/>
      <text x="${L}" y="${H - 5}" font-size="10" fill="#6b6878">Start</text><text x="${W - R}" y="${H - 5}" font-size="10" text-anchor="end" fill="#6b6878">End</text></svg></div>`;
  }

  function endScreen(how) {
    closeModal();
    const sc = E.score(b, how);
    const n = how === "bankrupt" ? 0 : STAR_GOALS.filter((g) => sc.worth >= g).length;
    const years = how === "retired" ? E.TOTAL_Q / 4 : (b.qi / 4).toFixed(1).replace(/\.0$/, "");
    const heading = how === "bankrupt" ? { i: "💥", t: "The Business Closed", s: "Many real businesses fail. What matters is what you learn." }
      : how === "sold" ? { i: "🤝", t: "You Sold the Business!", s: `You cashed out${b.flags.soldFor ? ` for ${money(b.flags.soldFor)}` : ""}.` }
      : { i: "🎉", t: "Ten Years Complete!", s: "You built a business and kept it going for a decade." };
    // remember this run (once)
    if (!b.flags.recorded) { b.runs.push({ biz: b.biz, ty: b.type, w: sc.worth, how, y: years }); b.runs = b.runs.slice(-5); b.flags.recorded = 1; b.over = how; persist(); }
    app.innerHTML = `
      <div class="card center">
        <div style="font-size:3rem">${heading.i}</div>
        <h2 class="title" style="font-size:2rem">${heading.t}</h2>
        <p class="muted" style="margin:2px 0 8px">${heading.s}</p>
        <div style="font-size:2rem;color:var(--gold);letter-spacing:4px">${stars(n)}</div>
        <p class="result-text" style="margin:2px 0">${esc(TITLES[n])}</p>
        <p class="big-num accent">${money(sc.worth)}</p><p class="muted" style="margin:0">you finished with${how === "bankrupt" ? " (your personal savings)" : ""}</p>
        <div class="end-stats">
          <div><b>${years}</b>years in business</div>
          <div><b>${b.stats.peakStaff}</b>most people on your team</div>
          <div><b>${money(b.stats.totalRev)}</b>total sales</div>
          <div><b>${BB.structures[b.structure].name}</b>how you ended up</div>
          <div><b>${E.REACH_NAMES[b.reach]}</b>market you reached</div>
          <div><b>${b.tips.length}</b>business tips learned</div>
        </div>
        ${how === "bankrupt" ? `<div class="advice" style="text-align:left">💡 What went wrong? Look at whether you grew faster than your cash could handle, whether costs were too high for your sales, and whether a rainy-day cushion would have helped.${b.structure === "solo" ? " As a sole proprietor, your personal savings were used to try to keep going." : ""}</div>` : ""}
        ${chartWorth()}
        <p class="muted">Ready to test what you learned?</p>
        <div class="row2" style="justify-content:center"><button class="btn go" id="quizBtn">Take the Business Quiz 📝</button><button class="btn acc" id="againBtn">Start a new business</button></div>
        ${b.runs.length > 1 ? `<p class="muted-s" style="margin:12px 0 0">Your past businesses: ${b.runs.slice(0, -1).map((r) => `${BB.types[r.ty].emoji} ${esc(r.biz)} (${money(r.w)})`).join(" • ")}</p>` : ""}
      </div>`;
    window.scrollTo({ top: 0 });
    document.getElementById("quizBtn").onclick = quizScreen;
    document.getElementById("againBtn").onclick = () => pickBusinessScreen({ id: b.id, name: b.name, av: b.av, runs: b.runs, tips: b.tips });
  }

  function quizScreen() {
    const questions = shuffle(BB.quiz).slice(0, 6);
    let i = 0, right = 0;
    function show() {
      if (i >= questions.length) return finish();
      const q = questions[i];
      const answers = shuffle(q.a.map((text, idx) => ({ text, correct: idx === 0 })));
      app.innerHTML = `<div class="card"><p class="muted" style="margin:0">Question ${i + 1} of ${questions.length}</p>
        <h2 style="color:var(--acc);margin:6px 0 16px">${esc(q.q)}</h2>
        <div style="display:flex;flex-direction:column;gap:10px">${answers.map((a, n) => `<button class="btn secondary quiz-option" data-n="${n}">${esc(a.text)}</button>`).join("")}</div><div id="explain"></div></div>`;
      app.querySelectorAll("[data-n]").forEach((btn) => {
        btn.onclick = () => {
          const chosen = answers[Number(btn.dataset.n)];
          app.querySelectorAll("[data-n]").forEach((x) => { x.disabled = true; if (answers[Number(x.dataset.n)].correct) x.classList.add("correct"); });
          if (chosen.correct) right++; else btn.classList.add("incorrect");
          document.getElementById("explain").innerHTML = `<p class="result-text" style="margin-top:14px">${chosen.correct ? "✅ Correct!" : "❌ Not quite."} ${esc(q.explain)}</p><button class="btn go" id="nextQ">${i + 1 < questions.length ? "Next question ▶" : "See my score"}</button>`;
          document.getElementById("nextQ").onclick = () => { i++; show(); };
        };
      });
    }
    function finish() {
      const st = right >= 6 ? 3 : right >= 4 ? 2 : right >= 2 ? 1 : 0;
      app.innerHTML = `<div class="card center"><div style="font-size:3rem;letter-spacing:6px">${"⭐".repeat(st)}${"☆".repeat(3 - st)}</div>
        <h2 style="color:var(--acc);margin:6px 0">You got ${right} out of ${questions.length}!</h2>
        <p>${st === 3 ? "You think like a real entrepreneur!" : st === 2 ? "Great work! You know your business basics." : "Nice try! Start another business to learn more."}</p>
        <div class="row2" style="justify-content:center"><button class="btn acc" id="againBtn">Start a new business</button><button class="btn secondary" id="backBtn">Back to my results</button></div></div>`;
      document.getElementById("againBtn").onclick = () => pickBusinessScreen({ id: b.id, name: b.name, av: b.av, runs: b.runs, tips: b.tips });
      document.getElementById("backBtn").onclick = () => endScreen(b.over || "retired");
    }
    show();
  }

  window.BB_DEBUG = () => ({ b, E, mainScreen, persist });
  profileScreen();
})();
