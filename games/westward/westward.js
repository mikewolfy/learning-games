// Westward Wagons — game engine
(function () {
  "use strict";

  const app = document.getElementById("app");
  const TOTAL_MILES = WW.landmarks[WW.landmarks.length - 1].miles;
  const YEAR = 1848;
  const WINTER_DEADLINE = new Date(YEAR + 1, 0, 15); // stuck for winter after this date

  const ROLES = {
    farmer: { name: "Farmer", icon: "🌽", money: 500, perk: "Finds 50% more food when gathering." },
    blacksmith: { name: "Blacksmith", icon: "🔨", money: 700, perk: "Can fix broken wagons quickly." },
    merchant: { name: "Merchant", icon: "💰", money: 1000, perk: "Starts with the most money." },
  };

  const PACES = {
    easy: { name: "Easy", miles: 12, health: 0.6, desc: "12 miles a day. Slow, but everyone stays healthy." },
    steady: { name: "Steady", miles: 16, health: -0.2, desc: "16 miles a day. A good balance." },
    fast: { name: "Fast", miles: 20, health: -1.3, desc: "20 miles a day. Quick, but tiring for everyone." },
  };

  const RATIONS = {
    filling: { name: "Filling", lbs: 2, health: 0.7, desc: "2 lbs of food per person each day. Keeps everyone strong." },
    meager: { name: "Small", lbs: 1.5, health: -0.3, desc: "1.5 lbs per person each day. Saves food, but people get a bit weaker." },
    bare: { name: "Tiny", lbs: 1, health: -1.4, desc: "1 lb per person each day. Saves lots of food, but people get weak fast." },
  };

  const ITEMS = [
    { key: "oxen", emoji: "🐂", name: "Oxen", unit: "ox", price: 40, step: 1, tip: "Pull your wagon. You need at least 2. We suggest 6." },
    { key: "food", emoji: "🥓", name: "Food", unit: "lbs", price: 0.1, step: 50, tip: "Flour, bacon, beans. Your family eats about 10 lbs a day. We suggest 1,000 lbs." },
    { key: "clothes", emoji: "🧥", name: "Warm clothes", unit: "sets", price: 10, step: 1, tip: "Keep you warm in the mountains. We suggest 2 sets per person." },
    { key: "parts", emoji: "🛞", name: "Spare wagon parts", unit: "parts", price: 20, step: 1, tip: "Wheels and axles for repairs. We suggest 2." },
    { key: "medicine", emoji: "💊", name: "Medicine kits", unit: "kits", price: 15, step: 1, tip: "Help sick family members get better. We suggest 2." },
  ];

  const DEFAULT_NAMES = ["Eliza", "Samuel", "Clara", "Henry", "Ruth", "Thomas", "Hannah", "Jacob", "Lucy", "Amos", "Mary", "Levi"];

  let s = null; // game state

  // =====================================================================
  // Utilities
  // =====================================================================
  const rand = () => Math.random();
  const chance = (p) => Math.random() < p;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (str) => String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const money = (n) => "$" + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0);
  const active = () => s.family.filter((p) => !p.away);

  function healthColor(h) {
    if (h > 65) return "#22a55b";
    if (h > 35) return "#f2a516";
    return "#e2463b";
  }
  function healthWord(h) {
    if (h > 80) return "Great";
    if (h > 60) return "Good";
    if (h > 35) return "Fair";
    return "Poor";
  }

  function addLog(text, important) {
    s.log.unshift({ date: fmtDate(s.date), text, important: !!important });
    if (s.log.length > 40) s.log.pop();
  }

  function learn(title, text) {
    if (!s.facts.some((f) => f.text === text)) s.facts.push({ title, text });
  }

  // =====================================================================
  // Travelers: traits, illnesses and "what's wrong with them"
  // =====================================================================
  const yt = () => WW.yearTypes.find((y) => y.id === s.yearId) || WW.yearTypes[0];
  const traitOf = (p) => (p.trait ? WW.traits[p.trait] : null);
  const dmgMult = (p) => (traitOf(p) ? traitOf(p).dmg : 1);
  const healMult = (p) => (traitOf(p) ? traitOf(p).heal : 1);
  function applyDamage(p, n) { p.health = clamp(p.health - n * dmgMult(p), 0, 100); }
  function applyHeal(p, n) { p.health = clamp(p.health + n * healMult(p), 0, 100); }
  const pickOne = (arr) => arr[Math.floor(rand() * arr.length)];
  function pickWeighted(items, weights) {
    let r = rand() * weights.reduce((t, w) => t + w, 0);
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }

  // Give someone an illness or injury. Prefers someone who isn't already sick.
  function sicken(id, person, cause) {
    const a = WW.ailments[id];
    let p = person && !person.away ? person : null;
    if (!p || p.ail) {
      const healthy = active().filter((x) => !x.ail);
      p = healthy.length ? pickOne(healthy) : p || pickOne(active());
    }
    if (!p) return null;
    applyDamage(p, a.hit);
    if (!p.ail || WW.ailments[p.ail.id].daily < a.daily) p.ail = { id, prog: 0, cause: cause || a.cause };
    addLog(`${esc(p.name)} ${esc(p.ail.cause)} and has ${a.name}.`, true);
    learn(a.name, a.desc);
    learn("Illness on the Trail", WW.ailmentFact);
    return p;
  }

  function cure(p) {
    if (!p || !p.ail) { if (p) applyHeal(p, 15); return; }
    const a = WW.ailments[p.ail.id];
    p.ail = null;
    applyHeal(p, 25);
    addLog(`${esc(p.name)} was cured of ${a.name} with medicine.`, true);
  }

  function recover(p) {
    const a = WW.ailments[p.ail.id];
    p.ail = null;
    addLog(`${esc(p.name)} got over ${a.name}.`, true);
    s.notices.push({ icon: "🎉", title: `${p.name} Is Better!`, text: `${p.name} has recovered from ${a.name}. Rest and time did the trick.` });
  }

  // What's wrong with this traveler, in plain words (null if they're doing fine)
  function conditionOf(p) {
    if (p.away) return { icon: "🏚️", label: "Stayed behind", why: "Too sick to travel. They'll join you next year.", sev: "away" };
    if (p.ail) {
      const a = WW.ailments[p.ail.id];
      const left = Math.max(1, Math.ceil(a.need - p.ail.prog));
      return { key: "ail", icon: a.icon, label: a.name, why: `${p.ail.cause[0].toUpperCase()}${p.ail.cause.slice(1)}. ${a.care}`, left, sev: p.health < 40 ? "bad" : "warn", ail: true };
    }
    const noFood = s.supplies.food <= 0;
    if (noFood) return { key: "hunger", icon: "🍽️", label: "Starving", why: "Your family is out of food. Gather food or buy more at the next fort.", sev: "bad" };
    if (p.health < 65 && s.rations !== "filling") return { key: "hunger", icon: "🥣", label: "Weak from hunger", why: `Small food portions are wearing everyone down. Try "Filling" portions if you can.`, sev: p.health < 40 ? "bad" : "warn" };
    if (isCold() && s.supplies.clothes < active().length && p.health < 80) return { key: "cold", icon: "🥶", label: "Freezing", why: "Not enough warm clothes for everyone in this cold weather.", sev: p.health < 40 ? "bad" : "warn" };
    if (s.pace === "fast" && p.health < 70) return { key: "tired", icon: "😮‍💨", label: "Exhausted", why: "Traveling at a fast pace every day is tiring. A slower pace or a rest day helps.", sev: p.health < 40 ? "bad" : "warn" };
    if (s.wx && s.wx.id === "hot" && s.pace === "fast" && p.health < 80) return { key: "tired", icon: "🥵", label: "Overheated", why: "Hard travel in scorching heat. Rest or slow down.", sev: "warn" };
    if (p.health < 55) return { key: "worn", icon: "😩", label: "Worn out", why: "A long, hard trip is catching up with them. A few rest days will help.", sev: p.health < 35 ? "bad" : "warn" };
    return null;
  }

  // The things pulling everyone's health up or down right now
  function drains() {
    const out = [];
    const people = active();
    if (s.supplies.food <= 0) out.push(["bad", "🍽️ You're out of food: everyone is getting weak fast."]);
    else if (s.rations !== "filling") out.push(["warn", `🥣 "${RATIONS[s.rations].name}" food portions are weakening everyone.`]);
    if (s.pace === "fast") out.push(["warn", "🏃 The fast pace is tiring everyone out."]);
    if (isCold() && s.supplies.clothes < people.length) out.push(["bad", "🥶 It's cold and you don't have enough warm clothes."]);
    else if (isCold() && s.supplies.clothes < people.length * 2) out.push(["warn", "❄️ It's cold, and a few more warm clothes would help."]);
    if (s.wx && s.wx.id === "hot" && s.pace === "fast") out.push(["warn", "🥵 Fast travel in the scorching heat."]);
    people.filter((p) => p.ail).forEach((p) => out.push(["warn", `${WW.ailments[p.ail.id].icon} ${p.name} has ${WW.ailments[p.ail.id].name}, which drains their strength every day.`]));
    if (!out.length) out.push(["good", "✅ Nothing is dragging anyone down right now."]);
    return out;
  }

  // The first time a condition like hunger or exhaustion shows up, explain it
  function noteConditions() {
    const seen = {};
    active().forEach((p) => { const c = !p.ail && conditionOf(p); if (c && c.key) seen[c.key] = seen[c.key] || { c, p }; });
    ["hunger", "cold", "tired", "worn"].forEach((k) => {
      if (seen[k] && !s.flags["w_" + k]) {
        s.flags["w_" + k] = true;
        const { c, p } = seen[k];
        s.notices.push({ icon: c.icon, title: `${p.name} Is ${c.label}`, text: `${p.name} isn't feeling well: ${c.why}` });
        addLog(`${esc(p.name)} is ${c.label.toLowerCase()}.`, true);
      } else if (!seen[k]) s.flags["w_" + k] = false;
    });
  }

  // =====================================================================
  // Modal
  // =====================================================================
  const modal = document.getElementById("modal");

  // options: { icon, title, html, choices: [{label, hint, cls, disabled, onClick}] }
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
      b.addEventListener("click", () => {
        closeModal();
        if (c.onClick) c.onClick();
      });
      actions.appendChild(b);
    });
    modal.classList.remove("hidden");
    const first = actions.querySelector("button:not(:disabled)");
    if (first) first.focus();
  }
  function closeModal() { modal.classList.add("hidden"); }

  function factBox(text) {
    return `<div class="fact"><b>📜 Did you know?</b>${esc(text)}</div>`;
  }

  // Show notices (like someone staying behind) one after another, then continue
  function flushNotices(then) {
    if (!s.notices.length) return then();
    const n = s.notices.shift();
    openModal({ icon: n.icon, title: n.title, html: `<p>${esc(n.text)}</p>`, choices: [{ label: "Continue", onClick: () => flushNotices(then) }] });
  }

  // =====================================================================
  // Health and time
  // =====================================================================
  function checkHealth() {
    s.family.forEach((p) => {
      if (!p.away && p.health <= 0) {
        p.away = true;
        p.health = 0;
        addLog(`${esc(p.name)} was too sick to travel and stayed behind to get better.`, true);
        s.notices.push({
          icon: "🏚️",
          title: `${p.name} Must Stay Behind`,
          text: `${p.name} is too sick and weak to keep traveling. A kind family at a nearby settlement will care for them until they are well enough to join you in Oregon next year. Take good care of the rest of your family!`,
        });
      }
    });
  }

  function isCold() {
    const m = s.date.getMonth();
    const winterish = m >= 10 || m <= 2; // Nov–Mar
    const mountainFall = m >= yt().coldMonth && s.miles > 800; // Sep+ in the mountains (earlier in an early-winter year)
    return winterish || mountainFall;
  }

  // The weather changes every few days. It slows you down and sometimes affects health.
  function rollWeather() {
    const m = s.date.getMonth(), y = yt();
    const cold = isCold(), summer = m >= 5 && m <= 7;
    const table = cold
      ? [["cold", 30], ["snow", s.miles > 700 ? 14 : 4], ["cloudy", 22], ["sunny", 20], ["rain", 8 * y.rain]]
      : [["sunny", 32], ["cloudy", 24], ["rain", 18 * y.rain], ["storm", 7 * y.rain], ["hot", (summer ? 22 : 5) * y.hot]];
    s.wx = WW.weather[pickWeighted(table.map((t) => t[0]), table.map((t) => t[1]))];
    return s.wx;
  }

  // Pass one day: eat food, change health. `restDay` gives extra healing.
  function passDay(restDay) {
    s.date = new Date(s.date.getTime() + 86400000);
    s.daysOnTrail++;
    const people = active();
    const need = people.length * RATIONS[s.rations].lbs;
    let hungry = false;
    if (s.supplies.food >= need) s.supplies.food -= need;
    else { hungry = true; s.supplies.food = 0; }

    people.forEach((p) => {
      let d = restDay ? 4 : PACES[s.pace].health;
      d += hungry ? -2.5 : RATIONS[s.rations].health;
      if (isCold() && s.supplies.clothes < people.length * 2) d -= s.supplies.clothes < people.length ? 2 : 0.8;
      if (s.date.getMonth() === 11 || s.date.getMonth() <= 1) d -= 1;
      if (!restDay && s.wx && s.wx.id === "hot" && s.pace === "fast") d -= 0.6;
      d *= d < 0 ? dmgMult(p) : healMult(p);            // hardy travelers shrug things off, frail ones don't
      // an illness or injury drains health every day, but heals up with rest
      if (p.ail) {
        const a = WW.ailments[p.ail.id];
        d -= a.daily * (restDay ? 0.25 : 1) * dmgMult(p);
        p.ail.prog += (restDay ? 1 : 0.3) * healMult(p);
      }
      p.health = clamp(p.health + d, 0, 100);
      if (p.ail && p.ail.prog >= WW.ailments[p.ail.id].need) recover(p);
    });
    noteConditions();
    const daysLeft = s.supplies.food / Math.max(1, need);
    if (!hungry && daysLeft < 8 && !s.flags.warnedLow) {
      s.flags.warnedLow = true;
      s.notices.push({ icon: "🥓", title: "Food Is Running Low", text: `You only have about ${Math.floor(daysLeft)} days of food left! Try gathering food, eating smaller portions, or buying food at the next fort.` });
    }
    if (daysLeft >= 12) s.flags.warnedLow = false;
    if (hungry && !s.flags.warnedHungry) {
      s.flags.warnedHungry = true;
      s.notices.push({ icon: "🍽️", title: "Out of Food!", text: "Your family has run out of food and is getting weak. Gather food or buy some at the next fort as soon as you can!" });
    }
    if (!hungry) s.flags.warnedHungry = false;
  }

  // =====================================================================
  // Helper object given to event choices
  // =====================================================================
  function makeHelpers() {
    const g = {
      s,
      picked: null,
      rand,
      chance,
      active,
      monthIndex: () => s.date.getMonth(),
      // pick a traveler at random (preferring someone who isn't already sick)
      pick() { const a = active(), h = a.filter((p) => !p.ail); g.picked = pickOne(h.length ? h : a); return g.picked; },
      days(n) { for (let i = 0; i < n; i++) passDay(false); },
      restDays(n) { for (let i = 0; i < n; i++) passDay(true); },
      sicken(id, person, cause) { const p = sicken(id, person, cause); g.picked = p; return p; },
      cure(person) { cure(person); },
      // move the wagon forward without passing the next landmark; returns how far you actually went
      advance(miles) { const next = WW.landmarks[s.nextIdx]; const to = Math.min(next.miles - 1, s.miles + miles); const gained = Math.max(0, to - s.miles); s.miles = s.miles + gained; return gained; },
      change(item, delta) {
        const before = s.supplies[item];
        s.supplies[item] = Math.max(0, before + delta);
        return s.supplies[item] - before;
      },
      heal(amount, person) {
        (person ? [person] : active()).forEach((p) => { if (!p.away) { if (amount >= 0) applyHeal(p, amount); else applyDamage(p, -amount); } });
      },
      hurt(amount, person) {
        const p = person || g.pick();
        if (p && !p.away) applyDamage(p, amount);
        g.picked = p;
      },
    };
    return g;
  }

  // =====================================================================
  // Screens
  // =====================================================================
  const WAGON_SVG = `<svg viewBox="0 0 120 80" aria-hidden="true">
      <path d="M22 44 Q22 10 60 10 Q98 10 98 44 Z" fill="#fffaf0" stroke="#8a6a3a" stroke-width="3"/>
      <path d="M40 44 Q40 16 60 12 M80 44 Q80 16 60 12" fill="none" stroke="#d9c7a3" stroke-width="2"/>
      <rect x="16" y="42" width="88" height="14" rx="3" fill="#8a4b22"/>
      <circle cx="34" cy="62" r="13" fill="none" stroke="#4a2a10" stroke-width="4"/>
      <circle cx="86" cy="62" r="13" fill="none" stroke="#4a2a10" stroke-width="4"/>
      <circle cx="34" cy="62" r="3" fill="#4a2a10"/><circle cx="86" cy="62" r="3" fill="#4a2a10"/>
    </svg>`;

  function titleScreen() {
    closeModal();
    app.innerHTML = `
      <div class="card title-screen">
        <h2>Westward Wagons</h2>
        <p class="muted" style="margin:0">A journey on the Oregon Trail, 1848</p>
        <div class="wagon-art">${WAGON_SVG}</div>
        <div class="intro">
          <p>It's the spring of 1848. Your family has sold your farm back east and packed everything you own into one covered wagon. Ahead lies a <b>2,000-mile journey</b> across prairies, rivers and mountains to Oregon, where you hope to start a new life.</p>
          <p>As the leader of your wagon, you'll make the big decisions: what supplies to buy, how fast to travel, how to cross rivers, and what to do when trouble strikes.</p>
          ${factBox(WW.manifestDestinyFact)}
          <h3 class="section-title" style="margin-top:16px">How to play</h3>
          <ul style="margin:0;padding-left:22px">
            <li>Buy supplies before you leave.</li>
            <li>Press <b>Travel On</b> to move your wagon down the trail.</li>
            <li>Make smart choices when you meet challenges.</li>
            <li>Keep your family healthy. If someone gets sick or hurt, their condition shows up in the family list so you know what's wrong and what helps.</li>
            <li>Every trip is different: the weather, the sicknesses, the trail year and who your travelers are all change each time you play!</li>
            <li>Reach Oregon before winter!</li>
          </ul>
        </div>
        <button class="btn good" id="startBtn" style="font-size:1.25rem">Start your journey ▶</button>
      </div>`;
    document.getElementById("startBtn").onclick = setupScreen;
  }

  function setupScreen() {
    const names = shuffle(DEFAULT_NAMES).slice(0, 5);
    let role = "farmer";
    let month = 3; // April (0-based)

    app.innerHTML = `
      <div class="card">
        <h3 class="section-title">1. What is your job back home?</h3>
        <p class="muted" style="margin-top:0">Your job decides how much money you start with.</p>
        <div class="roles" id="roles">
          ${Object.entries(ROLES).map(([k, r]) => `
            <button class="role" data-role="${k}">
              <b>${r.icon} ${r.name}</b>
              <span class="money">${money(r.money)}</span><br>
              <small>${esc(r.perk)}</small>
            </button>`).join("")}
        </div>

        <h3 class="section-title">2. Name your family</h3>
        <div class="names">
          ${names.map((n, i) => `
            <div>
              <label for="name${i}">${i === 0 ? "Wagon leader (you!)" : "Family member " + (i + 1)}</label>
              <input type="text" id="name${i}" maxlength="14" value="${esc(n)}">
            </div>`).join("")}
        </div>

        <h3 class="section-title">3. When do you want to leave?</h3>
        <div class="months" id="months">
          ${["March", "April", "May", "June", "July"].map((m, i) => `<button class="pill" data-month="${i + 2}">${m}</button>`).join("")}
        </div>
        <p class="muted" id="monthTip" style="margin-top:4px"></p>

        <button class="btn good block" id="toStore" style="margin-top:10px">Go to the General Store ▶</button>
      </div>`;

    const monthTips = {
      2: "March: Very early! It's still cold and the grass hasn't grown much yet.",
      3: "April: A great time to leave. Most pioneers left in April or May.",
      4: "May: A great time to leave. Most pioneers left in April or May.",
      5: "June: A bit late. You'll need to hurry to beat the snow in the mountains.",
      6: "July: Very late! It will be hard to cross the mountains before winter.",
    };

    function refresh() {
      app.querySelectorAll("[data-role]").forEach((b) => b.classList.toggle("on", b.dataset.role === role));
      app.querySelectorAll("[data-month]").forEach((b) => b.classList.toggle("on", Number(b.dataset.month) === month));
      document.getElementById("monthTip").textContent = monthTips[month];
    }
    app.querySelectorAll("[data-role]").forEach((b) => (b.onclick = () => { role = b.dataset.role; refresh(); }));
    app.querySelectorAll("[data-month]").forEach((b) => (b.onclick = () => { month = Number(b.dataset.month); refresh(); }));
    refresh();

    document.getElementById("toStore").onclick = () => {
      const family = names.map((n, i) => {
        const v = document.getElementById("name" + i).value.trim();
        // every traveler is a little different: some are hardy, some are frail
        const r = rand();
        return { name: v || n, health: 92 + Math.floor(rand() * 9), away: false, ail: null, trait: r < 0.2 ? "hardy" : r < 0.4 ? "frail" : null };
      });
      // make sure a family isn't ALL hardy or ALL frail
      if (family.every((p) => p.trait === "frail")) family[1].trait = null;
      const year = pickWeighted(WW.yearTypes, WW.yearTypes.map((y) => y.weight));
      s = {
        role,
        money: ROLES[role].money,
        family,
        supplies: { oxen: 0, food: 0, clothes: 0, parts: 0, medicine: 0 },
        date: new Date(YEAR, month, 1),
        startDate: new Date(YEAR, month, 1),
        daysOnTrail: 0,
        miles: 0,
        nextIdx: 1,
        pace: "steady",
        rations: "filling",
        log: [],
        facts: [],
        notices: [],
        flags: {},
        lastEvent: null,
        prevEvent: null,
        seen: {},                 // how many times each event has happened this trip
        priceLuck: {},            // each fort's prices vary from trip to trip
        yearId: year.id,          // the "trail year" for this trip
        wx: null,
        stepsSinceEvent: 0,
      };
      WW.landmarks.forEach((l) => { delete l.currentDepth; delete l.width; });
      learn("Westward Expansion", WW.manifestDestinyFact);
      learn(WW.landmarks[0].name, WW.landmarks[0].fact);
      addLog(`The ${esc(family[0].name)} family is getting ready to leave Independence, Missouri.`);
      storeScreen(0);
    };
  }

  // landmarkIdx: 0 = Independence, otherwise a fort
  function storeScreen(landmarkIdx) {
    const lm = WW.landmarks[landmarkIdx];
    const atStart = landmarkIdx === 0;
    // frontier prices rise the farther west you go, and vary a bit each trip (plus the trail year)
    if (!atStart && s.priceLuck[landmarkIdx] == null) s.priceLuck[landmarkIdx] = Math.round((0.85 + rand() * 0.45) * 100) / 100;
    const luck = atStart ? 1 : s.priceLuck[landmarkIdx];
    const mult = (atStart ? 1 : 1 + landmarkIdx * 0.1) * (atStart ? 1 : luck) * yt().price;
    const priceNote = atStart ? "" : luck < 0.95 ? "💚 Prices are lower than usual today!" : luck > 1.2 ? "🔴 Prices are high here today." : "";
    const cart = { oxen: 0, food: 0, clothes: 0, parts: 0, medicine: 0 };
    const priceOf = (it) => Math.round(it.price * mult * 100) / 100;
    const cost = () => ITEMS.reduce((sum, it) => sum + priceOf(it) * cart[it.key], 0);

    function render() {
      const total = cost();
      const over = total > s.money + 0.001;
      const needOxen = s.supplies.oxen + cart.oxen < 2;
      app.innerHTML = `
        <div class="card">
          <h3 class="section-title">${atStart ? "🏪 Independence General Store" : "🏰 Trading Post at " + esc(lm.name)}</h3>
          ${atStart ? `<div class="year-banner"><b>${yt().icon} This trip: ${esc(yt().name)}</b><br>${esc(yt().text)}</div>` : ""}
          <p class="muted" style="margin-top:0">${atStart
            ? "Buy everything you need for the long trip. Choose carefully — you can't buy everything!"
            : "Prices are higher out here on the frontier because everything had to be hauled in by wagon."} ${priceNote}</p>
          ${ITEMS.map((it) => `
            <div class="store-row">
              <div class="emoji">${it.emoji}</div>
              <div class="desc">
                <b>${it.name}</b> — ${money(priceOf(it) * it.step)} ${it.step > 1 ? "for " + it.step + " " + it.unit : "each"}
                <small>You have ${s.supplies[it.key]} ${it.unit}. ${atStart ? esc(it.tip) : ""}</small>
              </div>
              <div class="stepper">
                <button data-minus="${it.key}" aria-label="Less ${it.name}">−</button>
                <span>${cart[it.key]}</span>
                <button data-plus="${it.key}" aria-label="More ${it.name}">+</button>
              </div>
            </div>`).join("")}
          <div class="store-total">
            <span>Cost: <span class="${over ? "over" : ""}">${money(total)}</span></span>
            <span>Your money: ${money(s.money)}</span>
          </div>
          ${over ? `<p class="feedback wrong" style="text-align:left">You don't have enough money for all of that. Take some things out.</p>` : ""}
          ${needOxen ? `<p class="feedback wrong" style="text-align:left">You need at least 2 oxen to pull your wagon!</p>` : ""}
          <button class="btn good block" id="buyBtn" ${over || needOxen ? "disabled" : ""}>${atStart ? "Buy supplies and hit the trail! 🐂" : "Buy and get back on the trail"}</button>
        </div>`;

      app.querySelectorAll("[data-plus]").forEach((b) => (b.onclick = () => { const it = ITEMS.find((i) => i.key === b.dataset.plus); cart[it.key] += it.step; render(); }));
      app.querySelectorAll("[data-minus]").forEach((b) => (b.onclick = () => { const it = ITEMS.find((i) => i.key === b.dataset.minus); cart[it.key] = Math.max(0, cart[it.key] - it.step); render(); }));
      document.getElementById("buyBtn").onclick = () => {
        s.money = Math.round((s.money - cost()) * 100) / 100;
        ITEMS.forEach((it) => (s.supplies[it.key] += cart[it.key]));
        if (cost() > 0) addLog(`Bought supplies at ${esc(lm.name)} for ${money(cost())}.`);
        if (atStart) addLog("Your wagon rolls out of Independence. Oregon, here we come!", true);
        travelScreen();
      };
    }
    render();
  }

  // Use a medicine kit on someone who is sick or hurt
  function treat(i) {
    const p = s.family[i];
    if (!p || !p.ail || s.supplies.medicine < 1) return;
    const name = WW.ailments[p.ail.id].name;
    s.supplies.medicine -= 1;
    cure(p);
    openModal({ icon: "💊", title: `${p.name} Is Treated`, html: `<p class="result-text">You use a medicine kit. ${esc(p.name)} is cured of ${esc(name)} and starts to feel much better.</p>`, choices: [{ label: "Continue", onClick: travelScreen }] });
  }

  function travelScreen() {
    if (!s.wx) rollWeather();
    const next = WW.landmarks[s.nextIdx];
    const people = active();
    const wagonLeft = 3 + (s.miles / TOTAL_MILES) * 88;
    const lmHere = WW.landmarks.find((l) => l.miles === s.miles);
    const atFort = lmHere && lmHere.type === "fort";

    app.innerHTML = `
      <div class="card trail-card">
        <div class="trail-top">
          <span>📅 ${fmtDate(s.date)}</span>
          <span>🧭 ${s.miles} of ${TOTAL_MILES} miles</span>
          <span>➡️ ${next ? esc(next.name) + " in " + (next.miles - s.miles) + " mi" : ""}</span>
        </div>
        <div class="trail" aria-hidden="true">
          <div class="mountains">⛰️🏔️⛰️⛰️🏔️⛰️🌲🌲⛰️🏔️🌲</div>
          <div class="path"></div>
          ${WW.landmarks.slice(1, -1).map((l) => `<div class="marker ${l.miles <= s.miles ? "passed" : ""}" style="left:${3 + (l.miles / TOTAL_MILES) * 88}%" title="${esc(l.name)}"></div>`).join("")}
          <div class="goal">🏡</div>
          <div class="wagon" style="left:${wagonLeft}%">${WAGON_SVG}</div>
        </div>
        <div class="muted" style="font-size:0.9rem">Weather: <b>${s.wx.icon} ${s.wx.label}</b> • Trail year: <b>${yt().icon} ${esc(yt().name)}</b></div>
      </div>

      <div class="dash">
        <div class="card">
          <h3>👨‍👩‍👧‍👦 Your Family</h3>
          ${s.family.map((p, i) => {
            const c = conditionOf(p), tr = traitOf(p);
            return `
            <div class="person ${p.away ? "away" : ""}">
              <span class="nm">${esc(p.name)}${tr ? ` <span class="trait" title="${esc(tr.name)}: ${esc(tr.text)}">${tr.icon}</span>` : ""}${p.away ? " (stayed behind)" : ""}</span>
              ${p.away ? "<span></span>" : `<div class="bar" title="${healthWord(p.health)} (${Math.round(p.health)}%)"><i style="width:${p.health}%;background:${healthColor(p.health)}"></i></div>`}
              ${c && !p.away ? `<div class="cond ${c.sev}"><b>${c.icon} ${esc(c.label)}</b> <span>${esc(c.why)}${c.ail ? ` About ${c.left} more day${c.left === 1 ? "" : "s"} of rest needed.` : ""}</span>${c.ail && s.supplies.medicine > 0 ? ` <button class="treat" data-treat="${i}">💊 Treat</button>` : ""}</div>` : ""}
            </div>`;
          }).join("")}
          <div class="settings-line">
            <span>Pace: <b>${PACES[s.pace].name}</b></span>
            <span>Food portions: <b>${RATIONS[s.rations].name}</b></span>
          </div>
          <div class="drains"><b>What's affecting everyone's health:</b>${drains().map((d) => `<div class="${d[0]}">${esc(d[1])}</div>`).join("")}</div>
          ${s.family.some((p) => p.trait && !p.away) ? `<p class="muted" style="font-size:0.8rem;margin:8px 0 0">${s.family.some((p) => p.trait === "hardy") ? "💪 Hardy: gets sick less, heals faster. " : ""}${s.family.some((p) => p.trait === "frail") ? "🤧 Frail: sick more easily, heals slowly." : ""}</p>` : ""}
        </div>
        <div class="card">
          <h3>🎒 Supplies</h3>
          <div class="supplies">
            <div><span>💵 Money</span><b>${money(s.money)}</b></div>
            <div><span>🐂 Oxen</span><b class="${s.supplies.oxen <= 2 ? "low" : ""}">${s.supplies.oxen}</b></div>
            <div><span>🥓 Food</span><b class="${s.supplies.food < people.length * 2 * 10 ? "low" : ""}">${Math.floor(s.supplies.food)} lbs</b></div>
            <div><span>🧥 Clothes</span><b class="${s.supplies.clothes < people.length ? "low" : ""}">${s.supplies.clothes}</b></div>
            <div><span>🛞 Parts</span><b>${s.supplies.parts}</b></div>
            <div><span>💊 Medicine</span><b>${s.supplies.medicine}</b></div>
          </div>
          <p class="muted" style="font-size:0.85rem;margin:8px 0 0">Food lasts about ${Math.floor(s.supplies.food / Math.max(1, people.length * RATIONS[s.rations].lbs))} more days.</p>
        </div>
      </div>

      <div class="actions">
        <button class="btn go" id="travelBtn">Travel On 🐂</button>
        <button class="btn secondary" id="restBtn">😴 Rest (2 days)</button>
        <button class="btn secondary" id="gatherBtn">🎣 Gather food (2 days)</button>
        <button class="btn secondary" id="paceBtn">🚶 Change pace</button>
        <button class="btn secondary" id="rationBtn">🍲 Change food portions</button>
        <button class="btn secondary" id="journalBtn">📖 History journal (${s.facts.length})</button>
        ${atFort ? `<button class="btn warn" id="shopBtn">🏪 Visit trading post</button>` : ""}
      </div>

      <div class="card log">
        <h3 style="margin:0 0 6px;color:#7a3d12">📝 Trail diary</h3>
        ${s.log.map((l) => `<p>${l.important ? "<b>" : ""}<span class="muted">${l.date}:</span> ${l.text}${l.important ? "</b>" : ""}</p>`).join("")}
      </div>`;

    app.querySelectorAll("[data-treat]").forEach((b) => (b.onclick = () => treat(Number(b.dataset.treat))));
    document.getElementById("travelBtn").onclick = travelStep;
    document.getElementById("restBtn").onclick = rest;
    document.getElementById("gatherBtn").onclick = gather;
    document.getElementById("paceBtn").onclick = paceModal;
    document.getElementById("rationBtn").onclick = rationModal;
    document.getElementById("journalBtn").onclick = journalModal;
    if (atFort) document.getElementById("shopBtn").onclick = () => storeScreen(WW.landmarks.indexOf(lmHere));
  }

  // After anything happens: show notices, check for game over, redraw
  function afterAction() {
    checkHealth();
    flushNotices(() => {
      if (checkGameOver()) return;
      travelScreen();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // =====================================================================
  // Actions
  // =====================================================================
  function speed() {
    let mpd = PACES[s.pace].miles;
    mpd *= Math.min(1, 0.5 + s.supplies.oxen * 0.125); // fewer oxen = slower
    const mountains = (s.miles >= 830 && s.miles < 1150) || (s.miles >= 1580 && s.miles < 1840);
    if (mountains) mpd *= 0.8;
    if (s.date.getMonth() === 2) mpd *= 0.85; // muddy early spring
    if (s.miles < 700 && s.date.getMonth() <= 5) mpd *= yt().mud;   // a wet spring makes the prairie muddy
    mpd *= s.wx ? s.wx.speed : 1;                                   // rain, storms and snow slow you down
    return Math.max(4, mpd);
  }

  function travelStep() {
    const next = WW.landmarks[s.nextIdx];
    const startMiles = s.miles;
    let arrived = false;
    rollWeather();
    for (let d = 0; d < 5; d++) {
      passDay(false);
      s.miles = Math.min(next.miles, Math.round(s.miles + speed()));
      if (s.miles >= next.miles) { arrived = true; break; }
    }
    addLog(`Traveled ${s.miles - startMiles} miles.`);
    checkHealth();

    flushNotices(() => {
      if (checkGameOver()) return;
      if (arrived) return arriveAt(s.nextIdx);
      s.stepsSinceEvent++;
      const eventChance = clamp((s.stepsSinceEvent >= 2 ? 0.6 : 0.35) + yt().eventChance, 0.15, 0.85);
      if (chance(eventChance)) return randomEvent();
      travelScreen();
    });
  }

  function rest() {
    for (let i = 0; i < 2; i++) passDay(true);
    addLog("Your family rested for 2 days.");
    afterAction();
  }

  function gather() {
    passDay(false);
    passDay(false);
    const where = s.miles < 650 ? ["caught catfish in a creek", "gathered wild onions and greens", "found wild plums"]
      : s.miles < 1500 ? ["caught trout in a mountain stream", "picked chokecherries", "gathered wild currants"]
      : ["caught salmon in the river", "picked huckleberries", "gathered camas roots"];
    let amount = 30 + Math.floor(rand() * 50);
    if (s.role === "farmer") amount = Math.round(amount * 1.5);
    s.supplies.food += amount;
    const what = where[Math.floor(rand() * where.length)];
    addLog(`You ${what} and got ${amount} lbs of food.`);
    openModal({
      icon: "🎣", title: "Gathering Food",
      html: `<p class="result-text">You ${what} and got <b>${amount} pounds</b> of food!</p>${factBox("Pioneers fished, hunted and gathered wild plants to make their food last longer. Native peoples taught some travelers which plants, like camas roots, were good to eat.")}`,
      choices: [{ label: "Back to the trail", onClick: afterAction }],
    });
    learn("Finding Food", "Pioneers fished, hunted and gathered wild plants to make their food last longer. Native peoples taught some travelers which plants, like camas roots, were good to eat.");
  }

  function paceModal() {
    openModal({
      icon: "🚶", title: "How fast should you travel?",
      html: "<p>Going faster gets you to Oregon sooner, but it tires out your family.</p>",
      choices: Object.entries(PACES).map(([k, p]) => ({
        label: p.name + (s.pace === k ? " ✓" : ""), hint: p.desc, cls: s.pace === k ? "good" : "secondary",
        onClick: () => { s.pace = k; travelScreen(); },
      })),
    });
  }

  function rationModal() {
    openModal({
      icon: "🍲", title: "How much should everyone eat?",
      html: "<p>Eating less makes your food last longer, but your family gets weaker.</p>",
      choices: Object.entries(RATIONS).map(([k, r]) => ({
        label: r.name + (s.rations === k ? " ✓" : ""), hint: r.desc, cls: s.rations === k ? "good" : "secondary",
        onClick: () => { s.rations = k; travelScreen(); },
      })),
    });
  }

  function journalModal() {
    openModal({
      icon: "📖", title: "History Journal",
      html: `<p class="muted">Everything you've learned so far on your journey:</p>
        <ul class="journal-list">${s.facts.map((f) => `<li><b>${esc(f.title)}</b><br>${esc(f.text)}</li>`).join("")}</ul>`,
      choices: [{ label: "Close", cls: "secondary" }],
    });
  }

  // =====================================================================
  // Random events
  // =====================================================================
  function randomEvent() {
    const g = makeHelpers();
    // Draw from the whole pile of events, but events you've already seen this trip are much less likely,
    // and each trail year (wet, dry, sickly...) makes some events more likely. So every trip plays out differently.
    const options = WW.events.filter((e) => e.id !== s.lastEvent && e.id !== s.prevEvent && (!e.when || e.when(g)));
    const weights = options.map((e) => Math.max(0.03, (e.weight ? e.weight(g) : 1) * (yt().weights[e.id] || 1) * Math.pow(0.2, s.seen[e.id] || 0)));
    const ev = pickWeighted(options, weights);
    s.seen[ev.id] = (s.seen[ev.id] || 0) + 1;
    s.prevEvent = s.lastEvent;
    s.lastEvent = ev.id;
    s.stepsSinceEvent = 0;
    const text = ev.text(g);
    openModal({
      icon: ev.icon, title: ev.title,
      html: `<p class="result-text">${esc(text)}</p><p class="muted">What will you do?</p>`,
      choices: ev.choices.map((c) => ({
        label: c.label, hint: c.hint,
        disabled: c.ok ? !c.ok(g) : false,
        onClick: () => {
          const result = c.run(g);
          addLog(`${ev.title}: ${esc(result)}`, true);
          learn(ev.title, ev.fact);
          openModal({
            icon: ev.icon, title: ev.title,
            html: `<p class="result-text">${esc(result)}</p>${factBox(ev.fact)}`,
            choices: [{ label: "Continue", onClick: afterAction }],
          });
        },
      })),
    });
  }

  // =====================================================================
  // Landmarks, rivers and The Dalles
  // =====================================================================
  function arriveAt(idx) {
    const lm = WW.landmarks[idx];
    s.nextIdx = idx + 1;
    s.miles = lm.miles;
    learn(lm.name, lm.fact);
    addLog(`Arrived at ${esc(lm.name)}!`, true);

    if (lm.type === "end") return winScreen();
    if (lm.type === "river") return riverModal(lm);
    if (lm.type === "dalles") return dallesModal(lm);

    let extra = "";
    if (lm.july4) {
      const july4 = new Date(YEAR, 6, 4);
      extra = s.date <= july4
        ? `<p class="result-text">🎉 You made it before the Fourth of July! You're right on schedule.</p>`
        : `<p class="result-text">⚠️ It's after the Fourth of July. You're behind schedule — you'll need to hurry to beat the snow!</p>`;
    }

    const choices = [];
    if (lm.type === "fort") choices.push({ label: "Visit the trading post", hint: "Buy supplies", cls: "warn", onClick: () => storeScreen(idx) });
    choices.push({ label: "Look around, then keep going", onClick: afterAction });

    openModal({
      icon: lm.icon, title: `You reached ${lm.name}!`,
      html: extra + factBox(lm.fact),
      choices,
    });
  }

  function riverModal(lm) {
    if (lm.currentDepth == null) {
      lm.currentDepth = Math.round((lm.depth[0] + rand() * (lm.depth[1] - lm.depth[0])) * yt().river * 10) / 10;
      lm.width = 300 + Math.floor(rand() * 500);
    }
    const depth = lm.currentDepth;
    const choices = [
      { label: "Ford the river", hint: "Walk the oxen across. Safest when shallow (under 3 feet)", onClick: () => crossRiver(lm, "ford") },
      { label: "Seal the wagon and float it", hint: "Waterproof the wagon and float across", onClick: () => crossRiver(lm, "float") },
    ];
    if (lm.ferry) {
      choices.push({ label: `Take the ferry (${money(lm.ferry)})`, hint: "Safe and quick", disabled: s.money < lm.ferry, onClick: () => crossRiver(lm, "ferry") });
    }
    if (lm.guide) {
      choices.push({ label: "Trade 2 sets of clothes for a Shoshone guide", hint: "They know the safest path", disabled: s.supplies.clothes < 2, onClick: () => crossRiver(lm, "guide") });
    }
    choices.push({ label: "Wait a day and see if the water goes down", hint: "Uses food and time", cls: "secondary", onClick: () => {
      passDay(true);
      lm.currentDepth = Math.max(1.5, Math.round((depth + (rand() * 1.0 - 0.7)) * 10) / 10);
      addLog(`Waited a day at ${esc(lm.name)}.`);
      checkHealth();
      flushNotices(() => { if (!checkGameOver()) riverModal(lm); });
    } });

    openModal({
      icon: "🌊", title: lm.name,
      html: `<p class="result-text">The river is <b>${depth} feet deep</b> and about <b>${lm.width} feet wide</b>.</p>
             <p class="muted">Today is ${fmtDate(s.date)}. How will you cross?</p>${factBox(lm.fact)}`,
      choices,
    });
  }

  function crossRiver(lm, how) {
    const depth = lm.currentDepth;
    const g = makeHelpers();
    let result;

    if (how === "ferry") {
      s.money -= lm.ferry;
      g.days(1);
      result = "You pay the ferry operator and your wagon floats safely across on a big raft. Everyone stays dry!";
    } else if (how === "guide") {
      g.change("clothes", -2);
      result = "Your Shoshone guide leads your wagon across on a safe path between the islands. You make it across without any trouble!";
    } else {
      let risk;
      if (how === "ford") risk = depth < 2.5 ? 0.05 : depth < 3.5 ? 0.35 : 0.7;
      else risk = depth < 2.5 ? 0.15 : 0.25; // floating is about the same at any depth
      if (chance(risk)) {
        const lostFood = -g.change("food", -Math.round(s.supplies.food * (0.15 + rand() * 0.2)));
        const lostClothes = -g.change("clothes", -Math.floor(rand() * 3));
        const bits = [`${lostFood} lbs of food`];
        if (lostClothes) bits.push(`${lostClothes} sets of clothes`);
        if (how === "ford" && depth >= 3.5 && chance(0.4) && s.supplies.oxen > 1) { g.change("oxen", -1); bits.push("1 ox"); }
        const p = sicken("cold", g.pick(), "got soaked and chilled in the river");
        result = `Oh no! The current tips your wagon! You lose ${bits.join(", ")}. ${p.name} is soaked and catches a bad cold.`;
      } else if (how === "float" && depth < 2.5) {
        g.days(1);
        result = "The water was too shallow to float, so your wagon got stuck in the mud. It took a day to push it out, but everything is safe.";
      } else {
        result = "Splash! Your wagon makes it safely across the river!";
      }
    }
    addLog(`${esc(lm.name)}: ${esc(result)}`, true);
    openModal({
      icon: "🌊", title: "River Crossing",
      html: `<p class="result-text">${esc(result)}</p>`,
      choices: [{ label: "Continue", onClick: afterAction }],
    });
  }

  function dallesModal(lm) {
    openModal({
      icon: lm.icon, title: "The Dalles — The Final Choice",
      html: `<p class="result-text">The wagon road ends here at the Columbia River. Oregon City is still 160 miles away. Which way will you go?</p>${factBox(lm.fact)}`,
      choices: [
        { label: "Float down the Columbia River on a raft", hint: "Faster, but dangerous rapids", onClick: () => dallesChoice("raft") },
        { label: "Take the Barlow Road around Mount Hood ($5 toll)", hint: "Slower and steep, but safer", disabled: s.money < 5, onClick: () => dallesChoice("barlow") },
      ],
    });
  }

  function dallesChoice(how) {
    const g = makeHelpers();
    let result;
    if (how === "raft") {
      g.days(6);
      if (chance(0.35)) {
        const lost = -g.change("food", -Math.round(s.supplies.food * 0.4));
        g.change("clothes", -2);
        const p = sicken("bruise", g.pick(), "was thrown against the rocks");
        applyDamage(p, 10);
        result = `The rapids are wild! Your raft crashes into rocks. You lose ${lost} lbs of food and some clothing, and ${p.name} is battered and bruised. But you make it down the river!`;
      } else {
        result = "You build a raft from logs and float down the mighty Columbia River. It's scary in the rapids, but you make it safely!";
      }
    } else {
      s.money -= 5;
      g.days(12);
      if (s.supplies.clothes < active().length) { const p = sicken("cold", g.pick(), "got chilled on the cold, muddy road"); result = `The Barlow Road is steep, muddy and cold. Without enough warm clothes, ${p.name} catches a bad cold. But you make it around Mount Hood!`; }
      else result = "The Barlow Road is steep and muddy. At Laurel Hill, you lower your wagon down with ropes tied to trees. But you make it around Mount Hood safely!";
    }
    s.miles = TOTAL_MILES;
    addLog(esc(result), true);
    openModal({
      icon: how === "raft" ? "🛶" : "🌲", title: how === "raft" ? "Down the Columbia" : "The Barlow Road",
      html: `<p class="result-text">${esc(result)}</p>`,
      choices: [{ label: "Continue", onClick: () => {
        checkHealth();
        flushNotices(() => { if (!checkGameOver()) arriveAt(WW.landmarks.length - 1); });
      } }],
    });
  }

  // =====================================================================
  // End of game
  // =====================================================================
  function checkGameOver() {
    if (active().length === 0) {
      loseScreen("Everyone in your family became too sick to keep going. They'll rest at a settlement and try again next spring.");
      return true;
    }
    if (s.supplies.oxen <= 0) {
      loseScreen("You have no oxen left to pull your wagon. Your family is stuck on the trail and must wait for another wagon train to help.");
      return true;
    }
    if (s.date >= WINTER_DEADLINE) {
      loseScreen("Winter has arrived and deep snow blocks the trail. Your family must camp for the winter and finish the journey in the spring.");
      return true;
    }
    return false;
  }

  function score() {
    const arrived = active();
    const healthSum = arrived.reduce((t, p) => t + p.health, 0);
    return Math.round(arrived.length * 200 + healthSum * 2 + s.supplies.oxen * 20 + s.supplies.food / 5 + s.money);
  }

  function loseScreen(reason) {
    closeModal();
    app.innerHTML = `
      <div class="card center">
        <div style="font-size:3.5rem">🏕️</div>
        <h2 style="color:#7a3d12;margin:6px 0">Your journey has stopped</h2>
        <p class="result-text">${esc(reason)}</p>
        <p class="muted">You made it ${s.miles} miles in ${s.daysOnTrail} days. Real pioneers faced these same hard choices. Try again with a new plan!</p>
        <div class="row" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:12px">
          <button class="btn good" id="quizBtn">Take the Trail Quiz 📝</button>
          <button class="btn" id="againBtn">Try again</button>
        </div>
      </div>`;
    document.getElementById("quizBtn").onclick = () => quizScreen(false);
    document.getElementById("againBtn").onclick = titleScreen;
  }

  function winScreen() {
    closeModal();
    const arrived = active();
    const behind = s.family.filter((p) => p.away);
    app.innerHTML = `
      <div class="card center">
        <div style="font-size:3.5rem">🏡🎉</div>
        <h2 style="color:#7a3d12;margin:6px 0">You made it to Oregon!</h2>
        <p class="result-text">On ${fmtDate(s.date)}, your wagon rolled into Oregon City after ${s.daysOnTrail} days on the trail.</p>
        <p>${arrived.map((p) => esc(p.name) + (p.ail ? ` (still getting over ${WW.ailments[p.ail.id].name})` : "")).join(", ")} ${arrived.length === 1 ? "has" : "have"} arrived and will start building a new home.
          ${behind.length ? `${behind.map((p) => esc(p.name)).join(", ")} will join you next year.` : "Your whole family made it together!"}</p>
        <div class="end-stats">
          <div><b>${arrived.length}/${s.family.length}</b>family arrived</div>
          <div><b>${s.daysOnTrail}</b>days on trail</div>
          <div><b>${s.facts.length}</b>history facts</div>
          <div><b>${score()}</b>trail score</div>
        </div>
        <p class="muted">Now let's see how much history you learned!</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">
          <button class="btn good" id="quizBtn">Take the Trail Quiz 📝</button>
          <button class="btn secondary" id="againBtn">Play again</button>
        </div>
      </div>`;
    document.getElementById("quizBtn").onclick = () => quizScreen(true);
    document.getElementById("againBtn").onclick = titleScreen;
  }

  function quizScreen(won) {
    const questions = shuffle(WW.quiz).slice(0, 6);
    let i = 0;
    let right = 0;

    function show() {
      if (i >= questions.length) return finish();
      const q = questions[i];
      const answers = shuffle(q.a.map((text, idx) => ({ text, correct: idx === 0 })));
      app.innerHTML = `
        <div class="card">
          <p class="muted" style="margin:0">Question ${i + 1} of ${questions.length}</p>
          <h2 style="color:#7a3d12;margin:6px 0 16px">${esc(q.q)}</h2>
          <div style="display:flex;flex-direction:column;gap:10px" id="answers">
            ${answers.map((a, n) => `<button class="btn secondary quiz-option" data-n="${n}">${esc(a.text)}</button>`).join("")}
          </div>
          <div id="explain"></div>
        </div>`;
      app.querySelectorAll("[data-n]").forEach((btn) => {
        btn.onclick = () => {
          const pickedAnswer = answers[Number(btn.dataset.n)];
          app.querySelectorAll("[data-n]").forEach((b) => {
            b.disabled = true;
            if (answers[Number(b.dataset.n)].correct) b.classList.add("correct");
          });
          if (pickedAnswer.correct) right++;
          else btn.classList.add("incorrect");
          document.getElementById("explain").innerHTML = `
            <p class="result-text" style="margin-top:14px">${pickedAnswer.correct ? "✅ Correct!" : "❌ Not quite."} ${esc(q.explain)}</p>
            <button class="btn good" id="nextQ">${i + 1 < questions.length ? "Next question ▶" : "See my score"}</button>`;
          document.getElementById("nextQ").onclick = () => { i++; show(); };
        };
      });
    }

    function finish() {
      const stars = right >= 6 ? 3 : right >= 4 ? 2 : right >= 2 ? 1 : 0;
      app.innerHTML = `
        <div class="card center">
          <div style="font-size:3rem;letter-spacing:6px">${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}</div>
          <h2 style="color:#7a3d12;margin:6px 0">You got ${right} out of ${questions.length}!</h2>
          <p>${stars === 3 ? "You're a true trail historian!" : stars === 2 ? "Great job! You learned a lot on the trail." : "Nice try! Play again to learn more history."}</p>
          ${won ? `<p class="muted">Trail score: ${score()}</p>` : ""}
          <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">
            <button class="btn good" id="againBtn">Play again</button>
            <a class="btn secondary" href="../../index.html">Back to all games</a>
          </div>
        </div>`;
      document.getElementById("againBtn").onclick = titleScreen;
    }
    show();
  }

  window.WW_DEBUG = () => ({ s, sicken, conditionOf, travelScreen, passDay, drains });
  titleScreen();
})();
