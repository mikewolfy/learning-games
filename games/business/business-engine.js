// Business Builder — the economy engine (pure logic, no screen code).
// Works in the browser (window.BB.engine) and in Node (for balancing with simulations).

(function (root) {
  "use strict";
  const BB = (root.BB = root.BB || {});
  const E = (BB.engine = {});

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const r0 = Math.round;
  const sum = (a) => a.reduce((t, x) => t + x, 0);
  const last = (a, n) => a.slice(-n);

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  E.TOTAL_Q = 40;                                 // 10 years of quarters
  E.REACH = [1, 2.0, 3.6, 6.0];                    // market-size multiplier for each reach level
  E.REACH_NAMES = ["Your neighborhood", "The whole town", "The region", "Nationwide"];
  E.REACH_COST = [0, 4000, 15000, 48000];
  E.OVERHEAD = [0, 800, 3500, 12000];               // head-office costs per quarter once you operate in a bigger market         // cost to expand INTO that level
  E.EQUIP_COST = [1500, 3500, 7000, 14000, 28000];
  E.MK_TIERS = [0, 300, 900, 2200, 5000];
  E.MK_NAMES = ["None", "Flyers & word of mouth", "Local ads", "Big campaign", "Everywhere!"];
  E.QT_TIERS = [0, 250, 700, 1600];
  E.QT_NAMES = ["None", "Basic training", "Quality program", "R&D lab"];
  E.PRICE_MIN = 0.7;
  E.PRICE_MAX = 1.6;
  E.START_SAVINGS = 6000;
  E.START_CASH = 1500;
  E.PRODUCT_COST_NOISE = 0;

  const typeOf = (b) => BB.types[b.type];

  // ---------------------------------------------------------------------------
  // Creating a game
  // ---------------------------------------------------------------------------
  E.newGame = function (typeId, name, owner, av) {
    const t = BB.types[typeId];
    return {
      v: 1, id: null, name: owner, av, biz: name, type: typeId,
      qi: 0, structure: "solo",
      cash: E.START_CASH, savings: E.START_SAVINGS - t.startup - E.START_CASH,
      debt: 0, edebt: 0, nol: 0,
      buzz: 8, rep: 50, Q: 5, equip: 0, reach: 0, ins: false, inv: 0, rentMult: 1,
      plan: { price: 1, mk: 1, qt: 0 },
      staff: [], nextId: 1,
      econ: { phase: "normal", until: 6 },
      comp: { level: 0, until: 0 },
      mods: [],
      hist: { rev: [], prof: [], units: [], worth: [] },
      tips: [], flags: {}, log: [],
      stats: { peakStaff: 0, totalRev: 0, totalUnits: 0, lawsuits: 0 },
      over: null,
    };
  };

  E.season = (b) => b.qi % 4;
  E.year = (b) => Math.floor(b.qi / 4) + 1;
  E.qLabel = (qi) => `Year ${Math.floor(qi / 4) + 1}, Q${(qi % 4) + 1}`;
  E.SEASON_NAMES = ["Jan–Mar", "Apr–Jun", "Jul–Sep", "Oct–Dec"];

  // ---------------------------------------------------------------------------
  // Temporary effects ("mods") from events: { k, v, until }   k: dem | cost | cap | rent
  // ---------------------------------------------------------------------------
  E.addMod = (b, k, v, quarters) => b.mods.push({ k, v, until: b.qi + quarters - 1 });
  E.modProd = (b, k) => b.mods.filter((m) => m.k === k && m.until >= b.qi).reduce((p, m) => p * m.v, 1);

  // ---------------------------------------------------------------------------
  // Economy
  // ---------------------------------------------------------------------------
  E.ECON = { boom: 1.2, normal: 1.0, recession: 0.78 };
  E.econMult = (b) => E.ECON[b.econ.phase];
  E.compMult = (b) => 1 - 0.09 * b.comp.level;

  // ---------------------------------------------------------------------------
  // Team
  // ---------------------------------------------------------------------------
  E.skillMult = (s) => 0.65 + 0.15 * s;
  E.prod = (e) => (0.7 + 0.4 * (e.m / 100)) * (e.t === 0 ? 0.75 : 1);   // morale + first-quarter ramp-up
  E.marketWage = (b, role, skill) => r0(typeOf(b).wage * BB.roles[role].wageMult * (0.65 + 0.15 * skill) * (1 + 0.04 * b.reach));
  E.hireFee = (wage) => r0(wage * 0.35);
  E.payroll = (b) => r0(sum(b.staff.map((e) => e.w)) * 1.2);    // wages + payroll taxes + benefits
  E.count = (b, role) => b.staff.filter((e) => e.r === role).length;
  E.mgrEfficiency = function (b) {
    const nonMgr = b.staff.filter((e) => e.r !== "manager").length;
    const mgrs = E.count(b, "manager");
    const span = 5 * (mgrs + 1);
    return nonMgr > span ? Math.max(0.6, 1 - 0.04 * (nonMgr - span)) : 1 + Math.min(0.12, 0.04 * mgrs);
  };

  E.candidates = function (b, role, rng) {
    rng = rng || Math.random;
    const out = [];
    const used = new Set();
    for (let i = 0; i < 3; i++) {
      const r = rng();
      const skill = r < 0.15 ? 1 : r < 0.45 ? 2 : r < 0.75 ? 3 : r < 0.93 ? 4 : 5;
      let name;
      do { name = BB.names[Math.floor(rng() * BB.names.length)] + " " + BB.surnameInitials[Math.floor(rng() * BB.surnameInitials.length)] + "."; } while (used.has(name));
      used.add(name);
      const wage = r0(E.marketWage(b, role, skill) * (0.92 + rng() * 0.16));
      out.push({ n: name, r: role, s: skill, w: wage, fee: E.hireFee(wage) });
    }
    return out;
  };

  E.hire = function (b, c) {
    if (b.cash < c.fee) return false;
    b.cash -= c.fee;
    b.staff.push({ id: b.nextId++, n: c.n, r: c.r, s: c.s, w: c.w, m: 70, t: 0 });
    b.stats.peakStaff = Math.max(b.stats.peakStaff, b.staff.length);
    return true;
  };
  E.fire = function (b, id) {
    const i = b.staff.findIndex((e) => e.id === id);
    if (i < 0) return false;
    const e = b.staff[i];
    b.cash -= r0(e.w * 0.25);                 // severance
    b.staff.splice(i, 1);
    b.staff.forEach((o) => { o.m = clamp(o.m - 6, 0, 100); });   // the rest of the team gets nervous
    return true;
  };
  E.raise = function (b, id) {
    const e = b.staff.find((x) => x.id === id);
    if (!e) return false;
    e.w = r0(e.w * 1.1); e.m = clamp(e.m + 8, 0, 100);
    return true;
  };

  // ---------------------------------------------------------------------------
  // Capacity and demand
  // ---------------------------------------------------------------------------
  E.ownerEff = (b) => Math.max(0.35, 1 - 0.06 * b.staff.length);   // the owner stops doing every job as the team grows
  E.capacity = function (b) {
    const t = typeOf(b);
    let k = t.ownerCap * E.ownerEff(b);
    b.staff.forEach((e) => { if (e.r === "maker") k += t.makerCap * E.skillMult(e.s) * E.prod(e); });
    return k * E.mgrEfficiency(b) * (1 + 0.18 * b.equip) * E.modProd(b, "cap");
  };
  E.sellerBoost = function (b) {              // salespeople: more demand, with diminishing returns (max +60%)
    const S = sum(b.staff.filter((e) => e.r === "seller").map((e) => 0.35 * E.skillMult(e.s) * E.prod(e)));
    return 0.6 * (1 - Math.exp(-S / 0.6));
  };
  E.acceptablePrice = (b) => typeOf(b).price * (1 + typeOf(b).qv * (b.Q - 5));
  E.marketScale = (b) => Math.pow(E.REACH[b.reach], 0.7);
  E.mkSpend = (b, tier) => r0(E.MK_TIERS[tier] * E.marketScale(b));
  E.qtSpend = (b, tier) => r0(E.QT_TIERS[tier] * E.marketScale(b));

  E.demand = function (b, plan, noise) {
    const t = typeOf(b);
    const price = t.price * plan.price;
    const priceF = clamp(Math.pow(price / E.acceptablePrice(b), -t.elast), 0.1, 4);
    const aw = 0.2 + 0.0095 * b.buzz;
    const repF = 0.6 + 0.008 * clamp(50 + (b.rep - 50) * (t.repW || 1), 0, 100);
    return t.market * E.REACH[b.reach] * t.season[E.season(b)] * E.econMult(b) * E.compMult(b) *
      aw * repF * priceF * (1 + E.sellerBoost(b)) * E.modProd(b, "dem") * (noise || 1);
  };

  // ---------------------------------------------------------------------------
  // Money: taxes, interest, valuation
  // ---------------------------------------------------------------------------
  E.rate = (b) => BB.structures[b.structure].rate;
  E.annual = (b, key) => sum(last(b.hist[key], 4));
  E.taxFor = function (b, taxable) {
    if (taxable <= 0) return 0;
    return b.structure === "corp" ? r0(0.17 * taxable) : r0(0.12 * Math.min(taxable, 6000) + 0.28 * Math.max(0, taxable - 6000));
  };
  E.insurancePremium = (b) => (b.ins ? r0(100 + 0.014 * (b.hist.rev.length ? sum(last(b.hist.rev, 4)) / Math.min(4, b.hist.rev.length) : 0)) : 0);
  E.loanLimit = (b) => Math.max(0, r0(0.5 * E.annual(b, "rev") + 3000 + (b.structure === "corp" ? 8000 : b.structure === "llc" ? 2000 : 0)) - b.debt);
  E.value = function (b) {
    const prof = E.annual(b, "prof"), rev = E.annual(b, "rev");
    return r0(Math.max(3000, 4 * prof + 0.7 * rev) + b.cash - b.debt - b.edebt);
  };
  E.ownerWorth = (b, saleDiscount) => r0(b.savings + (1 - b.inv) * Math.max(0, E.value(b)) * (saleDiscount ? 0.9 : 1));

  // ---------------------------------------------------------------------------
  // Previewing and running a quarter
  // ---------------------------------------------------------------------------
  E.costs = function (b, plan) {
    const t = typeOf(b);
    const unitCost = t.cost * (0.85 + 0.03 * b.Q) * E.modProd(b, "cost");
    return {
      unitCost,
      payroll: E.payroll(b),
      rent: r0(t.rent * (1 + 1.0 * b.reach) * b.rentMult + E.OVERHEAD[b.reach]),
      marketing: E.mkSpend(b, plan.mk),
      quality: E.qtSpend(b, plan.qt),
      insurance: E.insurancePremium(b),
      fees: BB.structures[b.structure].quarterly,
      interest: r0(b.debt * E.rate(b) + b.edebt * 0.045),
    };
  };

  // Expected results for the plan (no luck), used for forecasts and by the simulator
  E.preview = function (b, plan, noise) {
    const t = typeOf(b);
    const c = E.costs(b, plan);
    const demand = E.demand(b, plan, noise);
    const capacity = E.capacity(b);
    const units = Math.min(demand, capacity);
    const price = t.price * plan.price;
    const revenue = units * price;
    const cogs = units * c.unitCost;
    const before = revenue - cogs - c.payroll - c.rent - c.marketing - c.quality - c.insurance - c.fees - c.interest;
    const taxable = Math.max(0, before - Math.min(b.nol, Math.max(0, before)));
    const tax = E.taxFor(b, taxable);
    return { demand, capacity, units, price, revenue, cogs, ...c, profit: before, tax, net: before - tax, fill: demand > 0 ? Math.min(1, capacity / demand) : 1 };
  };

  E.runQuarter = function (b, plan, rng) {
    rng = rng || Math.random;
    const t = typeOf(b);
    const noise = 0.9 + 0.2 * rng();
    const p = E.preview(b, plan, noise);
    const res = {
      qi: b.qi, label: E.qLabel(b.qi), season: E.season(b), phase: b.econ.phase, notes: [], quits: [], skillUps: [],
      demand: r0(p.demand), capacity: r0(p.capacity), units: r0(p.units), lost: Math.max(0, r0(p.demand - p.capacity)),
      price: p.price, revenue: r0(p.revenue), cogs: r0(p.cogs), payroll: p.payroll, rent: p.rent, marketing: p.marketing,
      quality: p.quality, insurance: p.insurance, fees: p.fees, interest: p.interest,
      cashBefore: b.cash, repBefore: b.rep, buzzBefore: b.buzz, qBefore: b.Q,
    };
    const profit = res.revenue - res.cogs - res.payroll - res.rent - res.marketing - res.quality - res.insurance - res.fees - res.interest;
    res.profit = profit;

    // taxes, with last quarters' losses carried forward
    let taxable = profit;
    if (profit < 0) { b.nol = Math.min(30000, b.nol + -profit); taxable = 0; }
    else { const use = Math.min(b.nol, profit); b.nol -= use; taxable = profit - use; res.nolUsed = use; }
    res.tax = E.taxFor(b, taxable);
    res.net = profit - res.tax;
    b.cash += res.net;

    // awareness, reputation and quality move for next quarter
    const scale = E.marketScale(b);
    const mEff = 28 * (1 - Math.exp(-res.marketing / (700 * scale))) * t.buzzMult;
    b.buzz = clamp(0.72 * b.buzz + mEff + 0.05 * b.rep + E.sellerBoost(b) * 10, 0, 100);
    const fill = p.fill;
    const target = clamp(20 + 7 * b.Q + 25 * (fill - 0.7), 5, 98);
    b.rep = clamp(b.rep + 0.3 * (target - b.rep), 0, 100);
    const expertGain = sum(b.staff.filter((e) => e.r === "expert").map((e) => 0.15 * E.skillMult(e.s) * E.prod(e)));
    const gain = [0, 0.18, 0.4, 0.65][plan.qt] + expertGain;
    b.Q = clamp(b.Q + gain - (0.12 + 0.012 * b.Q), 1, 10);

    // the team: morale, quitting, growing skills
    const bossEff = E.count(b, "manager") > 0 ? 0.5 : 1;
    const overworked = p.demand > p.capacity * 1.4;
    b.staff = b.staff.filter((e) => {
      const ratio = e.w / E.marketWage(b, e.r, e.s);
      const targetM = clamp(55 + 40 * (ratio - 1) + (profit > 0 ? 8 : -6) - (overworked ? 8 : 0), 10, 100);
      e.m = clamp(e.m + 0.5 * (targetM - e.m), 0, 100);
      e.t += 1;
      const quitP = (e.m < 35 ? 0.25 : ratio < 0.8 ? 0.12 : 0.02) * bossEff;
      if (rng() < quitP) { res.quits.push(e); return false; }
      if (e.t >= 6 && e.m >= 60 && e.s < 5 && rng() < 0.3) { e.s += 1; res.skillUps.push(e); e.t = 3; }
      return true;
    });

    // cash shortfall: sole proprietors dip into personal savings; then an emergency loan
    if (b.cash < 0) {
      const f = E.cover(b);
      res.shortfall = f;
    }

    b.hist.rev.push(res.revenue); b.hist.prof.push(res.profit); b.hist.units.push(res.units);
    b.stats.totalRev += res.revenue; b.stats.totalUnits += res.units;
    res.cashAfter = b.cash; res.repAfter = b.rep; res.qAfter = b.Q; res.buzzAfter = b.buzz;
    res.fill = fill;
    return res;
  };

  // Covers a negative cash balance. Returns what was used; sets b.over = "bankrupt" if it can't.
  E.cover = function (b) {
    const out = { savings: 0, emergency: 0, rescued: 0, bankrupt: false };
    let need = -b.cash;
    if (need <= 0) return out;
    if (b.structure === "solo" && b.savings > 0) { const x = Math.min(b.savings, need); b.savings -= x; need -= x; out.savings = x; }
    if (need > 0) {
      // the first year or so, lenders are a bit more forgiving of a brand-new business
      const room = Math.max(4000, r0(0.3 * E.annual(b, "rev"))) + (b.qi < 6 ? 6000 : 0) - b.edebt;
      const x = clamp(need, 0, Math.max(0, room));
      b.edebt += x; need -= x; out.emergency = x;
    }
    // one-time rescue: family steps in so a single early mistake isn't the end (a second one is)
    if (need > 0 && !b.flags.rescued) { b.flags.rescued = 1; b.edebt += need; out.rescued = need; need = 0; }
    if (need > 0) { out.bankrupt = true; b.over = "bankrupt"; b.cash = -need; }
    else b.cash = 0;
    return out;
  };

  // Charge a bill (a lawsuit, a repair...). Insurance covers 75% of insurable bills.
  // Sole proprietors can lose personal savings; LLCs and corporations are protected.
  E.charge = function (b, amount, insurable) {
    amount = r0(amount);
    const out = { amount, covered: 0, cash: 0, savings: 0, debt: 0 };
    if (insurable && b.ins) { out.covered = r0(amount * 0.75); amount -= out.covered; }
    const fromCash = Math.min(Math.max(0, b.cash), amount);
    b.cash -= fromCash; amount -= fromCash; out.cash = fromCash;
    if (amount > 0 && b.structure === "solo") { const x = Math.min(b.savings, amount); b.savings -= x; amount -= x; out.savings = x; }
    if (amount > 0) { b.edebt += amount; out.debt = amount; }
    return out;
  };

  // Move to the next quarter: the economy changes, effects expire
  E.advance = function (b, rng) {
    rng = rng || Math.random;
    const news = [];
    b.qi += 1;
    if (b.qi >= b.econ.until) {
      const r = rng(), old = b.econ.phase;
      let phase = r < 0.3 ? "boom" : r < 0.6 ? "recession" : "normal";
      if (phase === old) phase = "normal";
      if (old !== "normal" && phase === "normal") phase = "normal";
      b.econ = { phase, until: b.qi + 4 + Math.floor(rng() * 5) };
      if (phase !== old) news.push({ type: "econ", phase });
    }
    if (b.comp.level > 0 && b.qi >= b.comp.until) { b.comp.level -= 1; b.comp.until = b.qi + 4; news.push({ type: "comp-down" }); }
    b.mods = b.mods.filter((m) => m.until >= b.qi);
    b.hist.worth.push(E.ownerWorth(b));
    return news;
  };

  // ---------------------------------------------------------------------------
  // Owner actions
  // ---------------------------------------------------------------------------
  E.buyEquip = function (b) {
    const c = E.EQUIP_COST[b.equip];
    if (b.equip >= E.EQUIP_COST.length || b.cash < c) return false;
    b.cash -= c; b.equip += 1; return true;
  };
  E.expandCost = (b) => (b.reach >= E.REACH.length - 1 ? null : E.REACH_COST[b.reach + 1]);
  E.expand = function (b) {
    const c = E.expandCost(b);
    if (c == null || b.cash < c) return false;
    b.cash -= c; b.reach += 1; b.buzz = b.buzz * 0.7;    // people in the new market don't know you yet
    return true;
  };
  E.setStructure = function (b, s) {
    const f = BB.structures[s].fee;
    if (b.structure === s || b.cash < f) return false;
    if (b.structure === "corp") return false;
    if (s === "llc" && b.structure !== "solo") return false;
    b.cash -= f; b.structure = s;
    if (s === "corp") b.rep = clamp(b.rep + 4, 0, 100);   // more credible
    return true;
  };
  E.borrow = function (b, amt) { amt = Math.min(amt, E.loanLimit(b)); if (amt <= 0) return 0; b.debt += amt; b.cash += amt; return amt; };
  E.repay = function (b, amt) {
    let paid = 0;
    const e = Math.min(b.edebt, amt, Math.max(0, b.cash)); b.edebt -= e; b.cash -= e; paid += e;
    const d = Math.min(b.debt, amt - paid, Math.max(0, b.cash)); b.debt -= d; b.cash -= d; paid += d;
    return paid;
  };
  E.payYourself = function (b, amt) {
    amt = Math.min(amt, Math.max(0, b.cash));
    if (amt <= 0) return 0;
    const tax = b.structure === "corp" ? r0(amt * 0.08) : 0;     // dividends from a corporation are taxed again
    b.cash -= amt; b.savings += amt - tax;
    return amt - tax;
  };
  E.putIn = function (b, amt) { amt = Math.min(amt, Math.max(0, b.savings)); b.savings -= amt; b.cash += amt; return amt; };
  E.setInsurance = (b, on) => { b.ins = !!on; };
  E.investorOffer = function (b, pct) { return r0(pct * Math.max(8000, E.value(b)) * 0.85); };
  E.sellEquity = function (b, pct) {
    if (b.structure !== "corp" || b.inv + pct > 0.45) return 0;
    const cash = E.investorOffer(b, pct);
    b.inv += pct; b.cash += cash; return cash;
  };

  // ---------------------------------------------------------------------------
  // Events: picked at random each quarter from BB.events (see business-events.js)
  // ---------------------------------------------------------------------------
  E.rollEvent = function (b, rng) {
    rng = rng || Math.random;
    const forced = BB.scheduled ? BB.scheduled(b) : null;
    if (forced) return BB.events.find((e) => e.id === forced) || null;
    if (b.qi < 2 || rng() > 0.55) return null;
    const pool = BB.events.filter((e) => !e.once || !b.flags["ev_" + e.id]).map((e) => ({ e, w: e.weight ? e.weight(b) : 0 })).filter((x) => x.w > 0);
    const total = sum(pool.map((x) => x.w));
    if (!total) return null;
    let r = rng() * total;
    let pick = pool[pool.length - 1].e;
    for (const x of pool) { r -= x.w; if (r <= 0) { pick = x.e; break; } }
    if (pick.once) b.flags["ev_" + pick.id] = 1;
    return pick;
  };

  E.score = function (b, how) {
    if (how === "bankrupt") return { worth: r0(Math.max(0, b.savings)), how };
    return { worth: E.ownerWorth(b, how === "sold"), how };
  };

  if (typeof module !== "undefined" && module.exports) module.exports = BB;
})(typeof window !== "undefined" ? window : globalThis);
