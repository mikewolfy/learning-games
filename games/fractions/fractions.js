// Fraction Kitchen — customers order, you cook with fractions!
(function () {
  "use strict";

  const store = createProfileStore("fk", { prefer: "local" });
  const app = document.getElementById("app");
  const ORDERS_PER_DAY = 8;

  let P = null;   // player profile: { id, name, av, tips, unlocked, levels: { n: { s: stars, b: best tips } }, days }
  let G = null;   // the day being played

  // ===================================================================
  // Fraction math ({ n, d } objects) and how to show them
  // ===================================================================
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  const F = (n, d) => ({ n, d: d || 1 });
  const simp = (f) => { const g = gcd(f.n, f.d) || 1; return F(f.n / g, f.d / g); };
  const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => F(a.n * b.n, a.d * b.d);
  const eq = (a, b) => a.n * b.d === b.n * a.d;
  const cmp = (a, b) => a.n * b.d - b.n * a.d;
  const val = (f) => f.n / f.d;
  const mixed = (f) => { const s = simp(f); const w = Math.floor(s.n / s.d); return { w, n: s.n - w * s.d, d: s.d }; };

  const frHTML = (f) => (f.d === 1 ? `${f.n}` : `<span class="fr"><span class="n">${f.n}</span><span class="d">${f.d}</span></span>`);
  function mixHTML(f) {
    const m = mixed(f);
    if (m.n === 0) return `${m.w}`;
    return `<span class="mx">${m.w ? `<span class="w">${m.w}</span>` : ""}${frHTML(F(m.n, m.d))}</span>`;
  }
  const rawMix = (w, n, d) => (n === 0 ? `${w}` : `<span class="mx">${w ? `<span class="w">${w}</span>` : ""}${frHTML(F(n, d))}</span>`);

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (id) => document.getElementById(id);
  const money = (n) => "$" + n.toFixed(2);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function persist() { if (P) store.save(P, { tips: P.tips, u: P.unlocked }); }

  // ===================================================================
  // Content
  // ===================================================================
  const DISHES = [
    { e: "🥞", n: "pancakes", ing: ["flour", "milk", "sugar", "butter"] },
    { e: "🍪", n: "cookies", ing: ["flour", "sugar", "chocolate chips", "oats"] },
    { e: "🍕", n: "pizza dough", ing: ["flour", "water", "olive oil"] },
    { e: "🥤", n: "smoothies", ing: ["yogurt", "blueberries", "milk", "honey"] },
    { e: "🍲", n: "soup", ing: ["broth", "carrots", "beans", "rice"] },
    { e: "🍞", n: "bread", ing: ["flour", "water", "honey"] },
    { e: "🧁", n: "muffins", ing: ["flour", "sugar", "milk", "blueberries"] },
    { e: "🍋", n: "lemonade", ing: ["lemon juice", "sugar", "water"] },
    { e: "🥣", n: "trail mix", ing: ["raisins", "almonds", "oats", "pretzels"] },
    { e: "🍝", n: "pasta sauce", ing: ["tomatoes", "olive oil", "cheese"] },
  ];
  const CUSTOMERS = ["🧒", "👧", "👦", "👩", "👨", "🧑", "👵", "🧓", "👱", "🧔", "🐻", "🐶", "🐱", "🦊", "🐼", "🐯"];
  const GREETS = ["Hi, chef!", "Hello!", "Good morning!", "I'm so hungry!", "Quick, please!", "Yum, I love this place!", "Hi there!"];
  const LEVELS = [
    { n: 1, name: "Measuring Cups", emoji: "🥛", desc: "Read and fill measuring cups. Which fraction is more?", patience: 50 },
    { n: 2, name: "Same-Size Slices", emoji: "🍕", desc: "Add and subtract fractions with the same bottom number.", patience: 55 },
    { n: 3, name: "Different Sizes", emoji: "⚖️", desc: "Add and subtract fractions with different bottom numbers.", patience: 70 },
    { n: 4, name: "Double It!", emoji: "✖️", desc: "Make bigger and smaller batches. Mixed numbers!", patience: 70 },
    { n: 5, name: "Feed the Crowd", emoji: "🎉", desc: "Scale a recipe for any number of guests. Fractions of fractions!", patience: 85 },
  ];

  // ===================================================================
  // Visuals: measuring cups and fraction bars
  // ===================================================================
  let uid = 0;
  const CUP = { top: 12, bottom: 156, lb: 40, rb: 100, lt: 30, rt: 110 };
  const cupY = (t) => CUP.bottom - (CUP.bottom - CUP.top) * t;         // t = 0 (bottom) .. 1 (top)
  const cupL = (t) => CUP.lb - (CUP.lb - CUP.lt) * t;
  const cupR = (t) => CUP.rb + (CUP.rt - CUP.rb) * t;

  // fill: 0..1 how full. div: how many equal parts the cup is marked in (0 = no marks).
  function cupSVG(o) {
    const id = "c" + ++uid;
    const fill = clamp(o.fill || 0, 0, 1), div = o.div || 0;
    const y = cupY(fill);
    let ticks = "", bands = "";
    for (let k = 1; k <= div; k++) {
      const t = k / div, yy = cupY(t);
      if (k < div) ticks += `<line class="tick" x1="${cupL(t)}" x2="${cupL(t) + (k % (o.major || 99) === 0 ? 24 : 15)}" y1="${yy}" y2="${yy}"/>`;
      if (o.labels && k < div) ticks += `<text class="lbl" x="${cupL(t) - 4}" y="${yy + 4}" text-anchor="end">${o.labels[k] || ""}</text>`;
      if (o.pick) bands += `<rect class="band" data-k="${k}" x="0" width="140" y="${yy - (CUP.bottom - CUP.top) / div / 2}" height="${(CUP.bottom - CUP.top) / div}"/>`;
    }
    return `<svg class="cup ${o.pick ? "pick" : ""}" viewBox="0 0 140 170" role="img" aria-label="Measuring cup">
      <defs><clipPath id="${id}"><polygon points="${CUP.lb},${CUP.bottom} ${CUP.rb},${CUP.bottom} ${CUP.rt},${CUP.top} ${CUP.lt},${CUP.top}"/></clipPath></defs>
      <rect class="liq" x="0" y="${y}" width="140" height="${CUP.bottom - y + 2}" clip-path="url(#${id})"/>
      <polygon class="glass" points="${CUP.lb},${CUP.bottom} ${CUP.rb},${CUP.bottom} ${CUP.rt},${CUP.top} ${CUP.lt},${CUP.top}" fill-opacity="0"/>
      ${ticks}${bands}
      <path d="M${CUP.rt},${CUP.top + 20} q 22 6 0 46" fill="none" stroke="#6b7a89" stroke-width="3"/>
    </svg>`;
  }
  // a row of cups for any amount, e.g. 1 3/4 = one full cup and a 3/4 cup
  function cupsRow(f, small) {
    const v = val(f), whole = Math.floor(v + 1e-9), part = v - whole;
    let h = "";
    for (let i = 0; i < Math.min(whole, 6); i++) h += `<figure>${cupSVG({ fill: 1 })}</figure>`;
    if (part > 1e-6 || whole === 0) h += `<figure>${cupSVG({ fill: part, div: 0 })}</figure>`;
    return `<div class="cups" style="${small ? "transform:scale(0.7);transform-origin:center top;margin-bottom:-30px" : ""}">${h}</div>`;
  }
  function barSVG(f, color) {
    const s = F(f.n, f.d), w = 150, h = 26;
    const parts = Math.max(1, Math.min(s.d, 24));
    const total = Math.max(1, Math.ceil(val(s) - 1e-9)) ;
    let cells = "";
    for (let k = 0; k < parts * total; k++) {
      const filled = k < s.n * (parts / s.d);
      cells += `<rect x="${(k * w) / (parts * total)}" y="1" width="${w / (parts * total)}" height="${h - 2}" fill="${filled ? color || "#ffb86b" : "#fff"}" stroke="#6b7a89" stroke-width="1.5"/>`;
    }
    return `<svg class="bar" viewBox="0 0 ${w} ${h}" role="img" aria-label="Fraction bar">${cells}</svg>`;
  }
  const fig = (inner, cap) => `<figure>${inner}<figcaption>${cap}</figcaption></figure>`;

  // ===================================================================
  // Questions
  // ===================================================================
  // Each question: { type, mode: fill|mc|compare|widget, html (the order), answer, hint, sol, ...mode extras }
  function ingredients() { const d = pick(DISHES); const a = pick(d.ing); let b = pick(d.ing); let t = 0; while (b === a && t++ < 5) b = pick(d.ing); return { dish: d, a, b }; }

  function qFill(L) {
    const { dish, a } = ingredients();
    const d = pick(L <= 1 ? [2, 3, 4] : [2, 3, 4, 6, 8]), n = rnd(1, d - 1);
    const mult = L >= 2 && d <= 4 && Math.random() < 0.45 ? 2 : 1;          // sometimes the cup has more marks than the bottom number
    const div = d * mult;
    const labels = {};
    if (L <= 1) for (let k = 1; k < div; k++) { const s = simp(F(k, div)); labels[k] = s.d === 1 ? "" : `${s.n}/${s.d}`; }
    return {
      type: "fill", mode: "fill", dish, div, labels: L <= 1 ? labels : null, answer: F(n, d),
      html: `Fill the cup to <b>${frHTML(F(n, d))} cup</b> of ${a}.`,
      hint: mult > 1 ? `The cup has ${div} equal parts. ${frHTML(F(n, d))} is the same as ${frHTML(F(n * mult, div))}. Count up ${n * mult} marks!` : `The cup is split into ${div} equal parts. Count up ${n} of them from the bottom.`,
      sol: `The bottom number tells how many equal parts the cup has (${div}). The top number says how many to fill: ${n * mult}. So fill to the <b>${n * mult}${mult > 1 ? "th" : ""} mark</b>.`,
    };
  }

  function qRead(L) {
    const { dish, a } = ingredients();
    const d = pick(L <= 1 ? [2, 3, 4] : [3, 4, 5, 6, 8]), n = rnd(1, d - 1), ans = F(n, d);
    const cands = [F(d - n, d), F(n, d + 1), n + 1 < d ? F(n + 1, d) : F(Math.max(1, n - 1), d), d - 1 > n ? F(n, d - 1) : F(1, d), F(1, d), F(n, d + 2)];
    const opts = []; cands.forEach((c) => { if (c.n >= 1 && !eq(c, ans) && !opts.some((o) => eq(o, c)) && c.n < c.d + 0) opts.push(c); });
    const choices = shuffle([ans, ...shuffle(opts).slice(0, 3)]);
    return {
      type: "read", mode: "mc", dish, cupFill: n / d, cupDiv: d, options: choices, answer: ans,
      html: `Look at the cup of ${a}. <b>How much is in it?</b>`,
      hint: `The cup has ${d} equal parts, and ${n} of them are full.`,
      sol: `The cup is split into <b>${d}</b> equal parts and <b>${n}</b> are filled, so there is ${frHTML(ans)} cup.`,
    };
  }

  function qCompare(L) {
    const { dish, a } = ingredients();
    let A, B;
    for (let t = 0; t < 40; t++) {
      if (L <= 1) {
        if (Math.random() < 0.5) { const d = pick([4, 6, 8]); A = F(rnd(1, d - 1), d); B = F(rnd(1, d - 1), d); }
        else { const [d1, d2] = shuffle([2, 3, 4, 6, 8]).slice(0, 2); A = F(1, d1); B = F(1, d2); }
      } else if (L === 2) {
        if (Math.random() < 0.5) { const d = pick([5, 6, 8, 10]); A = F(rnd(1, d - 1), d); B = F(rnd(1, d - 1), d); }
        else { const n = rnd(1, 3), [d1, d2] = shuffle([4, 5, 6, 8]).slice(0, 2); A = F(n, Math.max(d1, n + 1)); B = F(n, Math.max(d2, n + 1)); }
      } else {
        const [d1, d2] = pick([[2, 4], [3, 6], [2, 3], [3, 4], [4, 8], [3, 5], [2, 5], [4, 6], [5, 10], [6, 8]]);
        A = F(rnd(1, d1 - 1), d1); B = F(rnd(1, d2 - 1), d2);
      }
      if (!(L <= 2 && eq(A, B)) && (L >= 3 || !eq(A, B))) break;
    }
    const c = cmp(A, B), ans = c > 0 ? 0 : c < 0 ? 1 : 2;
    const asks = Math.random() < 0.5 ? "more" : "less";
    const correctIdx = asks === "more" ? ans : ans === 2 ? 2 : 1 - ans;
    return {
      type: "compare", mode: "compare", dish, A, B, withEqual: L >= 3, answerIdx: correctIdx, answer: null,
      html: `Which is <b>${asks.toUpperCase()}</b> ${a}: ${frHTML(A)} cup or ${frHTML(B)} cup?`,
      hint: "Picture each one as a bar. The one that fills more of the bar is bigger.",
      hintBars: [A, B],
      sol: `${frHTML(A)} ${c === 0 ? "equals" : c > 0 ? "is bigger than" : "is smaller than"} ${frHTML(B)}. ${A.d !== B.d ? `Compare them using the same bottom number (${lcm(A.d, B.d)}): ${frHTML(F(A.n * (lcm(A.d, B.d) / A.d), lcm(A.d, B.d)))} and ${frHTML(F(B.n * (lcm(A.d, B.d) / B.d), lcm(A.d, B.d)))}.` : `They have the same bottom number, so the bigger top number wins.`}`,
    };
  }

  function qAddSame(L, subtract) {
    const { dish, a, b } = ingredients();
    const d = pick([3, 4, 5, 6, 8]);
    let x, y;
    if (subtract) { x = rnd(2, d); y = rnd(1, x - 1); } else { x = rnd(1, d - 1); y = rnd(1, d - 1); if (x + y > d + 2) y = 1; }
    const A = F(x, d), B = F(y, d), ans = subtract ? sub(A, B) : add(A, B);
    return {
      type: subtract ? "subsame" : "addsame", mode: "widget", dish, answer: simp(ans), operands: [A, B],
      html: subtract ? `You have ${frHTML(A)} cup of ${a} and use ${frHTML(B)} cup. <b>How much is left?</b>` : `The recipe needs ${frHTML(A)} cup of ${a} and ${frHTML(B)} cup of ${b}. <b>How much altogether?</b>`,
      hint: `The bottom numbers match (${d}), so just ${subtract ? "subtract" : "add"} the top numbers. Then simplify if you can.`,
      sol: `Same bottom number, so ${subtract ? "subtract" : "add"} the tops: ${x} ${subtract ? "−" : "+"} ${y} = ${ans.n}. That makes ${frHTML(ans)}${gcd(ans.n, ans.d) > 1 || ans.n >= ans.d ? ` = <b>${mixHTML(ans)}</b>` : ""}.`,
    };
  }

  function qUnlike(L, subtract) {
    const { dish, a, b } = ingredients();
    const pairs = [[2, 4], [2, 3], [3, 6], [4, 8], [2, 6], [3, 4], [4, 6], [2, 8], [6, 12], [3, 12], [4, 12], [2, 5], [5, 10]];
    let A, B, ans;
    for (let t = 0; t < 50; t++) {
      const [d1, d2] = shuffle(pick(pairs));
      A = F(rnd(1, d1 - 1), d1); B = F(rnd(1, d2 - 1), d2);
      if (subtract && cmp(A, B) <= 0) { const tmp = A; A = B; B = tmp; if (cmp(A, B) <= 0) continue; }
      ans = subtract ? sub(A, B) : add(A, B);
      if (val(ans) > 0 && val(ans) <= 2 && !(A.d === B.d)) break;
    }
    const L2 = lcm(A.d, B.d), A2 = F(A.n * (L2 / A.d), L2), B2 = F(B.n * (L2 / B.d), L2), r = subtract ? sub(A2, B2) : add(A2, B2);
    return {
      type: subtract ? "subunlike" : "addunlike", mode: "widget", dish, answer: simp(ans), operands: [A, B],
      html: subtract ? `You have ${frHTML(A)} cup of ${a} and use ${frHTML(B)} cup. <b>How much is left?</b>` : `Add ${frHTML(A)} cup of ${a} and ${frHTML(B)} cup of ${b}. <b>How much is that altogether?</b>`,
      hint: "The bottom numbers are different. Make them the same first (find a number both bottoms go into).",
      sol: `Make the bottoms match: ${L2} works for both. ${frHTML(A)} = ${frHTML(A2)} and ${frHTML(B)} = ${frHTML(B2)}. Then ${frHTML(A2)} ${subtract ? "−" : "+"} ${frHTML(B2)} = ${frHTML(r)}${gcd(r.n, r.d) > 1 || r.n >= r.d ? ` = <b>${mixHTML(r)}</b>` : ""}.`,
    };
  }

  function qScale(L) {
    const { dish, a } = ingredients();
    const d = pick([2, 3, 4, 6, 8]), n = rnd(1, d - 1), base = F(n, d);
    const half = Math.random() < 0.3, k = half ? 2 : pick([2, 3, 4]);
    const servings = half ? pick([4, 6, 8, 12]) : pick([2, 3, 4]);
    const want = half ? servings / 2 : servings * k;
    const ans = half ? simp(mul(base, F(1, 2))) : simp(mul(base, F(k, 1)));
    return {
      type: "scale", mode: "widget", dish, answer: ans, needMixed: val(ans) >= 1, operands: [base],
      html: `A batch of ${dish.n} for <b>${servings}</b> people uses ${frHTML(base)} cup of ${a}. <b>How much ${a} for ${want} people?</b>`,
      hint: half ? "You want half as many people, so use half as much." : `You want ${k} times as many people, so multiply the amount by ${k}.`,
      sol: half ? `Half as many people means half the ${a}: ${frHTML(base)} ÷ 2 = <b>${mixHTML(ans)}</b>.` : `${k} times as many people means ${k} times the ${a}: ${k} × ${frHTML(base)} = ${frHTML(mul(base, F(k, 1)))}${gcd(n * k, d) > 1 || n * k >= d ? ` = <b>${mixHTML(ans)}</b>` : ""}.`,
    };
  }

  function qMixedConv() {
    const d = pick([2, 3, 4, 5, 6, 8]);
    let n; do { n = rnd(d + 1, d * 3 - 1); } while (n % d === 0);
    const f = F(n, d), m = mixed(f);
    return {
      type: "mixedconv", mode: "widget", dish: pick(DISHES), answer: simp(f), needMixed: true, operands: [f],
      html: `The recipe says ${frHTML(f)} cups of flour. <b>Write that as a mixed number.</b>`,
      hint: `How many times does ${d} go into ${n}? That's the whole number. What's left over goes on top.`,
      sol: `${n} ÷ ${d} = ${m.w} with ${m.n} left over. So ${frHTML(f)} = <b>${mixHTML(f)}</b> (${m.w} whole and ${m.n}/${m.d}).`,
    };
  }

  function qCrowd() {
    const { dish, a } = ingredients();
    let base, s0, s1, ans;
    for (let t = 0; t < 60; t++) {
      [s0, s1] = pick([[4, 6], [4, 10], [6, 9], [6, 4], [8, 12], [8, 6], [12, 8], [12, 9], [4, 2], [6, 15], [4, 8]]);
      const d = pick([2, 3, 4, 6]); base = F(rnd(1, d * 2 - 1), d);
      ans = simp(mul(base, F(s1, s0)));
      if (ans.d <= 12 && val(ans) >= 0.25 && val(ans) <= 6) break;
    }
    const ratio = simp(F(s1, s0));
    return {
      type: "crowd", mode: "widget", dish, answer: ans, needMixed: val(ans) >= 1, operands: [base],
      html: `A recipe for <b>${s0}</b> people uses ${mixHTML(base)} cups of ${a}. <b>How much ${a} do you need for ${s1} people?</b>`,
      hint: `${s1} people is ${frHTML(ratio)} times as many as ${s0}. Multiply the amount by ${frHTML(ratio)}.`,
      sol: `${s1} ÷ ${s0} = ${frHTML(ratio)}, so multiply: ${mixHTML(base)} × ${frHTML(ratio)} = ${frHTML(simp(mul(base, ratio)))}${ans.d > 1 && ans.n >= ans.d ? ` = <b>${mixHTML(ans)}</b>` : ""}.`,
    };
  }

  function qFracOfFrac() {
    const { dish, a } = ingredients();
    const A = pick([F(1, 2), F(1, 3), F(1, 4), F(2, 3), F(3, 4)]), B = pick([F(1, 2), F(2, 3), F(3, 4), F(1, 3), F(3, 8), F(5, 6)]);
    const ans = simp(mul(A, B));
    return {
      type: "fracoffrac", mode: "widget", dish, answer: ans, operands: [A, B],
      html: `You have ${frHTML(B)} cup of ${a} and you use ${frHTML(A)} of it. <b>How much did you use?</b>`,
      hint: `"Of" means multiply. Multiply the tops, then multiply the bottoms.`,
      sol: `${frHTML(A)} of ${frHTML(B)} means ${frHTML(A)} × ${frHTML(B)} = ${frHTML(mul(A, B))}${gcd(mul(A, B).n, mul(A, B).d) > 1 ? ` = <b>${frHTML(ans)}</b>` : ""}.`,
    };
  }

  function qMixedAdd() {
    const { dish, a, b } = ingredients();
    let A, B, ans;
    for (let t = 0; t < 50; t++) {
      const [d1, d2] = pick([[2, 4], [4, 8], [2, 3], [3, 4], [3, 6], [4, 4], [2, 2], [6, 3]]);
      A = F(rnd(1, 2) * d1 + rnd(1, d1 - 1), d1); B = F(rnd(1, d2 - 1), d2);
      ans = simp(add(A, B));
      if (ans.d <= 8 && val(ans) <= 5) break;
    }
    return {
      type: "mixedadd", mode: "widget", dish, answer: ans, needMixed: true, operands: [A, B],
      html: `You pour ${mixHTML(A)} cups of ${a} and then add ${frHTML(B)} cup of ${b}. <b>How much is in the bowl?</b>`,
      hint: "Add the whole numbers and the fractions separately. Make the bottoms match for the fractions.",
      sol: `${mixHTML(A)} + ${frHTML(B)}: change to improper fractions or add the parts. The total is ${frHTML(add(A, B))} = <b>${mixHTML(ans)}</b>.`,
    };
  }

  function makeQuestion(L, lastType) {
    const gens = {
      1: [() => qFill(1), () => qRead(1), () => qCompare(1)],
      2: [() => qAddSame(2, false), () => qAddSame(2, true), () => qCompare(2), () => qFill(2), () => qRead(2)],
      3: [() => qUnlike(3, false), () => qUnlike(3, true), () => qCompare(3), () => qUnlike(3, false)],
      4: [() => qScale(4), () => qScale(4), () => qMixedConv(), () => qScale(4)],
      5: [() => qCrowd(), () => qFracOfFrac(), () => qMixedAdd(), () => qCrowd()],
    }[L];
    let q, t = 0;
    do { q = pick(gens)(); } while (q.type === lastType && t++ < 6);
    q.level = L;
    return q;
  }

  // ===================================================================
  // Checking answers
  // ===================================================================
  function judge(q, r) {
    if (q.mode === "fill") return r.k === undefined ? { ok: false } : { ok: eq(F(r.k, q.div), q.answer), form: "perfect" };
    if (q.mode === "mc") return { ok: eq(q.options[r.idx], q.answer), form: "perfect" };
    if (q.mode === "compare") return { ok: r.idx === q.answerIdx, form: "perfect" };
    const user = F(r.w * r.d + r.n, r.d);
    if (!eq(user, q.answer)) return { ok: false };
    const reduced = r.n === 0 || gcd(r.n, r.d) === 1, proper = r.n < r.d || r.n === 0;
    if (!reduced) return { ok: true, form: "unsimplified" };
    if (!proper && (q.needMixed || q.level >= 4)) return { ok: true, form: "improper" };
    return { ok: true, form: "perfect" };
  }

  // ===================================================================
  // Player and level select
  // ===================================================================
  function playerScreen() {
    G = null; P = null;
    PlayerPicker.show({
      app, store, title: "Fraction Kitchen", blurb: "Cook up fractions for hungry customers and earn tips!",
      summary: (p) => (p.u ? `Level ${p.u} unlocked • ${money(p.tips || 0)} in tips` : "New player"),
      onPlay: (id) => { P = store.load(id); if (!P) return playerScreen(); P.levels = P.levels || {}; P.tips = P.tips || 0; P.unlocked = P.unlocked || 1; store.setLast(id); homeScreen(); },
      onCreate: (name, av) => { P = { id: store.newId(), name, av, tips: 0, unlocked: 1, levels: {}, days: 0 }; persist(); homeScreen(); },
    });
  }

  function homeScreen() {
    if (G && G.timer) clearInterval(G.timer);
    G = null;
    app.innerHTML = `
      <div class="pbar"><div class="who">${esc(P.av)} ${esc(P.name)}</div><button class="btn small secondary" id="switchBtn">👥 Switch player</button></div>
      <div class="fund">💰 Tips earned so far: ${money(P.tips)}</div>
      <div class="card">
        <h3 class="section-title">Pick a day in the kitchen</h3>
        <p class="muted" style="margin:0 0 4px">Each day has ${ORDERS_PER_DAY} orders. Get 2 stars to open the next level!</p>
        <div class="levels">
          ${LEVELS.map((l) => {
            const locked = l.n > P.unlocked, lv = P.levels[l.n] || { s: 0, b: 0 };
            return `<button class="level" data-l="${l.n}" ${locked ? "disabled" : ""}><span class="em">${locked ? "🔒" : l.emoji}</span><b>Level ${l.n}: ${esc(l.name)}</b><small>${esc(l.desc)}</small><span class="st">${"★".repeat(lv.s)}${"☆".repeat(3 - lv.s)}</span>${lv.b ? `<span class="bestt">best ${money(lv.b)}</span>` : ""}</button>`;
          }).join("")}
        </div>
      </div>`;
    app.querySelectorAll("[data-l]").forEach((b) => (b.onclick = () => startDay(Number(b.dataset.l))));
    $("switchBtn").onclick = playerScreen;
  }

  // ===================================================================
  // A day in the kitchen
  // ===================================================================
  function startDay(level) {
    G = { level, def: LEVELS[level - 1], i: 0, tips: 0, right: 0, streak: 0, bestStreak: 0, log: [], q: null, lastType: null, timer: null, locked: false };
    nextOrder();
  }

  function nextOrder() {
    if (G.i >= ORDERS_PER_DAY) return endDay();
    G.i++;
    G.q = makeQuestion(G.level, G.lastType);
    G.lastType = G.q.type;
    G.tries = 0; G.locked = false; G.hinted = false; G.t0 = Date.now(); G.pat = G.def.patience * 1000;
    G.resp = { w: 0, n: 0, d: 2 }; G.pickK = undefined; G.disabled = new Set();
    render();
    clearInterval(G.timer);
    G.timer = setInterval(tick, 250);
  }

  const speedMult = () => { const f = (Date.now() - G.t0) / G.pat; return f <= 0.4 ? 1 : clamp(1 - ((f - 0.4) / 0.6) * 0.5, 0.5, 1); };

  function tick() {
    if (!G || G.locked) return;
    const f = clamp((Date.now() - G.t0) / G.pat, 0, 1);
    const bar = $("pat");
    if (bar) { bar.firstElementChild.style.width = (1 - f) * 100 + "%"; bar.className = "patience " + (f > 0.75 ? "low" : f > 0.4 ? "mid" : ""); }
    if (f >= 1) { clearInterval(G.timer); reveal("timeout"); }
  }

  function render() {
    const q = G.q, cust = pick(CUSTOMERS);
    app.innerHTML = `
      <div class="hud"><div><small>Order</small><b>${G.i} of ${ORDERS_PER_DAY}</b></div><div><small>💰 Tips today</small><b id="tips">${money(G.tips)}</b></div><div><small>🔥 Streak</small><b id="streak">${G.streak}</b></div></div>
      <div class="kitchen">
        <div class="customer"><div class="cust">${cust}</div><div class="bubble">${pick(GREETS)} <span class="dish">${q.dish.e} Order: ${q.dish.n}</span><div class="q">${q.html}</div></div></div>
        <div class="patience" id="pat"><i style="width:100%"></i></div>
        <div class="work" id="work">${workHTML()}</div>
        <div class="msg" id="msg"></div>
        <div id="extra"></div>
      </div>
      <p style="text-align:center;margin-top:10px"><button class="btn secondary small" id="quitBtn">Leave the kitchen</button></p>`;
    wire();
    $("quitBtn").onclick = () => { clearInterval(G.timer); homeScreen(); };
  }

  function workHTML() {
    const q = G.q;
    if (q.mode === "fill") return `<div class="cups">${cupSVG({ fill: G.pickK ? G.pickK / q.div : 0, div: q.div, labels: q.labels, pick: true, major: q.div % 2 === 0 ? q.div / 2 : 99 })}</div><div class="row"><button class="btn acc" id="pourBtn" ${G.pickK ? "" : "disabled"}>Pour! 🫗</button></div>`;
    if (q.mode === "mc") return `<div class="cups">${cupSVG({ fill: q.cupFill, div: q.cupDiv })}</div><div class="mc">${q.options.map((o, i) => `<button class="btn secondary" data-i="${i}" ${G.disabled.has(i) ? "disabled" : ""}>${frHTML(o)}</button>`).join("")}</div>`;
    if (q.mode === "compare") return `<div class="mc">${[q.A, q.B].map((o, i) => `<button class="btn secondary" data-i="${i}" ${G.disabled.has(i) ? "disabled" : ""}>${frHTML(o)} cup</button>`).join("")}${q.withEqual ? `<button class="btn secondary" data-i="2" style="grid-column:1/-1;font-size:1.1rem" ${G.disabled.has(2) ? "disabled" : ""}>They're the same amount</button>` : ""}</div>`;
    return widgetHTML();
  }

  function widgetHTML() {
    const r = G.resp, f = F(r.w * r.d + r.n, r.d);
    return `<div class="widget">
        ${col("w", "whole", r.w, true)}${col("n", "top", r.n, true)}${col("d", "bottom", r.d, true, "den")}
      </div>
      <div class="preview" id="preview">${rawMix(r.w, r.n, r.d)}${val(f) > 0 ? "" : ""}</div>
      ${cupsRow(f, true)}
      <div class="row"><button class="btn acc" id="checkBtn">Serve it! 🍽️</button></div>`;
  }
  const col = (k, label, v, _x, cls) => `<div class="col ${cls || ""}"><small>${label}</small><button data-s="${k}" data-v="1" aria-label="more ${label}">+</button><div class="val">${v}</div><button data-s="${k}" data-v="-1" aria-label="less ${label}">−</button></div>`;

  function wire() {
    const q = G.q, w = $("work");
    if (q.mode === "fill") {
      w.querySelectorAll(".band").forEach((b) => (b.onclick = () => { if (G.locked) return; G.pickK = Number(b.dataset.k); w.innerHTML = workHTML(); wire(); }));
      const pb = $("pourBtn"); if (pb) pb.onclick = () => submit({ k: G.pickK });
    } else if (q.mode === "mc" || q.mode === "compare") {
      w.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => submit({ idx: Number(b.dataset.i) }, b)));
    } else {
      w.querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => {
        if (G.locked) return;
        const k = b.dataset.s, lim = { w: [0, 9], n: [0, 40], d: [1, 24] }[k];
        G.resp[k] = clamp(G.resp[k] + Number(b.dataset.v), lim[0], lim[1]);
        w.innerHTML = widgetHTML(); wire();
      }));
      const cb = $("checkBtn"); if (cb) cb.onclick = () => submit({ ...G.resp });
    }
  }

  // ---------------- answering ----------------
  function msg(text, cls) { const m = $("msg"); if (m) { m.innerHTML = text; m.className = "msg " + (cls || ""); } }

  function hintVisual(q) {
    if (q.mode === "compare") return `<div class="cups">${q.hintBars.map((f) => fig(barSVG(f), frHTML(f))).join("")}</div>`;
    if (q.operands) return `<div class="cups">${q.operands.map((f) => fig(barSVG(f), mixHTML(f))).join("")}</div>`;
    return "";
  }

  function submit(r, btn) {
    if (G.locked) return;
    const q = G.q, res = judge(q, r);
    G.tries++;
    if (res.ok) {
      clearInterval(G.timer);
      let tip = (3 + 2 * G.level) * speedMult() * (G.tries === 1 ? 1 : 0.6) * (res.form === "perfect" ? 1 : 0.6);
      G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
      tip += Math.min(5, G.streak - 1) * 0.5;
      tip = Math.round(tip * 4) / 4;
      G.tips += tip; G.right++; G.locked = true;
      G.log.push({ q, ok: true });
      const note = res.form === "unsimplified" ? ` Right amount! Can you simplify it? It's <b>${mixHTML(q.answer)}</b>.` : res.form === "improper" ? ` Right amount! As a mixed number it's <b>${mixHTML(q.answer)}</b>.` : "";
      msg(`😋 Delicious! <span class="tipfly">+${money(tip)}</span>${note}`, "good");
      if (btn) btn.classList.add("correct");
      $("tips").textContent = money(G.tips); $("streak").textContent = G.streak;
      showNext(res.form === "perfect" ? 1100 : 3200);
    } else if (G.tries === 1) {
      G.streak = 0; $("streak").textContent = 0;
      if (btn) { btn.classList.add("incorrect"); G.disabled.add(Number(btn.dataset.i)); btn.disabled = true; }
      G.hinted = true;
      msg(`Not quite. Try again! 💡 ${q.hint}`, "hint");
      $("extra").innerHTML = hintVisual(q);
    } else {
      if (btn) btn.classList.add("incorrect");
      reveal("wrong");
    }
  }

  function reveal(why) {
    clearInterval(G.timer);
    if (G.locked) return;
    G.locked = true; G.streak = 0; $("streak").textContent = 0;
    G.log.push({ q: G.q, ok: false });
    const q = G.q;
    if (q.mode === "mc" || q.mode === "compare") document.querySelectorAll("#work [data-i]").forEach((b) => { b.disabled = true; if (Number(b.dataset.i) === (q.mode === "mc" ? q.options.findIndex((o) => eq(o, q.answer)) : q.answerIdx)) b.classList.add("correct"); });
    const ans = q.mode === "mc" ? `<b>${frHTML(q.options.find((o) => eq(o, q.answer)))}</b>` : q.mode === "fill" ? `${frHTML(q.answer)} cup` : q.mode === "compare" ? "" : `<b>${mixHTML(q.answer)}</b>`;
    msg(why === "timeout" ? "⏰ Oh no, the customer got tired of waiting and left!" : "Not this time. Let's see how it works:", "bad");
    $("extra").innerHTML = `${hintVisual(q)}<div class="explain">${ans ? `The answer is ${ans}. ` : ""}${q.sol}</div>`;
    showNext(0);
  }

  function showNext(autoMs) {
    const extra = $("extra");
    if (autoMs) { setTimeout(() => { if (G && G.locked && G.q) go(); }, autoMs); return; }
    const b = document.createElement("div"); b.className = "row"; b.innerHTML = `<button class="btn acc" id="nextBtn">Next customer ▶</button>`;
    extra.appendChild(b); $("nextBtn").onclick = go;
  }
  let advancing = false;
  function go() { if (advancing) return; advancing = true; setTimeout(() => { advancing = false; }, 300); nextOrder(); }

  // ===================================================================
  // End of the day
  // ===================================================================
  function endDay() {
    clearInterval(G.timer);
    const acc = G.right / ORDERS_PER_DAY, stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0;
    const lv = P.levels[G.level] || { s: 0, b: 0 };
    const newBest = G.tips > lv.b;
    P.levels[G.level] = { s: Math.max(lv.s, stars), b: Math.max(lv.b, G.tips) };
    P.tips = Math.round((P.tips + G.tips) * 100) / 100; P.days = (P.days || 0) + 1;
    let unlocked = false;
    if (stars >= 2 && G.level === P.unlocked && G.level < LEVELS.length) { P.unlocked = G.level + 1; unlocked = true; }
    persist();
    const missed = G.log.filter((x) => !x.ok);
    const g = G;
    app.innerHTML = `
      <div class="card center">
        <p class="muted" style="margin:0">Level ${g.level}: ${esc(g.def.name)} • Day complete!</p>
        <div class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>
        <p class="big-num">${money(g.tips)}</p><p class="muted" style="margin:0">in tips today${newBest && lv.b ? " 🏆 a new best!" : ""}</p>
        <div class="end-stats"><div><b>${g.right}/${ORDERS_PER_DAY}</b>orders served</div><div><b>${Math.round(acc * 100)}%</b>accuracy</div><div><b>${g.bestStreak}</b>best streak</div></div>
        ${unlocked ? `<p class="result-text">🔓 Level ${P.unlocked} is now open: ${esc(LEVELS[P.unlocked - 1].name)}!</p>` : stars < 2 && g.level === P.unlocked ? `<p class="muted">Get 2 stars (at least 70%) to open the next level.</p>` : ""}
        ${missed.length ? `<h3 class="section-title" style="margin:10px 0 4px">Ones to practice</h3><div class="review">${missed.map((x) => `<div>${x.q.html}<br>→ <b>${x.q.mode === "mc" ? frHTML(x.q.options.find((o) => eq(o, x.q.answer))) : x.q.mode === "fill" ? frHTML(x.q.answer) + " cup" : x.q.mode === "compare" ? "see the bars" : mixHTML(x.q.answer)}</b></div>`).join("")}</div>` : `<p class="result-text">🌟 Perfect day! Every customer left happy.</p>`}
        <div class="row"><button class="btn good" id="againBtn">Play this level again</button>${P.unlocked > g.level ? `<button class="btn acc" id="nextLvlBtn">Next level ▶</button>` : ""}<button class="btn secondary" id="homeBtn">All levels</button></div>
      </div>`;
    window.scrollTo({ top: 0 });
    $("againBtn").onclick = () => startDay(g.level);
    const nl = $("nextLvlBtn"); if (nl) nl.onclick = () => startDay(g.level + 1);
    $("homeBtn").onclick = homeScreen;
  }

  window.FK_DEBUG = () => ({ G, P, LEVELS, makeQuestion, judge, eq, mixed, simp, F });
  playerScreen();
})();
