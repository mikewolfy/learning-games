// Code Quest — program a robot with blocks to reach the flag.
(function () {
  "use strict";
  const store = createProfileStore("cq", { prefer: "local" });
  const app = document.getElementById("app");
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // east, south, west, north
  const MAX_STEPS = 700;

  // ---------------------------------------------------------------
  // Levels.  Grid: # wall, . floor, S start, G flag, * gem.  sol = a known solution (also used by tests)
  //   F forward, L turn left, R turn right, xN[...] repeat N times, u[...] repeat until flag,
  //   iA[then|else] if (A = a ahead clear, l left clear, r right clear)
  // ---------------------------------------------------------------
  const WORLDS = [
    { name: "Move It", emoji: "🚶", color: "#2b8a3e", blocks: ["F", "L", "R"] },
    { name: "Loop Land", emoji: "🔁", color: "#1971c2", blocks: ["F", "L", "R", "rep"] },
    { name: "Decision Dunes", emoji: "🔀", color: "#c2410c", blocks: ["F", "L", "R", "rep", "if", "until"] },
  ];
  const LEVELS = [
    { w: 0, name: "First steps", dir: 0, grid: ["S..G"], sol: "F F F", intro: "Tap <b>Forward</b> to add a block to your program. Then press <b>Run</b>! The robot does each block in order." },
    { w: 0, name: "Take a turn", dir: 0, grid: ["S..", "##.", "##G"], sol: "F F R F F", intro: "Use <b>Turn right</b> to face a new way. The robot turns without moving." },
    { w: 0, name: "Grab the gem", dir: 0, grid: ["S.*.", "###.", "###G"], sol: "F F F R F F", intro: "Gems 💎 are on the way. The robot must pick up <b>every gem</b> before it reaches the flag." },
    { w: 0, name: "The U-turn", dir: 0, grid: ["S.#.G", "#.#.#", "#...#"], sol: "F R F F L F F L F F R F", intro: "Turn left and right to snake through the maze. Plan the whole path first!" },
    { w: 0, name: "Long way round", dir: 0, grid: ["S*...", "####.", "G*..."], sol: "F F F F R F F R F F F F", intro: "Careful: right turn means a turn to <i>the robot's</i> right, not yours." },
    { w: 0, name: "Gem maze", dir: 0, grid: ["S.*####", "##.####", "##...*G"], sol: "F F R F F L F F F F", intro: "Mix everything you know. Remember the gems!" },

    { w: 1, name: "Repeat it!", dir: 0, grid: ["S.....G"], sol: "x6[F]", intro: "A <b>Repeat</b> block does what's inside it again and again. First tap Repeat, then tap <b>Forward</b> to put it inside. Tap the number to change it." },
    { w: 1, name: "Stairs", dir: 0, grid: ["S.##", "#..#", "##..", "###G"], sol: "x3[F R F L]", intro: "Spot the pattern: Forward, Right, Forward, Left. Repeat it!" },
    { w: 1, name: "Around the block", dir: 0, grid: ["S..", "##.", "G.."], sol: "x3[F F R]", intro: "The robot walks around a square. What repeats?" },
    { w: 1, name: "Gem corners", dir: 0, grid: ["S..*", "G##.", ".##.", "*..*"], sol: "x3[F F F R] F F", intro: "A loop and a few extra steps. Repeats don't have to be the whole program." },
    { w: 1, name: "Big staircase", dir: 0, grid: ["S.####", "#*.###", "##.*##", "###..#", "####..", "#####G"], sol: "x5[F R F L]", intro: "A bigger staircase, the same pattern. Loops save lots of blocks!" },
    { w: 1, name: "Two loops", dir: 0, grid: ["S.....", "#####.", "#####*", "#####G"], sol: "x5[F] R x3[F]", intro: "You can use more than one Repeat in a program." },

    { w: 2, name: "Until the flag", dir: 0, grid: ["S.......G"], sol: "u[F]", intro: "<b>Repeat until flag</b> keeps going until the robot reaches the flag. No counting needed!" },
    { w: 2, name: "If the path is blocked", dir: 0, grid: ["S...", "###.", "G..*"], sol: "u[ia[F|R]]", intro: "An <b>If</b> block checks something. <i>If the way ahead is clear</i>, it does the first part; otherwise it does the second part. Tap the words to change what it checks." },
    { w: 2, name: "Turn the other way", dir: 0, grid: ["G..*", "###.", "S..."], sol: "u[ia[F|L]]", intro: "The same idea, but this path turns the other way. Which turn goes in the Else part?", start: [0, 2] },
    { w: 2, name: "Snake", dir: 0, grid: ["S....", "####.", ".....", ".####", "....G"], sol: "u[ia[F|ir[R|L]]]", intro: "This snake turns both ways. Put an If <i>inside</i> an If: tap the If's Else area to choose where new blocks go." },
    { w: 2, name: "The comb", dir: 0, grid: ["#*#*#*#", "#.#.#.#", "S.....G"], sol: "x3[F L F F L L F F L F]", intro: "Gems hide down the side tunnels. Go in, turn around, and come back out. Then repeat for each tunnel!", start: [0, 2] },
    { w: 2, name: "Follow the wall", dir: 0, grid: ["S.#...G", "#.#.#.#", "#.....#", "#######"], sol: "u[ir[R F|ia[F|L]]]", intro: "A real maze! Trick: <i>always keep a wall on your right</i>. If right is clear, turn right and go. Else if ahead is clear, go forward. Else turn left." },
  ];
  LEVELS.forEach((l, i) => { l.id = i; l.rows = l.grid.length; l.cols = l.grid[0].length; });

  // ---------------------------------------------------------------
  // Programs: array of { t: "F"|"L"|"R" } | { t: "rep", n, body } | { t: "until", body } | { t: "if", c, a, b }
  // ---------------------------------------------------------------
  function parse(src) {
    let i = 0;
    const ws = () => { while (src[i] === " ") i++; };
    function list(end) {
      const out = [];
      for (;;) {
        ws();
        if (i >= src.length || end.includes(src[i])) return out;
        const ch = src[i];
        if (ch === "F" || ch === "L" || ch === "R") { out.push({ t: ch }); i++; }
        else if (ch === "x") { i++; let n = ""; while (/\d/.test(src[i])) n += src[i++]; i++; const body = list("]"); i++; out.push({ t: "rep", n: Number(n), body }); }
        else if (ch === "u") { i += 2; const body = list("]"); i++; out.push({ t: "until", body }); }
        else if (ch === "i") { const c = src[i + 1]; i += 3; const a = list("|"); i++; const b = list("]"); i++; out.push({ t: "if", c, a, b }); }
        else i++;
      }
    }
    return list("");
  }
  const countBlocks = (l) => l.reduce((s, b) => s + 1 + (b.body ? countBlocks(b.body) : 0) + (b.a ? countBlocks(b.a) + countBlocks(b.b) : 0), 0);
  const parOf = (lv) => countBlocks(parse(lv.sol));

  // Run a program and record every state, so the page can animate it.
  function simulate(lv, prog) {
    let x = 0, y = 0, d = lv.dir;
    const gems = new Set();
    lv.grid.forEach((row, yy) => [...row].forEach((c, xx) => { if (c === "S") { x = xx; y = yy; } if (c === "*") gems.add(xx + "," + yy); }));
    const open = (nx, ny) => nx >= 0 && ny >= 0 && nx < lv.cols && ny < lv.rows && lv.grid[ny][nx] !== "#";
    const total = gems.size, trace = [{ x, y, d, gems: gems.size }];
    let steps = 0, res = null;
    const atGoal = () => lv.grid[y][x] === "G";
    const rec = (note) => trace.push({ x, y, d, gems: gems.size, note });
    const look = (c) => { const dd = c === "a" ? d : c === "r" ? (d + 1) % 4 : (d + 3) % 4; return open(x + DIRS[dd][0], y + DIRS[dd][1]); };
    function exec(list) {
      for (const b of list) {
        if (res) return;
        if (++steps > MAX_STEPS) { res = "loop"; return; }
        if (b.t === "F") {
          const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
          if (!open(nx, ny)) { res = "bump"; rec("bump"); return; }
          x = nx; y = ny; gems.delete(x + "," + y); rec();
          if (atGoal() && gems.size === 0) { res = "win"; return; }
        } else if (b.t === "L") { d = (d + 3) % 4; rec(); }
        else if (b.t === "R") { d = (d + 1) % 4; rec(); }
        else if (b.t === "rep") { for (let k = 0; k < b.n && !res; k++) exec(b.body); }
        else if (b.t === "until") { let g = 0; while (!res && !atGoal()) { if (!b.body.length || g++ > 300) { res = "loop"; return; } exec(b.body); } }
        else if (b.t === "if") exec(look(b.c) ? b.a : b.b);
      }
    }
    exec(prog);
    if (!res) res = atGoal() ? (gems.size ? "gems" : "win") : "short";
    return { trace, res, total, blocks: countBlocks(prog) };
  }

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  let P = null, L = null;      // profile, current level state
  const persist = () => P && store.save(P, { n: Object.values(P.stars).filter((s) => s > 0).length, st: Object.values(P.stars).reduce((a, b) => a + b, 0) });

  function playerScreen() {
    P = null; L = null;
    PlayerPicker.show({
      app, store, title: "Code Quest", blurb: "Program a robot with blocks. No typing needed!",
      summary: (p) => (p.n ? `${p.n} of ${LEVELS.length} levels • ${p.st}★` : "New player"),
      onPlay: (id) => { P = store.load(id); if (!P) return playerScreen(); P.stars = P.stars || {}; store.setLast(id); home(); },
      onCreate: (name, av) => { P = { id: store.newId(), name, av, stars: {} }; persist(); home(); },
    });
  }
  const unlocked = (i) => i === 0 || (P.stars[i - 1] || 0) > 0;

  function home() {
    if (L && L.timer) clearInterval(L.timer);
    L = null;
    const total = Object.values(P.stars).reduce((a, b) => a + b, 0);
    app.innerHTML = `
      <div class="pbar"><div class="who">${esc(P.av)} ${esc(P.name)}</div><button class="btn small secondary" id="switchBtn">👥 Switch player</button></div>
      <div class="fund">⭐ ${total} of ${LEVELS.length * 3} stars</div>
      ${WORLDS.map((w, wi) => `<div class="card" style="border-top:8px solid ${w.color}"><h3 class="section-title" style="color:${w.color}">${w.emoji} World ${wi + 1}: ${w.name}</h3><div class="lvgrid">
        ${LEVELS.filter((l) => l.w === wi).map((l) => `<button class="lv" data-i="${l.id}" ${unlocked(l.id) ? "" : "disabled"}><b>${unlocked(l.id) ? l.id + 1 : "🔒"}</b><span>${esc(l.name)}</span><i>${"★".repeat(P.stars[l.id] || 0)}${"☆".repeat(3 - (P.stars[l.id] || 0))}</i></button>`).join("")}
      </div></div>`).join("")}`;
    app.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => openLevel(Number(b.dataset.i))));
    $("switchBtn").onclick = playerScreen;
  }

  function openLevel(i) {
    if (L && L.timer) clearInterval(L.timer);
    const lv = LEVELS[i];
    L = { lv, prog: [], target: null, containers: [], timer: null, frame: 0, sim: null, speed: 1, msg: "", done: false, showIntro: true };
    L.target = L.prog;
    screen();
  }

  // ---------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------
  const CELL = 40;
  function boardSVG(state) {
    const lv = L.lv, W = lv.cols * CELL, H = lv.rows * CELL;
    let s = `<svg class="board" viewBox="0 0 ${W} ${H}" role="img" aria-label="Game board">`;
    const gemsLeft = new Set();
    lv.grid.forEach((row, y) => [...row].forEach((c) => c));
    for (let y = 0; y < lv.rows; y++) for (let x = 0; x < lv.cols; x++) {
      const c = lv.grid[y][x];
      s += `<rect x="${x * CELL}" y="${y * CELL}" width="${CELL}" height="${CELL}" class="${c === "#" ? "wall" : "floor"}"/>`;
    }
    // remaining gems: compute from trace progress
    const have = collected(state);
    for (let y = 0; y < lv.rows; y++) for (let x = 0; x < lv.cols; x++) {
      const c = lv.grid[y][x];
      if (c === "G") s += `<text x="${x * CELL + CELL / 2}" y="${y * CELL + CELL * 0.72}" font-size="26" text-anchor="middle">🏁</text>`;
      if (c === "*" && !have.has(x + "," + y)) s += `<text x="${x * CELL + CELL / 2}" y="${y * CELL + CELL * 0.7}" font-size="22" text-anchor="middle">💎</text>`;
    }
    const cx = state.x * CELL + CELL / 2, cy = state.y * CELL + CELL / 2;
    s += `<g class="robot ${state.note === "bump" ? "bump" : ""}" style="transform:translate(${cx}px,${cy}px)"><g style="transform:rotate(${state.d * 90}deg)"><circle r="14" fill="#5b6cf5" stroke="#2f3bb0" stroke-width="3"/><polygon points="20,0 10,-8 10,8" fill="#ffd23f" stroke="#2f3bb0" stroke-width="2"/><circle cx="-2" cy="-5" r="3" fill="#fff"/><circle cx="-2" cy="5" r="3" fill="#fff"/></g></g></svg>`;
    return s;
  }
  function collected(state) {
    const lv = L.lv, set = new Set();
    if (!L.sim) return set;
    for (let i = 0; i <= L.frame && i < L.sim.trace.length; i++) { const t = L.sim.trace[i]; const k = t.x + "," + t.y; if (lv.grid[t.y][t.x] === "*") set.add(k); }
    return set;
  }

  const LABEL = { F: "⬆️ Forward", L: "↰ Turn left", R: "↱ Turn right", rep: "🔁 Repeat", if: "🔀 If", until: "🏁 Repeat until flag" };
  const COND = { a: "path ahead is clear", l: "left is clear", r: "right is clear" };
  const CONDS = ["a", "l", "r"];

  function listHTML(list, label) {
    const idx = L.containers.length; L.containers.push(list);
    const active = L.target === list;
    let h = `<div class="blist ${active ? "active" : ""}" data-c="${idx}">`;
    if (!list.length) h += `<div class="empty">${active ? "Tap a block to add it here" : "Tap here to add blocks"}</div>`;
    list.forEach((b, bi) => {
      h += `<div class="blk t-${b.t}">`;
      if (b.t === "rep") h += `<div class="bhead"><span>🔁 Repeat</span><button class="num" data-n="${idx}:${bi}">${b.n}×</button><button class="x" data-x="${idx}:${bi}" aria-label="Remove">✕</button></div>${listHTML(b.body)}`;
      else if (b.t === "until") h += `<div class="bhead"><span>🏁 Repeat until flag</span><button class="x" data-x="${idx}:${bi}" aria-label="Remove">✕</button></div>${listHTML(b.body)}`;
      else if (b.t === "if") h += `<div class="bhead"><span>🔀 If</span><button class="num cond" data-cond="${idx}:${bi}">${COND[b.c]}</button><button class="x" data-x="${idx}:${bi}" aria-label="Remove">✕</button></div>${listHTML(b.a)}<div class="elsel">Else</div>${listHTML(b.b)}`;
      else h += `<div class="bhead"><span>${LABEL[b.t]}</span><button class="x" data-x="${idx}:${bi}" aria-label="Remove">✕</button></div>`;
      h += `</div>`;
    });
    return h + `</div>`;
  }

  function screen() {
    const lv = L.lv, w = WORLDS[lv.w], par = parOf(lv);
    L.containers = [];
    const prog = listHTML(L.prog);
    const sim = L.sim, st = sim ? sim.trace[Math.min(L.frame, sim.trace.length - 1)] : { x: 0, y: 0, d: lv.dir };
    let start = st; if (!sim) { lv.grid.forEach((row, y) => [...row].forEach((c, x) => { if (c === "S") start = { x, y, d: lv.dir }; })); }
    const running = !!L.timer;
    app.innerHTML = `
      <div class="qtop"><button class="btn small secondary" id="backBtn">← Levels</button><b>Level ${lv.id + 1}: ${esc(lv.name)}</b><span class="muted">Par ${par} blocks</span></div>
      ${L.showIntro ? `<div class="intro">💡 ${lv.intro}</div>` : ""}
      <div class="qgrid">
        <div class="boardwrap">${boardSVG(sim ? st : start)}
          <div class="ctrl"><button class="btn good" id="runBtn" ${running ? "disabled" : ""}>▶ Run</button><button class="btn secondary" id="resetBtn">↺ Reset</button><button class="btn secondary small" id="speedBtn">${L.speed === 1 ? "🐢 Slow" : "🐇 Fast"}</button></div>
          <div class="qmsg ${L.done === "win" ? "good" : L.msg ? "bad" : ""}" id="qmsg">${L.msg}</div>
        </div>
        <div class="progwrap">
          <div class="palette">${w.blocks.concat(WORLDS.slice(0, lv.w).length ? [] : []).filter((b) => allowed(lv, b)).map((b) => `<button class="pal t-${b}" data-add="${b}">${LABEL[b]}</button>`).join("")}</div>
          <div class="prog"><div class="ptitle">My program <span class="muted">(${countBlocks(L.prog)} blocks)</span></div>${prog}</div>
        </div>
      </div>`;
    wire();
  }
  const allowed = (lv, b) => (WORLDS[lv.w].blocks.includes(b) || (lv.w >= 1 && ["F", "L", "R", "rep"].includes(b)));

  function wire() {
    $("backBtn").onclick = home;
    $("runBtn").onclick = run;
    $("resetBtn").onclick = () => { if (L.timer) clearInterval(L.timer); L.timer = null; L.sim = null; L.msg = ""; L.done = false; screen(); };
    $("speedBtn").onclick = () => { L.speed = L.speed === 1 ? 2 : 1; $("speedBtn").textContent = L.speed === 1 ? "🐢 Slow" : "🐇 Fast"; };
    app.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => add(b.dataset.add)));
    app.querySelectorAll(".blist").forEach((el) => (el.onclick = (e) => { if (e.target.closest("button")) return; if (e.target.closest(".blist") !== el) return; if (L.timer) return; L.target = L.containers[Number(el.dataset.c)]; screen(); }));
    app.querySelectorAll("[data-x]").forEach((b) => (b.onclick = () => {
      if (L.timer) return;
      const [c, i] = b.dataset.x.split(":").map(Number); const [removed] = L.containers[c].splice(i, 1);
      if (!contains(L.prog, L.target)) L.target = L.prog;
      if (removed) { L.sim = null; L.msg = ""; L.done = false; }
      screen();
    }));
    app.querySelectorAll("[data-n]").forEach((b) => (b.onclick = () => { if (L.timer) return; const [c, i] = b.dataset.n.split(":").map(Number); const blk = L.containers[c][i]; blk.n = blk.n >= 9 ? 2 : blk.n + 1; screen(); }));
    app.querySelectorAll("[data-cond]").forEach((b) => (b.onclick = () => { if (L.timer) return; const [c, i] = b.dataset.cond.split(":").map(Number); const blk = L.containers[c][i]; blk.c = CONDS[(CONDS.indexOf(blk.c) + 1) % 3]; screen(); }));
  }
  function contains(list, target) {
    if (list === target) return true;
    return list.some((b) => (b.body && contains(b.body, target)) || (b.a && (contains(b.a, target) || contains(b.b, target))));
  }
  function add(t) {
    if (L.timer) return;
    let blk = { t };
    if (t === "rep") blk = { t, n: 3, body: [] };
    if (t === "until") blk = { t, body: [] };
    if (t === "if") blk = { t, c: "a", a: [], b: [] };
    L.target.push(blk);
    if (blk.body) L.target = blk.body; else if (blk.a) L.target = blk.a;
    L.sim = null; L.msg = ""; L.done = false; L.showIntro = L.showIntro && L.prog.length < 2;
    screen();
  }

  function run() {
    if (L.timer) return;
    const lv = L.lv;
    L.sim = simulate(lv, L.prog); L.frame = 0; L.msg = ""; L.done = false;
    if (!L.prog.length) { L.sim = null; L.msg = "Add some blocks to your program first!"; screen(); return; }
    screen();
    L.timer = setInterval(() => {
      L.frame++;
      const sim = L.sim;
      if (L.frame >= sim.trace.length) { clearInterval(L.timer); L.timer = null; L.frame = sim.trace.length - 1; return finish(); }
      const st = sim.trace[L.frame], bw = document.querySelector(".boardwrap svg");
      if (bw) { const tmp = document.createElement("div"); tmp.innerHTML = boardSVG(st); bw.replaceWith(tmp.firstChild); }
    }, L.speed === 1 ? 420 : 150);
  }

  const MSGS = {
    bump: "💥 Bump! The robot ran into a wall. Reset and check your turns.",
    loop: "🌀 The robot got stuck going round and round. Check your repeat!",
    short: "The program ended but the robot isn't at the flag yet. Add more blocks!",
    gems: "🚩 You reached the flag, but there are still gems 💎 left. Collect every gem first!",
  };
  function finish() {
    const sim = L.sim, lv = L.lv;
    if (sim.res === "win") {
      const par = parOf(lv), used = sim.blocks;
      const stars = used <= par ? 3 : used <= Math.ceil(par * 1.5) ? 2 : 1;
      const prev = P.stars[lv.id] || 0;
      if (stars > prev) { P.stars[lv.id] = stars; persist(); }
      L.done = "win";
      const next = lv.id + 1 < LEVELS.length ? lv.id + 1 : null;
      L.msg = `🎉 You did it! ${"★".repeat(stars)}${"☆".repeat(3 - stars)} <span class="muted">(${used} blocks, par ${par})</span>${stars < 3 ? `<br><small>Can you do it in ${par} blocks or fewer?</small>` : ""}`;
      screen();
      const row = document.createElement("div"); row.className = "row";
      row.innerHTML = `${next !== null ? `<button class="btn acc" id="nextBtn">Next level ▶</button>` : `<b>🏆 You finished every level!</b>`}<button class="btn secondary" id="homeBtn2">All levels</button>`;
      $("qmsg").appendChild(row);
      if ($("nextBtn")) $("nextBtn").onclick = () => openLevel(next);
      $("homeBtn2").onclick = home;
    } else { L.msg = MSGS[sim.res]; screen(); }
  }

  window.CQ_DEBUG = () => ({ LEVELS, WORLDS, parse, simulate, parOf, P, L, countBlocks });
  playerScreen();
})();
