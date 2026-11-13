// Stand Tycoon — game engine
(function () {
  "use strict";

  const app = document.getElementById("app");

  const TOTAL_DAYS = 20;
  const START_CASH = 50;
  const BASE_COST = 0.8;      // ingredient cost per serving
  const BASE_RENT = 6;
  const BASE_TRAFFIC = 28;    // people who walk past on an average day
  const BASE_REF = 3.0;       // what the average customer will pay on a cloudy day
  const BASE_CAPACITY = 30;   // servings you can make in a day
  const STAR_GOALS = [200, 350, 500]; // net profit needed for 1, 2, 3 stars

  const PRODUCTS = {
    smoothie: { emoji: "🥤", one: "smoothie", many: "smoothies", name: "Smoothie" },
    lemonade: { emoji: "🍋", one: "lemonade", many: "lemonades", name: "Lemonade" },
    cookie: { emoji: "🍪", one: "cookie", many: "cookies", name: "Cookie" },
  };

  const WEATHER = {
    sunny: { emoji: "☀️", label: "Sunny", traffic: 1.2, wtp: 0.3, weight: 30, hint: "Nice weather brings out more customers." },
    hot: { emoji: "🔥", label: "Hot", traffic: 1.5, wtp: 0.8, weight: 20, hint: "Hot! Lots of thirsty people who will pay more." },
    cloudy: { emoji: "☁️", label: "Cloudy", traffic: 1.0, wtp: 0, weight: 25, hint: "An ordinary day." },
    rainy: { emoji: "🌧️", label: "Rainy", traffic: 0.6, wtp: -0.4, weight: 15, hint: "Rain keeps customers home, so expect fewer." },
    cold: { emoji: "🥶", label: "Chilly", traffic: 0.7, wtp: -0.7, weight: 10, hint: "Chilly. People want drinks less, so they'll pay less." },
  };

  const ADS = {
    none: { name: "No advertising", cost: 0, mult: 1, desc: "Save your money." },
    flyers: { name: "Hand out flyers", cost: 5, mult: 1.2, desc: "About 20% more people notice you." },
    mascot: { name: "Mascot on the corner", cost: 14, mult: 1.45, desc: "About 45% more people notice you." },
  };

  const UPGRADES = {
    equipment: { emoji: "⚙️", name: "Pro Equipment", cost: 40, desc: "Serve up to 55 a day instead of 30. Great when it's busy!" },
    banner: { emoji: "🎏", name: "Big Banner", cost: 30, desc: "20% more people notice your stand every day." },
    storage: { emoji: "🧊", name: "Cooler", cost: 25, desc: "Keeps up to 15 unsold servings fresh for the next day." },
    recipe: { emoji: "⭐", name: "Secret Recipe", cost: 45, desc: "Customers will pay about $0.60 more, but ingredients cost $0.20 more." },
  };

  const PEOPLE = ["🧒", "👧", "👦", "👩", "👨", "🧑", "👵", "🧓", "👱", "🧔"];

  let s = null;        // game state
  let timers = [];     // animation timers

  // ===================================================================
  // Helpers
  // ===================================================================
  const rand = () => Math.random();
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const fmt = (n) => (n < -0.004 ? "-" : "") + "$" + Math.abs(n).toFixed(2);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const round2 = (n) => Math.round(n * 100) / 100;
  const P = () => PRODUCTS[s.product];

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }

  function modActive(m) { return s.day >= m.from && s.day <= m.until; }
  function modProduct(key) { return s.mods.filter((m) => m.key === key && modActive(m)).reduce((p, m) => p * m.value, 1); }
  function modSum(key) { return s.mods.filter((m) => m.key === key && modActive(m)).reduce((p, m) => p + m.value, 0); }
  function modValue(key) { const m = s.mods.find((m) => m.key === key && modActive(m)); return m ? m.value : null; }
  function rivalActive() { return s.rival && s.day <= s.rival.until; }

  function pickWeather() {
    const forced = modValue("weather");
    if (forced) return forced;
    const total = Object.values(WEATHER).reduce((t, w) => t + w.weight, 0);
    let r = rand() * total;
    for (const [k, w] of Object.entries(WEATHER)) { r -= w.weight; if (r <= 0) return k; }
    return "cloudy";
  }

  function costPerServing() {
    if (s.costOverride != null) return s.costOverride;
    return round2((BASE_COST * modProduct("cost") + (s.up.recipe ? 0.2 : 0)) * s.inflation);
  }
  function capacity() { return BASE_CAPACITY + (s.up.equipment ? 25 : 0); }
  function trafficMult() { return WEATHER[s.weather].traffic * modProduct("traffic") * (s.up.banner ? 1.2 : 1) * ADS[s.plan.ad].mult; }
  function refPrice() { return BASE_REF + WEATHER[s.weather].wtp + (s.up.recipe ? 0.6 : 0) + modSum("wtp"); }

  function unlock(id) {
    if (s.concepts.includes(id)) return false;
    s.concepts.push(id);
    return true;
  }
  function conceptBox(id) {
    const c = EC.concepts[id];
    return `<div class="fact"><b>${c.icon} Econ word: ${esc(c.title)}</b>${esc(c.text)}</div>`;
  }

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

  // ===================================================================
  // Title + setup
  // ===================================================================
  function titleScreen() {
    clearTimers();
    closeModal();
    let product = "smoothie";
    app.innerHTML = `
      <div class="card">
        <div class="center">
          <h2 class="title">Stand Tycoon</h2>
          <p class="muted" style="margin:4px 0 12px">Start a business and see if you can make a profit!</p>
        </div>
        <p>You have <b>${fmt(START_CASH)}</b> and <b>${TOTAL_DAYS} days</b> to turn it into as much money as you can. Every morning you will:</p>
        <ul style="margin:0 0 14px;padding-left:22px">
          <li><b>Buy ingredients</b> (too few and you miss sales, too many and they spoil)</li>
          <li><b>Set your price</b> (too high and customers walk away, too low and you earn less)</li>
          <li><b>Read the news</b> and decide how to react</li>
        </ul>
        <h3 class="section-title">1. What do you sell?</h3>
        <div class="choice-row" id="products">
          ${Object.entries(PRODUCTS).map(([k, p]) => `<button class="pill" data-p="${k}">${p.emoji} ${p.name}s</button>`).join("")}
        </div>
        <h3 class="section-title">2. Name your stand</h3>
        <input type="text" id="standName" maxlength="22" value="">
        <button class="btn green block" id="startBtn" style="font-size:1.2rem">Open for business! ▶</button>
        <p class="muted center" id="bestLine" style="margin:12px 0 0"></p>
      </div>`;
    const nameBox = document.getElementById("standName");
    const defaults = { smoothie: "Sunny Smoothies", lemonade: "Lucky Lemonade", cookie: "Cookie Corner" };
    function refresh() {
      app.querySelectorAll("[data-p]").forEach((b) => b.classList.toggle("on", b.dataset.p === product));
      if (!nameBox.dataset.edited) nameBox.value = defaults[product];
    }
    nameBox.addEventListener("input", () => (nameBox.dataset.edited = "1"));
    app.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => { product = b.dataset.p; refresh(); }));
    refresh();
    try {
      const best = Number(localStorage.getItem("econ-best"));
      if (best) document.getElementById("bestLine").textContent = `🏆 Your best profit so far: ${fmt(best)}`;
    } catch (e) { /* storage blocked */ }
    document.getElementById("startBtn").onclick = () => newGame(product, nameBox.value.trim() || defaults[product]);
  }

  function newGame(product, name) {
    s = {
      product, name,
      day: 1, cash: START_CASH, loans: 0,
      stock: 0, rent: BASE_RENT, inflation: 1,
      up: { equipment: false, banner: false, storage: false, recipe: false },
      mods: [], rival: null, concepts: [], history: [],
      costOverride: null, minBuy: 0, pendingBuy: null,
      lastBuy: 20, lastPrice: 3,
      plan: { buy: 20, price: 3, ad: "none" },
      weather: "cloudy",
    };
    unlock("profit");
    openModal({
      icon: "💰", title: `Welcome to ${name}!`,
      html: `<p class="result-text">You're open for business with ${fmt(START_CASH)} in the bank.</p>${conceptBox("profit")}`,
      choices: [{ label: "Let's go!", cls: "green", onClick: startDay }],
    });
  }

  // ===================================================================
  // Morning
  // ===================================================================
  function startDay() {
    s.costOverride = null;
    s.minBuy = 0;
    s.weather = pickWeather();
    const queue = [];

    // Grandma helps if you are broke with nothing to sell
    if (s.cash < 8 && s.stock === 0 && s.loans < 75) {
      s.cash += 25; s.loans += 25;
      const first = unlock("debt");
      queue.push({ icon: "👵", title: "Grandma to the Rescue", html: `<p class="result-text">You're almost out of money, so Grandma lends you $25.</p><p>You'll need to pay it back: it will be subtracted from your final score.</p>${first ? conceptBox("debt") : ""}` });
    }

    const evId = EC.schedule[s.day];
    if (evId) {
      const ev = EC.events[evId];
      unlock(ev.concept);
      if (ev.apply) ev.apply(s);
      s.weather = pickWeather(); // an event may force the weather
      const extra = conceptBox(ev.concept);
      if (ev.choices) {
        queue.push({
          icon: ev.icon, title: ev.title, html: `<p class="result-text">${esc(ev.text)}</p>${extra}`,
          choices: ev.choices.map((c) => ({
            label: c.label, hint: c.hint, disabled: c.disabled ? c.disabled(s) : false,
            onClick: () => {
              const result = c.run(s);
              s.eventNote = result;
              openModal({ icon: ev.icon, title: ev.title, html: `<p class="result-text">${esc(result)}</p>`, choices: [{ label: "Continue", onClick: () => showQueue([], beginPlan) }] });
            },
          })),
        });
      } else {
        queue.push({ icon: ev.icon, title: ev.title, html: `<p class="result-text">${esc(ev.text)}</p>${extra}`, choices: [{ label: "Got it!" }] });
        s.eventNote = ev.text;
      }
      s.todayEvent = ev;
    } else {
      s.todayEvent = null; s.eventNote = null;
    }
    showQueue(queue, beginPlan);
  }

  // show modals one at a time; the last one with choices handles its own continuation
  function showQueue(queue, done) {
    if (!queue.length) return done();
    const m = queue.shift();
    const hasChoices = !!m.choices && m.choices.length > 1;
    if (hasChoices) { openModal(m); return; } // choice modal continues by itself
    openModal({ ...m, choices: [{ label: (m.choices && m.choices[0].label) || "Continue", onClick: () => showQueue(queue, done) }] });
  }

  function beginPlan() {
    const cps = costPerServing();
    let buy = s.pendingBuy != null ? s.pendingBuy : s.lastBuy;
    s.pendingBuy = null;
    buy = Math.max(s.minBuy, buy);
    while (buy > 0 && buy * cps > s.cash) buy--;
    s.plan = { buy, price: s.lastPrice, ad: "none" };
    planScreen();
  }

  function planScreen() {
    clearTimers();
    closeModal();
    const p = s.plan, w = WEATHER[s.weather], pr = P();
    const cps = costPerServing();
    const ad = ADS[p.ad];
    const maxBuy = Math.max(0, Math.floor((s.cash - ad.cost + 1e-9) / cps));
    p.buy = clamp(p.buy, 0, maxBuy);
    const buyCost = round2(p.buy * cps);
    const available = s.stock + p.buy;
    const cashLeft = round2(s.cash - buyCost - ad.cost);
    const profitPer = round2(p.price - cps);
    const last = s.history[s.history.length - 1];
    const dayWord = s.day === TOTAL_DAYS ? "Final day!" : `Day ${s.day} of ${TOTAL_DAYS}`;

    app.innerHTML = `
      <div class="scene weather-${s.weather}">
        ${s.weather === "rainy" ? '<div class="rain"></div>' : ""}
        <div class="daytag">${dayWord}</div>
        <div class="wx" title="${w.label}">${w.emoji}</div>
        <div class="ground"></div><div class="road"></div>
        <div class="stand"><div class="awning"></div><div class="counter"><span class="item">${pr.emoji}</span>${esc(s.name)}</div></div>
      </div>

      <div class="stat-row">
        <div><small>💵 Cash</small><b>${fmt(s.cash)}</b></div>
        <div><small>${w.emoji} Today's weather</small><b>${w.label}</b></div>
        <div><small>📦 Left over</small><b>${s.stock} ${pr.many}</b></div>
        <div><small>🏠 Rent today</small><b>${fmt(s.rent)}</b></div>
      </div>
      <p class="muted" style="margin:-4px 4px 12px">${w.hint}</p>

      ${s.eventNote ? `<div class="news"><b>${s.todayEvent ? s.todayEvent.icon + " " + esc(s.todayEvent.title) : "📰 News"}:</b> ${esc(s.eventNote)}</div>` : ""}
      ${rivalActive() ? `<div class="news rival"><b>🏪 Rival stand:</b> they sell for ${fmt(s.rival.price)}. Customers may go there if you charge more.</div>` : ""}
      ${last ? `<p class="muted" style="margin:0 4px 12px">Yesterday: you charged ${fmt(last.price)} and sold ${last.sold} for a profit of <b>${fmt(last.profit)}</b>.</p>` : ""}

      <div class="panels">
        <div class="card">
          <h3>🛒 1. Buy ingredients</h3>
          <p class="hint">${fmt(cps)} per ${pr.one}. Unsold ingredients spoil overnight${s.up.storage ? " (except what fits in your cooler)" : ""}.${s.minBuy ? ` <b>Bulk deal: buy at least ${s.minBuy}.</b>` : ""}</p>
          <div class="stepper">
            <button data-buy="-10" ${p.buy <= s.minBuy ? "disabled" : ""}>-10</button><button data-buy="-1" ${p.buy <= s.minBuy ? "disabled" : ""}>-1</button>
            <span class="val">${p.buy}</span>
            <button data-buy="1" ${p.buy >= maxBuy ? "disabled" : ""}>+1</button><button data-buy="10" ${p.buy >= maxBuy ? "disabled" : ""}>+10</button>
          </div>
          <p class="mini">Cost: <b>${fmt(buyCost)}</b> • You'll have <b>${available}</b> to sell<br>Your stand can serve up to <b>${capacity()}</b> a day.</p>
        </div>

        <div class="card">
          <h3>🏷️ 2. Set your price</h3>
          <p class="hint">Each customer decides if it's worth it to them.</p>
          <div class="stepper">
            <button data-price="-0.5">-50¢</button><button data-price="-0.25">-25¢</button>
            <span class="val">${fmt(p.price)}</span>
            <button data-price="0.25">+25¢</button><button data-price="0.5">+50¢</button>
          </div>
          <p class="mini">Profit on each one you sell: <b style="color:${profitPer >= 0 ? "var(--good)" : "var(--bad)"}">${fmt(profitPer)}</b></p>
        </div>

        <div class="card">
          <h3>📣 3. Advertising</h3>
          <p class="hint">Helps more people notice your stand today.</p>
          ${Object.entries(ADS).map(([k, a]) => `<button class="ad-opt ${p.ad === k ? "on" : ""}" data-ad="${k}"><span>${a.name}<small>${a.desc}</small></span><b>${a.cost ? fmt(a.cost) : "Free"}</b></button>`).join("")}
        </div>
      </div>

      <div class="card">
        <div class="summary">
          <span>Ingredients: ${fmt(buyCost)}</span>
          <span>Advertising: ${fmt(ad.cost)}</span>
          <span>Rent (paid tonight): ${fmt(s.rent)}</span>
          <span>Cash after buying: ${fmt(cashLeft)}</span>
        </div>
        <div class="action-row">
          <button class="btn green open" id="openBtn">Open the stand! ${pr.emoji}</button>
          <button class="btn secondary" id="shopBtn">🛠️ Upgrades</button>
          <button class="btn secondary" id="dictBtn">📖 Econ words (${s.concepts.length})</button>
        </div>
      </div>`;

    app.querySelectorAll("[data-buy]").forEach((b) => (b.onclick = () => { p.buy = clamp(p.buy + Number(b.dataset.buy), s.minBuy, maxBuy); planScreen(); }));
    app.querySelectorAll("[data-price]").forEach((b) => (b.onclick = () => { p.price = clamp(round2(p.price + Number(b.dataset.price)), 0.5, 8); planScreen(); }));
    app.querySelectorAll("[data-ad]").forEach((b) => (b.onclick = () => { p.ad = b.dataset.ad; planScreen(); }));
    document.getElementById("shopBtn").onclick = () => shopModal(planScreen);
    document.getElementById("dictBtn").onclick = () => dictModal();
    document.getElementById("openBtn").onclick = openStand;
  }

  function dictModal() {
    openModal({
      icon: "📖", title: "Econ Words",
      html: `<p class="muted">Ideas you've discovered so far:</p><ul class="dict">${s.concepts.map((id) => `<li><b>${EC.concepts[id].icon} ${esc(EC.concepts[id].title)}</b><br>${esc(EC.concepts[id].text)}</li>`).join("")}</ul>`,
      choices: [{ label: "Close", cls: "secondary" }],
    });
  }

  function shopModal(back) {
    const rows = Object.entries(UPGRADES).map(([k, u]) => `
      <div class="shop-item"><div class="em">${u.emoji}</div>
        <div><b>${u.name}</b> — ${s.up[k] ? "✅ You own this" : fmt(u.cost)}<small>${u.desc}</small></div></div>`).join("");
    const choices = Object.entries(UPGRADES).filter(([k]) => !s.up[k]).map(([k, u]) => ({
      label: `Buy ${u.name} (${fmt(u.cost)})`, disabled: s.cash < u.cost, cls: "green",
      hint: s.cash < u.cost ? "Not enough cash yet" : "",
      onClick: () => {
        s.cash = round2(s.cash - u.cost); s.up[k] = true;
        const first = unlock("investment");
        const done = () => shopModal(back);
        if (first) openModal({ icon: "🏗️", title: `You bought ${u.name}!`, html: `<p class="result-text">${fmt(u.cost)} spent today could grow your profit later. Will it pay for itself?</p>${conceptBox("investment")}`, choices: [{ label: "Continue", onClick: done }] });
        else done();
      },
    }));
    choices.push({ label: "Close the shop", cls: "secondary", onClick: back });
    openModal({
      icon: "🛠️", title: "Upgrade Shop",
      html: `<p class="muted">You have <b>${fmt(s.cash)}</b>. Upgrades cost money now but may earn it back. Think about your opportunity cost!</p>${rows}`,
      choices,
    });
  }

  // ===================================================================
  // Running the day
  // ===================================================================
  function simulate() {
    const p = s.plan, cps = costPerServing();
    const n = Math.round(BASE_TRAFFIC * trafficMult() * (0.9 + rand() * 0.2));
    const ref = refPrice();
    const rival = rivalActive() ? s.rival.price : null;
    const cap = capacity();
    let stock = s.stock + p.buy;
    const startStock = stock;
    const log = [];
    const r = { n, sold: 0, tooPricey: 0, soldOut: 0, line: 0, rival: 0, willing: 0 };
    for (let i = 0; i < n; i++) {
      const wtp = ref + (rand() + rand() + rand() - 1.5) * 1.4;
      let type;
      if (rival != null && rival < p.price && wtp >= rival && rand() < 0.5) { type = "rival"; r.rival++; }
      else if (wtp < p.price) { type = "pricey"; r.tooPricey++; }
      else if (r.sold >= cap) { type = "line"; r.line++; r.willing++; }
      else if (stock <= 0) { type = "soldout"; r.soldOut++; r.willing++; }
      else { type = "bought"; r.sold++; stock--; r.willing++; }
      log.push(type);
    }
    r.log = log;
    r.revenue = round2(r.sold * p.price);
    r.ingredientCost = round2(p.buy * cps);
    r.adCost = ADS[p.ad].cost;
    r.rent = s.rent;
    r.profit = round2(r.revenue - r.ingredientCost - r.adCost - r.rent);
    const unsold = startStock - r.sold;
    const keep = s.up.storage ? Math.min(15, unsold) : 0;
    r.kept = keep; r.spoiled = unsold - keep;
    r.share = n - r.rival > 0 ? r.willing / (n - r.rival) : 0; // share of customers who'd buy at this price
    r.startStock = startStock;
    return r;
  }

  function openStand() {
    const p = s.plan, cps = costPerServing();
    s.cash = round2(s.cash - p.buy * cps - ADS[p.ad].cost);
    s.lastBuy = p.buy; s.lastPrice = p.price;
    const r = simulate();
    animateDay(r);
  }

  function animateDay(r) {
    const pr = P();
    app.innerHTML = `
      <div class="scene weather-${s.weather}" id="scene">
        ${s.weather === "rainy" ? '<div class="rain"></div>' : ""}
        <div class="daytag">Day ${s.day} • Open!</div>
        <div class="wx">${WEATHER[s.weather].emoji}</div>
        <div class="ground"></div><div class="road"></div>
        <div class="stand"><div class="awning"></div><div class="counter"><span class="item">${pr.emoji}</span>${esc(s.name)}</div></div>
        <div class="lane" id="lane"></div>
      </div>
      <div class="card">
        <div class="tally">
          <div><small>Customers</small><span id="tCust">0</span> / ${r.n}</div>
          <div><small>${pr.many} sold</small><span id="tSold">0</span></div>
          <div><small>Money earned</small><span id="tMoney">$0.00</span></div>
          <div><small>Stock left</small><span id="tStock">${r.startStock}</span></div>
        </div>
        <div class="center" style="margin-top:12px"><button class="btn secondary small" id="skipBtn">⏩ Skip to the results</button></div>
      </div>`;
    const lane = document.getElementById("lane");
    const interval = clamp(6500 / Math.max(1, r.n), 60, 220);
    let i = 0, sold = 0;
    const bubbles = {
      bought: ["Yum! 😋", "Yes please!", "Great price!", "Yay! 🎉"],
      pricey: ["Too pricey! 💸", "Too expensive!", "No thanks…", "Hmm, too much"],
      soldout: ["Sold out! 😢", "You ran out!", "Aww, none left"],
      line: ["Line's too long", "Too slow! ⏳"],
      rival: ["Going across the street 🏪", "Rival is cheaper!"],
    };
    const cls = { bought: "yes", pricey: "no", soldout: "no", line: "meh", rival: "meh" };

    function finish() { clearTimers(); reportScreen(r); }
    document.getElementById("skipBtn").onclick = finish;

    function step() {
      if (i >= r.log.length) return later(finish, 900);
      const type = r.log[i++];
      const el = document.createElement("div");
      el.className = "cust";
      el.style.setProperty("--dur", "0.6s");
      const txt = bubbles[type][Math.floor(rand() * bubbles[type].length)];
      el.innerHTML = `${PEOPLE[Math.floor(rand() * PEOPLE.length)]}<span class="bubble ${cls[type]}">${txt}</span>`;
      lane.appendChild(el);
      later(() => {
        el.classList.add("show");
        if (type === "bought") {
          sold++;
          document.getElementById("tSold").textContent = sold;
          document.getElementById("tMoney").textContent = fmt(sold * s.plan.price);
          document.getElementById("tStock").textContent = Math.max(0, r.startStock - sold);
        }
        document.getElementById("tCust").textContent = i;
      }, 600);
      later(() => el.classList.add("gone"), 1300);
      later(() => el.remove(), 1750);
      later(step, interval);
    }
    step();
  }

  // ===================================================================
  // Day report
  // ===================================================================
  function coachTip(r) {
    const pr = P();
    if (r.soldOut >= 4) return { t: "You ran out of stock!", x: `${r.soldOut} customers wanted to buy but you had none left. Missed sales are lost money. Next time, buy more ingredients if you think it will be busy.` };
    if (r.line >= 4) return { t: "Your line was too long!", x: `${r.line} customers left because you couldn't serve them fast enough. A "Pro Equipment" upgrade raises how many you can serve in a day.` };
    if (r.tooPricey > r.sold && r.tooPricey >= 8) return { t: "Your price might be too high", x: `${r.tooPricey} customers thought it cost too much. Try lowering the price a bit. A few more sales can be worth more than a few extra cents each.` };
    if (r.spoiled >= 6) return { t: "Waste alert 🗑️", x: `${r.spoiled} ${pr.many} spoiled, and you paid for every one. Try buying a little less next time.` };
    if (r.rival >= 4) return { t: "The rival stole customers", x: `${r.rival} customers went across the street because it was cheaper. Competition means you have to think about what your customers have as an alternative.` };
    if (r.tooPricey <= 2 && r.sold > 5 && r.soldOut === 0) return { t: "Your price may be too low", x: `Almost everyone bought, so customers would likely pay more. Try raising your price a bit and watch what happens.` };
    if (r.profit >= 50) return { t: "Great day! 🌟", x: "Your price, stock and the weather worked well together. Remember what you did!" };
    if (r.profit < 0) return { t: "A loss today", x: "You spent more than you earned. Compare your price with what each one costs you, and check how many you actually sold." };
    return { t: "Keep experimenting", x: "Try changing your price a little each day and watch how many customers buy. That's how real business owners learn." };
  }

  function reportScreen(r) {
    const pr = P();
    // bookkeeping
    s.cash = round2(s.cash + r.revenue - r.rent);
    s.stock = r.kept;
    s.history.push({
      day: s.day, price: s.plan.price, sold: r.sold, revenue: r.revenue, profit: r.profit, weather: s.weather,
      soldOut: r.soldOut, spoiled: r.spoiled, share: r.share, n: r.n, cash: s.cash, rival: rivalActive(),
    });
    const spoilNew = r.spoiled > 0 && unlock("inventory");
    const tip = coachTip(r);
    const last = s.day >= TOTAL_DAYS;

    const tags = [];
    if (r.tooPricey) tags.push(`<span class="tag red">💸 ${r.tooPricey} said too expensive</span>`);
    if (r.soldOut) tags.push(`<span class="tag red">📦 ${r.soldOut} came after you sold out</span>`);
    if (r.line) tags.push(`<span class="tag red">⏳ ${r.line} left because of the line</span>`);
    if (r.rival) tags.push(`<span class="tag red">🏪 ${r.rival} went to the rival</span>`);
    if (r.spoiled) tags.push(`<span class="tag red">🗑️ ${r.spoiled} spoiled overnight</span>`);
    if (r.kept) tags.push(`<span class="tag">🧊 ${r.kept} saved in the cooler</span>`);

    app.innerHTML = `
      <div class="card center">
        <p class="muted" style="margin:0">Day ${s.day} results</p>
        <p class="big-profit ${r.profit >= 0 ? "pos" : "neg"}">${r.profit >= 0 ? "+" : ""}${fmt(r.profit)}</p>
        <p class="muted" style="margin:0">profit today • ${r.n} customers walked by</p>
        <table class="ledger" style="text-align:left">
          <tr><td>${pr.many} sold: ${r.sold} × ${fmt(s.plan.price)}</td><td style="color:var(--good)">+${fmt(r.revenue)}</td></tr>
          <tr><td>Ingredients</td><td>-${fmt(r.ingredientCost)}</td></tr>
          <tr><td>Advertising</td><td>-${fmt(r.adCost)}</td></tr>
          <tr><td>Rent</td><td>-${fmt(r.rent)}</td></tr>
          <tr class="total"><td>Profit (earned − spent)</td><td style="color:${r.profit >= 0 ? "var(--good)" : "var(--bad)"}">${fmt(r.profit)}</td></tr>
        </table>
        <div class="tags" style="justify-content:center">${tags.join("") || '<span class="tag">🎉 Every customer was happy!</span>'}</div>
        <p style="margin:0"><b>💵 Cash now: ${fmt(s.cash)}</b></p>
      </div>
      <div class="coach"><b>🧑‍🏫 Coach: ${esc(tip.t)}</b>${esc(tip.x)}</div>
      ${demandChart()}
      <div class="action-row" style="margin-top:12px">
        <button class="btn green open" id="nextBtn" style="flex:1 1 240px;min-height:56px">${last ? "See my final results 🏁" : `Start day ${s.day + 1} ▶`}</button>
        ${last ? "" : '<button class="btn secondary" id="shopBtn">🛠️ Upgrades</button>'}
      </div>`;

    document.getElementById("nextBtn").onclick = () => {
      const go = () => { if (last) finalScreen(); else { s.day++; startDay(); } };
      if (spoilNew) openModal({ icon: "📦", title: "Wasted Ingredients", html: `<p class="result-text">${r.spoiled} unsold ${pr.many} spoiled overnight.</p>${conceptBox("inventory")}`, choices: [{ label: "Got it", onClick: go }] });
      else go();
    };
    const sb = document.getElementById("shopBtn");
    if (sb) sb.onclick = () => shopModal(() => {});
    window.scrollTo({ top: 0 });
  }

  // ===================================================================
  // Charts (inline SVG)
  // ===================================================================
  function demandChart() {
    const pts = s.history;
    if (pts.length < 2) return "";
    const W = 340, H = 205, L = 40, B = 42, T = 10, R = 12;
    const xs = (v) => L + ((v - 0.5) / 5.5) * (W - L - R);
    const ys = (v) => T + (1 - v) * (H - T - B);
    let g = "";
    [0, 0.5, 1].forEach((v) => { g += `<line x1="${L}" x2="${W - R}" y1="${ys(v)}" y2="${ys(v)}" stroke="#d8e8dc"/><text x="${L - 6}" y="${ys(v) + 4}" font-size="11" text-anchor="end" fill="#6b6878">${v * 100}%</text>`; });
    [1, 2, 3, 4, 5, 6].forEach((v) => { g += `<text x="${xs(v)}" y="${H - 24}" font-size="11" text-anchor="middle" fill="#6b6878">$${v}</text>`; });
    const dots = pts.map((h, i) => `<circle cx="${xs(clamp(h.price, 0.5, 6))}" cy="${ys(h.share)}" r="${i === pts.length - 1 ? 7 : 5}" fill="${i === pts.length - 1 ? "#e2463b" : "#1b9a5c"}" fill-opacity="0.85" stroke="#fff" stroke-width="1.5"><title>Day ${h.day}: ${fmt(h.price)} → ${Math.round(h.share * 100)}% would buy</title></circle>`).join("");
    return `<div class="chart-box">
      <h4>📊 Your Demand Chart</h4>
      <p>Each dot is a day: the price you charged and the % of customers willing to buy at that price. The red dot is today. Do you see a pattern?</p>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Scatter chart of price versus share of customers who would buy">${g}${dots}
        <text x="${(L + W - R) / 2}" y="${H - 6}" font-size="12" text-anchor="middle" fill="#6b6878">Price you charged</text></svg>
    </div>`;
  }

  function cashChart() {
    const pts = [{ day: 0, cash: START_CASH }, ...s.history];
    const W = 340, H = 170, L = 44, B = 24, T = 10, R = 10;
    const max = Math.max(...pts.map((p) => p.cash), START_CASH + 10), min = Math.min(...pts.map((p) => p.cash), 0);
    const xs = (d) => L + (d / TOTAL_DAYS) * (W - L - R);
    const ys = (v) => T + (1 - (v - min) / (max - min || 1)) * (H - T - B);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${xs(p.day).toFixed(1)},${ys(p.cash).toFixed(1)}`).join(" ");
    return `<div class="chart-box"><h4>💵 Your cash over time</h4>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart of your cash each day">
        <line x1="${L}" x2="${W - R}" y1="${ys(0)}" y2="${ys(0)}" stroke="#d8e8dc"/>
        <text x="${L - 6}" y="${ys(0) + 4}" font-size="11" text-anchor="end" fill="#6b6878">$0</text>
        <text x="${L - 6}" y="${ys(max) + 4}" font-size="11" text-anchor="end" fill="#6b6878">$${Math.round(max)}</text>
        <path d="${line}" fill="none" stroke="#1b9a5c" stroke-width="3" stroke-linejoin="round"/>
        <text x="${L}" y="${H - 6}" font-size="11" fill="#6b6878">Day 0</text><text x="${W - R}" y="${H - 6}" font-size="11" text-anchor="end" fill="#6b6878">Day ${TOTAL_DAYS}</text>
      </svg></div>`;
  }

  // ===================================================================
  // Final results + quiz
  // ===================================================================
  function badges() {
    const h = s.history;
    const prices = new Set(h.map((d) => d.price));
    let streak = 0, best = 0;
    h.forEach((d) => { streak = d.profit > 0 ? streak + 1 : 0; best = Math.max(best, streak); });
    return [
      { icon: "🌟", name: "Profit Machine", desc: "Earned $75+ profit in one day", ok: h.some((d) => d.profit >= 75) },
      { icon: "📦", name: "Stock Master", desc: "Ran out of stock on 2 days or fewer", ok: h.filter((d) => d.soldOut > 3).length <= 2 },
      { icon: "♻️", name: "Zero Waste", desc: "Spoiled 15 items or fewer all game", ok: h.reduce((t, d) => t + d.spoiled, 0) <= 15 },
      { icon: "🏗️", name: "Investor", desc: "Bought 2 or more upgrades", ok: Object.values(s.up).filter(Boolean).length >= 2 },
      { icon: "🔥", name: "Hot Streak", desc: "5 profitable days in a row", ok: best >= 5 },
      { icon: "🕵️", name: "Price Detective", desc: "Tried 6 or more different prices", ok: prices.size >= 6 },
    ];
  }

  function finalScreen() {
    closeModal();
    const profit = round2(s.cash - START_CASH - s.loans);
    const stars = STAR_GOALS.filter((g) => profit >= g).length;
    let newBest = false;
    try {
      const best = Number(localStorage.getItem("econ-best")) || 0;
      if (profit > best) { localStorage.setItem("econ-best", String(profit)); newBest = best > 0; }
    } catch (e) { /* ignore */ }
    const bestDay = s.history.reduce((a, d) => (d.profit > a.profit ? d : a), s.history[0]);
    const bs = badges();
    const titles = ["Rookie Seller", "Rising Star", "Smart Business Owner", "Stand Tycoon! 👑"];
    app.innerHTML = `
      <div class="card center">
        <div style="font-size:3rem;letter-spacing:6px">${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}</div>
        <h2 class="title" style="font-size:2rem">${titles[stars]}</h2>
        <p class="result-text" style="margin:4px 0">${esc(s.name)} earned a total profit of <span class="accent">${fmt(profit)}</span> in ${TOTAL_DAYS} days!</p>
        ${newBest ? '<p class="result-text">🏆 New personal best!</p>' : ""}
        <p class="muted" style="margin:0">Goals: ⭐ ${fmt(STAR_GOALS[0])} • ⭐⭐ ${fmt(STAR_GOALS[1])} • ⭐⭐⭐ ${fmt(STAR_GOALS[2])}</p>
        <div class="end-stats">
          <div><b>${fmt(s.cash)}</b>cash at the end</div>
          <div><b>${s.history.reduce((t, d) => t + d.sold, 0)}</b>${P().many} sold</div>
          <div><b>${fmt(bestDay.profit)}</b>best day (day ${bestDay.day})</div>
          <div><b>${s.concepts.length}</b>econ words learned</div>
        </div>
        ${s.loans ? `<p class="muted">Grandma's loans of ${fmt(s.loans)} were subtracted from your score.</p>` : ""}
        ${cashChart()}
        <h3 class="section-title">🏅 Badges</h3>
        <div class="badges">${bs.map((b) => `<span class="badge ${b.ok ? "" : "locked"}" title="${esc(b.desc)}">${b.icon} ${esc(b.name)}${b.ok ? "" : " 🔒"}</span>`).join("")}</div>
        <p class="muted">Ready to find out how much economics you picked up?</p>
        <div class="action-row" style="justify-content:center">
          <button class="btn green" id="quizBtn">Take the Econ Quiz 📝</button>
          <button class="btn secondary" id="againBtn">Play again</button>
        </div>
      </div>`;
    document.getElementById("quizBtn").onclick = quizScreen;
    document.getElementById("againBtn").onclick = titleScreen;
    window.scrollTo({ top: 0 });
  }

  function quizScreen() {
    const questions = shuffle(EC.quiz).slice(0, 6);
    let i = 0, right = 0;
    function show() {
      if (i >= questions.length) return finish();
      const q = questions[i];
      const answers = shuffle(q.a.map((text, idx) => ({ text, correct: idx === 0 })));
      app.innerHTML = `
        <div class="card">
          <p class="muted" style="margin:0">Question ${i + 1} of ${questions.length}</p>
          <h2 style="color:#1b7a4a;margin:6px 0 16px">${esc(q.q)}</h2>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${answers.map((a, n) => `<button class="btn secondary quiz-option" data-n="${n}">${esc(a.text)}</button>`).join("")}
          </div>
          <div id="explain"></div>
        </div>`;
      app.querySelectorAll("[data-n]").forEach((btn) => {
        btn.onclick = () => {
          const chosen = answers[Number(btn.dataset.n)];
          app.querySelectorAll("[data-n]").forEach((b) => { b.disabled = true; if (answers[Number(b.dataset.n)].correct) b.classList.add("correct"); });
          if (chosen.correct) right++; else btn.classList.add("incorrect");
          document.getElementById("explain").innerHTML = `
            <p class="result-text" style="margin-top:14px">${chosen.correct ? "✅ Correct!" : "❌ Not quite."} ${esc(q.explain)}</p>
            <button class="btn green" id="nextQ">${i + 1 < questions.length ? "Next question ▶" : "See my score"}</button>`;
          document.getElementById("nextQ").onclick = () => { i++; show(); };
        };
      });
    }
    function finish() {
      const stars = right >= 6 ? 3 : right >= 4 ? 2 : right >= 2 ? 1 : 0;
      app.innerHTML = `
        <div class="card center">
          <div style="font-size:3rem;letter-spacing:6px">${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}</div>
          <h2 style="color:#1b7a4a;margin:6px 0">You got ${right} out of ${questions.length}!</h2>
          <p>${stars === 3 ? "You think like an economist!" : stars === 2 ? "Great work! You learned a lot about business." : "Nice try! Play again to learn more."}</p>
          <div class="action-row" style="justify-content:center">
            <button class="btn green" id="againBtn">Play again</button>
            <a class="btn secondary" href="../../index.html">Back to all games</a>
          </div>
        </div>`;
      document.getElementById("againBtn").onclick = titleScreen;
    }
    show();
  }

  window.ECON_DEBUG = () => s;
  titleScreen();
})();
