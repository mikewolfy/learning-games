// Word Sprint — spell four-letter words from six letters before time runs out.
(function () {
  "use strict";

  const app = document.getElementById("app");
  const $ = (id) => document.getElementById(id);

  const WORDS_PER_SET = 4;
  const SET_BONUS = 50;
  const VOWELS = "AEIOU";
  const TIME_CHOICES = [60, 120, 180];
  const BOARD_SIZE = 50;   // how many top scores are kept for each time limit
  const SHOW_TOP = 10;     // how many are shown until "Show all" is pressed
  const KEY_SCORES = "ws-scores-v1";
  const KEY_PREFS = "ws-prefs-v1";

  // Every set: its letters and the Set of ALL valid words (built once)
  const SETS = WS.sets.map((s) => ({ letters: s.letters.split(""), words: new Set(s.words.split(" ")) }));

  let seconds = 60;      // chosen time limit
  let g = null;          // current game
  let timerId = null;
  let timeouts = [];

  // ===================================================================
  // Helpers
  // ===================================================================
  const rand = () => Math.random();
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtTime = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const label = (n) => (n === 60 ? "1 minute" : `${n / 60} minutes`);
  function later(fn, ms) { const t = setTimeout(fn, ms); timeouts.push(t); return t; }
  function clearAll() { clearInterval(timerId); timerId = null; timeouts.forEach(clearTimeout); timeouts = []; }

  // Points for a word: 10, plus 5 for every different letter beyond 2 (so STAR beats SEES)
  function wordPoints(w) { return 10 + 5 * Math.max(0, new Set(w).size - 2); }

  // ---------- saved data (browser storage; fails quietly if blocked) ----------
  function readJSON(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function writeJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ } }
  const memScores = { 60: [], 120: [], 180: [] };
  function getScores(sec) { const all = readJSON(KEY_SCORES, null) || memScores; return Array.isArray(all[sec]) ? all[sec] : []; }
  function qualifies(sec, score) {
    if (score <= 0) return false;
    const list = getScores(sec);
    return list.length < BOARD_SIZE || score > list[list.length - 1].s;
  }
  function addScore(sec, entry) {
    const all = readJSON(KEY_SCORES, null) || { 60: [], 120: [], 180: [] };
    const list = (all[sec] || []).concat(entry).sort((a, b) => b.s - a.s || a.t - b.t).slice(0, BOARD_SIZE);
    all[sec] = list;
    writeJSON(KEY_SCORES, all);
    memScores[sec] = list;
    return list.findIndex((e) => e === entry || (e.t === entry.t && e.s === entry.s && e.n === entry.n));
  }

  function boardHTML(sec, highlightT, expanded) {
    const list = getScores(sec);
    if (!list.length) return `<p class="empty">No scores yet. Be the first!</p>`;
    const shown = expanded ? list : list.slice(0, SHOW_TOP);
    const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1);
    return `<table class="board"><thead><tr><th class="rank">#</th><th>Name</th><th class="num">Score</th><th class="num">Words</th></tr></thead><tbody>
      ${shown.map((e, i) => `<tr class="${e.t === highlightT ? "me" : ""}"><td class="rank">${medal(i)}</td><td>${esc(e.n)}</td><td class="num">${e.s}</td><td class="num">${e.w}</td></tr>`).join("")}</tbody></table>
      ${list.length > SHOW_TOP ? `<div class="center"><button class="btn secondary small" data-toggle>${expanded ? "Show top " + SHOW_TOP + " only" : "Show all " + list.length + " scores"}</button></div>` : ""}`;
  }
  // Draw the leaderboard into an element and wire up its "show all" button
  function mountBoard(id, sec, highlightT) {
    const list = getScores(sec);
    // if the new score is outside the top 10, open the full list so the player can find it
    let expanded = highlightT != null && list.findIndex((e) => e.t === highlightT) >= SHOW_TOP;
    const draw = () => {
      $(id).innerHTML = boardHTML(sec, highlightT, expanded);
      const t = $(id).querySelector("[data-toggle]");
      if (t) t.onclick = () => { expanded = !expanded; draw(); };
    };
    draw();
  }

  // ===================================================================
  // Start screen
  // ===================================================================
  function startScreen() {
    clearAll();
    g = null;
    const prefs = readJSON(KEY_PREFS, {});
    if (TIME_CHOICES.includes(prefs.sec)) seconds = prefs.sec;
    app.innerHTML = `
      <div class="card">
        <div class="center">
          <h2 class="title">Word Sprint</h2>
          <p class="muted" style="margin:4px 0 12px">Spell as many four-letter words as you can before time runs out!</p>
        </div>
        <ul class="rules">
          <li>You get <b>six letters</b>: three vowels <span class="demo-tile v">A</span> <span class="demo-tile v">E</span> <span class="demo-tile v">O</span> and three consonants <span class="demo-tile">T</span> <span class="demo-tile">R</span> <span class="demo-tile">S</span>.</li>
          <li>Make <b>four-letter words</b> using only those letters. You can use each letter <b>as many times as you like</b> (like <b>TEST</b> or <b>ROSE</b>).</li>
          <li>Find <b>4 words</b> to clear the set and win a <b>+${SET_BONUS} bonus</b>, then you get brand new letters!</li>
          <li>Words with more <b>different letters</b> score more points.</li>
        </ul>
        <h3 class="section-title">How much time do you want?</h3>
        <div class="pill-row" id="times">${TIME_CHOICES.map((t) => `<button class="pill" data-sec="${t}">⏱️ ${label(t)}</button>`).join("")}</div>
        <button class="btn go block" id="startBtn" style="font-size:1.3rem;min-height:60px">Start! ▶</button>
      </div>
      <div class="card" style="margin-top:14px">
        <h3 class="section-title">🏆 Top scores for <span id="boardLabel"></span></h3>
        <div id="board"></div>
        <p class="muted" style="font-size:0.85rem;margin:6px 0 0">Top scores are saved in this browser.</p>
      </div>`;
    function refresh() {
      app.querySelectorAll("[data-sec]").forEach((b) => b.classList.toggle("on", Number(b.dataset.sec) === seconds));
      $("boardLabel").textContent = label(seconds);
      mountBoard("board", seconds);
    }
    app.querySelectorAll("[data-sec]").forEach((b) => (b.onclick = () => { seconds = Number(b.dataset.sec); writeJSON(KEY_PREFS, { ...prefs, sec: seconds }); refresh(); }));
    refresh();
    $("startBtn").onclick = countdown;
  }

  // ===================================================================
  // Countdown, then play
  // ===================================================================
  function countdown() {
    clearAll();
    let n = 3;
    function show() {
      if (n === 0) { app.innerHTML = `<div class="countdown"><div class="n" style="color:var(--good)">Go!</div></div>`; return later(startGame, 450); }
      app.innerHTML = `<div class="countdown"><p class="muted" style="margin:0">Get ready…</p><div class="n">${n}</div></div>`;
      n--; later(show, 900);
    }
    show();
  }

  function startGame() {
    g = {
      sec: seconds, deadline: Date.now() + seconds * 1000,
      score: 0, setsDone: 0, words: [],       // words: {w, pts}
      bag: [], set: null, tiles: [], found: [], input: "",
      ended: false, locked: false, lastIdx: -1,
    };
    buildPlayScreen();
    newSet();
    tick();
    timerId = setInterval(tick, 200);
  }

  function buildPlayScreen() {
    app.innerHTML = `
      <div class="hud">
        <div class="time" id="timeBox"><small>⏱️ Time</small><b id="tLeft">${fmtTime(g.sec)}</b></div>
        <div><small>⭐ Score</small><b id="score">0</b></div>
        <div><small>✅ Sets cleared</small><b id="sets">0</b></div>
      </div>
      <div class="timebar" id="tbarWrap"><i id="tbar" style="width:100%"></i></div>
      <div class="card">
        <p class="poss" id="poss"></p>
        <div class="tiles" id="tiles"></div>
        <div class="slots" id="slots"></div>
        <div class="fb" id="fb"></div>
        <div class="ctrl">
          <button class="btn secondary small" id="backBtn">⌫ Delete</button>
          <button class="btn secondary small" id="clearBtn">Clear</button>
          <button class="btn secondary small" id="shuffleBtn">🔀 Shuffle tiles</button>
          <button class="btn secondary small" id="skipBtn">⏭️ New letters</button>
        </div>
        <p class="found-title" id="foundTitle"></p>
        <div class="found" id="found"></div>
      </div>`;
    $("backBtn").onclick = () => press("Backspace");
    $("clearBtn").onclick = () => { if (!g.locked) { g.input = ""; renderSlots(); } };
    $("shuffleBtn").onclick = () => { g.tiles = shuffle(g.tiles); renderTiles(); };
    $("skipBtn").onclick = () => { if (!g.ended) { setFeedback("", ""); newSet(); } };
  }

  // ===================================================================
  // Sets
  // ===================================================================
  function newSet() {
    if (!g.bag.length) {
      g.bag = shuffle(SETS.map((_, i) => i));
      if (g.bag[g.bag.length - 1] === g.lastIdx) g.bag.reverse(); // avoid an immediate repeat
    }
    g.lastIdx = g.bag.pop();
    g.set = SETS[g.lastIdx];
    // vowels first or mixed? Show a shuffled mix so it feels fresh
    g.tiles = shuffle(g.set.letters);
    g.found = [];
    g.input = "";
    g.locked = false;
    renderTiles(); renderSlots(); renderFound();
    $("poss").textContent = `🔍 There are ${g.set.words.size} possible words hiding in these letters!`;
  }

  function renderTiles() {
    $("tiles").innerHTML = g.tiles.map((ch) => `<button class="tile ${VOWELS.includes(ch) ? "v" : ""}" data-ch="${ch}" aria-label="Letter ${ch}">${ch}</button>`).join("");
    $("tiles").querySelectorAll(".tile").forEach((b) => (b.onclick = () => press(b.dataset.ch)));
  }
  function renderSlots() {
    const cells = [];
    for (let i = 0; i < 4; i++) cells.push(`<div class="slot ${g.input[i] ? "filled" : ""}">${g.input[i] || ""}</div>`);
    $("slots").innerHTML = cells.join("");
  }
  function renderFound() {
    $("foundTitle").textContent = `Words found in this set: ${g.found.length} of ${WORDS_PER_SET}`;
    let html = "";
    for (let i = 0; i < WORDS_PER_SET; i++) {
      const f = g.found[i];
      html += f ? `<div class="done">${f.w}<small>+${f.pts}</small></div>` : `<div>? ? ? ?<small>&nbsp;</small></div>`;
    }
    $("found").innerHTML = html;
  }
  function setFeedback(text, cls) { const fb = $("fb"); if (!fb) return; fb.textContent = text; fb.className = "fb " + (cls || ""); }
  function flash(text) {
    const d = document.createElement("div");
    d.className = "flash"; d.innerHTML = `<span>${esc(text)}</span>`;
    document.body.appendChild(d); later(() => d.remove(), 1000);
  }

  // ===================================================================
  // Input
  // ===================================================================
  function press(key) {
    if (!g || g.ended || g.locked) return;
    if (key === "Backspace") { g.input = g.input.slice(0, -1); renderSlots(); return; }
    if (key.length !== 1) return;
    const ch = key.toUpperCase();
    if (!g.set.letters.includes(ch)) return;
    if (g.input.length >= 4) return;
    g.input += ch;
    renderSlots();
    const tile = $("tiles").querySelector(`[data-ch="${ch}"]`);
    if (tile) { tile.classList.add("press"); later(() => tile.classList.remove("press"), 90); }
    if (g.input.length === 4) submit();
  }

  document.addEventListener("keydown", (e) => {
    if (!g || g.ended || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Backspace") { e.preventDefault(); press("Backspace"); }
    else if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); if (!g.locked) { g.input = ""; renderSlots(); } }
    else if (/^[a-zA-Z]$/.test(e.key)) press(e.key);
  });

  function submit() {
    const w = g.input;
    const slots = $("slots");
    if (g.found.some((f) => f.w === w)) return reject("You already found " + w + "!");
    if (!g.set.words.has(w)) return reject(`"${w}" isn't in our word list`);

    const pts = wordPoints(w);
    g.score += pts;
    g.found.push({ w, pts });
    g.words.push({ w, pts });
    slots.className = "slots good";
    setFeedback(`✅ ${w}  +${pts}`, "good");
    updateHud();
    g.locked = true;
    if (g.found.length >= WORDS_PER_SET) {
      g.score += SET_BONUS; g.setsDone++;
      renderFound(); updateHud();
      setFeedback(`🎉 Set cleared! +${SET_BONUS} bonus!`, "bonus");
      flash(`+${SET_BONUS} Bonus! 🎉`);
      later(() => { if (g && !g.ended) { slots.className = "slots"; setFeedback("", ""); newSet(); } }, 900);
    } else {
      renderFound();
      later(() => { if (g && !g.ended) { g.input = ""; g.locked = false; slots.className = "slots"; renderSlots(); } }, 280);
    }
  }

  function reject(msg) {
    const slots = $("slots");
    g.locked = true;
    slots.className = "slots bad shake";
    setFeedback(msg, "bad");
    later(() => { if (g && !g.ended) { g.input = ""; g.locked = false; slots.className = "slots"; renderSlots(); } }, 600);
  }

  // ===================================================================
  // Timer + HUD
  // ===================================================================
  function updateHud() {
    $("score").textContent = g.score;
    $("sets").textContent = g.setsDone;
  }
  function tick() {
    if (!g || g.ended) return;
    const msLeft = Math.max(0, g.deadline - Date.now());
    const secLeft = Math.ceil(msLeft / 1000);
    $("tLeft").textContent = fmtTime(secLeft);
    $("tbar").style.width = (msLeft / (g.sec * 1000)) * 100 + "%";
    const low = secLeft <= 10;
    $("timeBox").classList.toggle("low", low);
    $("tbarWrap").classList.toggle("low", low);
    if (msLeft <= 0) endGame();
  }

  // ===================================================================
  // Results
  // ===================================================================
  function endGame() {
    if (!g || g.ended) return;
    g.ended = true;
    clearAll();
    const r = g;
    flash("Time's up! ⏰");
    later(() => resultsScreen(r), 1100);
  }

  function resultsScreen(r) {
    const prefs = readJSON(KEY_PREFS, {});
    const best = r.words.slice().sort((a, b) => b.pts - a.pts)[0];
    const canSave = qualifies(r.sec, r.score);
    const topScore = getScores(r.sec)[0];
    const isRecord = r.score > 0 && (!topScore || r.score > topScore.s);

    app.innerHTML = `
      <div class="card center">
        <p class="muted" style="margin:0">⏰ Time's up! (${label(r.sec)})</p>
        <p class="big-score">${r.score}</p>
        <p class="muted" style="margin:0">points</p>
        ${isRecord ? '<div class="newrec">🏆 New high score!</div>' : ""}
        <div class="end-stats">
          <div><b>${r.words.length}</b>words found</div>
          <div><b>${r.setsDone}</b>sets cleared</div>
          <div><b>${best ? best.w : "–"}</b>best word${best ? ` (+${best.pts})` : ""}</div>
        </div>
        ${r.words.length ? `<div class="wordcloud">${r.words.map((x) => `<span>${x.w}</span>`).join("")}</div>` : ""}
        <div id="saveArea">
          ${canSave ? `<p style="margin:6px 0"><b>You made the top ${BOARD_SIZE}!</b> Enter your name to save your score:</p>
            <div class="save-row"><input type="text" id="nameBox" maxlength="12" placeholder="Your name" value="${esc(prefs.name || "")}" autocomplete="off"><button class="btn go" id="saveBtn">Save score</button></div>` : ""}
        </div>
        <h3 class="section-title" style="margin-top:14px">🏆 Top scores (${label(r.sec)})</h3>
        <div id="board" style="text-align:left"></div>
        <div class="action-row" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px">
          <button class="btn go" id="againBtn">Play again</button>
          <button class="btn secondary" id="changeBtn">Change time</button>
        </div>
      </div>`;
    window.scrollTo({ top: 0 });
    mountBoard("board", r.sec);
    $("againBtn").onclick = () => { seconds = r.sec; countdown(); };
    $("changeBtn").onclick = startScreen;
    const saveBtn = $("saveBtn");
    if (saveBtn) {
      const save = () => {
        const name = ($("nameBox").value.trim() || "Player").slice(0, 12);
        writeJSON(KEY_PREFS, { ...prefs, name, sec: r.sec });
        const entry = { n: name, s: r.score, w: r.words.length, t: Date.now() };
        addScore(r.sec, entry);
        $("saveArea").innerHTML = `<p class="result-text" style="margin:6px 0">✅ Saved! Nice work, ${esc(name)}.</p>`;
        mountBoard("board", r.sec, entry.t);
      };
      saveBtn.onclick = save;
      $("nameBox").addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
      $("nameBox").focus();
    }
  }

  window.WS_DEBUG = () => ({ g, SETS, wordPoints, setSeconds: (n) => { seconds = n; } });
  startScreen();
})();
