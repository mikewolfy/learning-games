// Word Wizard — build your vocabulary and read short stories.
(function () {
  "use strict";
  const { WORDS, STORIES } = WW_DATA;
  const store = createProfileStore("ww", { prefer: "local" });
  const app = document.getElementById("app");
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const LEVELS = [
    { n: 1, name: "Word Apprentice", emoji: "🪄", grades: "Grades 3–4" },
    { n: 2, name: "Word Mage", emoji: "🔮", grades: "Grades 5–6" },
    { n: 3, name: "Word Wizard", emoji: "🧙", grades: "Grades 7–8" },
  ];
  const SESSION = 10;
  let P = null, G = null;
  const learned = (lv) => WORDS.filter((w) => (lv ? w.lv === lv : true) && (P.words[w.w] || 0) >= 3).length;
  const persist = () => P && store.save(P, { l: learned(), s: Object.keys(P.stories).length, pts: P.pts });

  function playerScreen() {
    P = null; G = null;
    PlayerPicker.show({
      app, store, title: "Word Wizard", blurb: "Learn new words and read short stories!",
      summary: (p) => (p.pts ? `${p.l} words learned • ${p.s} stories • ${p.pts} pts` : "New player"),
      onPlay: (id) => { P = store.load(id); if (!P) return playerScreen(); P.words = P.words || {}; P.stories = P.stories || {}; P.pts = P.pts || 0; store.setLast(id); home(); },
      onCreate: (name, av) => { P = { id: store.newId(), name, av, words: {}, stories: {}, pts: 0 }; persist(); home(); },
    });
  }

  function home() {
    G = null;
    const tricky = WORDS.filter((w) => P.words[w.w] !== undefined && P.words[w.w] < 3).length;
    app.innerHTML = `
      <div class="pbar"><div class="who">${esc(P.av)} ${esc(P.name)}</div><button class="btn small secondary" id="switchBtn">👥 Switch player</button></div>
      <div class="fund">✨ ${P.pts} points • 📖 ${learned()} of ${WORDS.length} words learned</div>
      <div class="card"><h3 class="section-title">Word Practice</h3>
        <p class="muted" style="margin:0 0 6px">${SESSION} questions at a time. Words you miss come back until you know them!</p>
        <div class="levels">${LEVELS.map((l) => {
          const n = learned(l.n), total = WORDS.filter((w) => w.lv === l.n).length;
          return `<button class="level" data-lv="${l.n}"><span class="em">${l.emoji}</span><b>${l.name}</b><small>${l.grades}</small><span class="bar"><i style="width:${(n / total) * 100}%"></i></span><small>${n}/${total} words learned</small></button>`;
        }).join("")}
        ${tricky ? `<button class="level" data-lv="0"><span class="em">🎯</span><b>My tricky words</b><small>Words you've tried but haven't mastered yet</small><small>${tricky} words</small></button>` : ""}</div></div>
      <div class="card"><h3 class="section-title">Story Time</h3>
        <p class="muted" style="margin:0 0 6px">Read a short story, then answer questions about it.</p>
        <div class="levels">${STORIES.map((s) => {
          const r = P.stories[s.id];
          return `<button class="level" data-st="${s.id}"><span class="em">${s.emoji}</span><b>${esc(s.title)}</b><small>${LEVELS[s.lv - 1].grades}</small><span class="st">${r ? "★".repeat(r.s) + "☆".repeat(3 - r.s) : "☆☆☆"}</span></button>`;
        }).join("")}</div></div>`;
    app.querySelectorAll("[data-lv]").forEach((b) => (b.onclick = () => startWords(Number(b.dataset.lv))));
    app.querySelectorAll("[data-st]").forEach((b) => (b.onclick = () => startStory(STORIES.find((s) => s.id === b.dataset.st))));
    $("switchBtn").onclick = playerScreen;
  }

  // ---------------------------------------------------------------
  // Word questions
  // ---------------------------------------------------------------
  const TYPES_BY_BOX = [["def", "cloze"], ["cloze", "syn"], ["syn", "ant", "cloze"], ["def", "cloze", "syn", "ant"]];
  function makeQuestion(w, avoid) {
    const pool = WORDS.filter((x) => x.lv === w.lv && x.w !== w.w);
    let types = TYPES_BY_BOX[Math.min(3, P.words[w.w] || 0)].filter((t) => t !== "ant" || w.ant);
    if (avoid && types.length > 1) types = types.filter((t) => t !== avoid);
    const type = pick(types);
    const related = (x) => x.syn === w.syn || x.w === w.syn || x.syn === w.w || x.ant === w.w || w.ant === x.w || x.ant === w.ant;
    let opts, correct, prompt, label;
    if (type === "def") {
      label = "What does it mean?";
      prompt = `What does <b class="word">${esc(w.w)}</b> mean?`;
      const others = shuffle(pool).slice(0, 3).map((x) => x.d);
      correct = w.d; opts = shuffle([w.d, ...others]);
    } else if (type === "cloze") {
      label = "Fill in the blank";
      prompt = esc(w.s).replace("____", `<span class="blank">______</span>`);
      const others = shuffle(pool.filter((x) => !related(x))).slice(0, 3).map((x) => x.w);
      correct = w.w; opts = shuffle([w.w, ...others]);
    } else if (type === "syn") {
      label = "Same meaning";
      prompt = `Which word means about the <b>same</b> as <b class="word">${esc(w.w)}</b>?`;
      const trap = w.ant ? [w.ant] : [];
      const others = shuffle(pool.filter((x) => x.syn !== w.syn && x.syn !== w.ant && x.ant !== w.syn).map((x) => x.syn)).slice(0, 3 - trap.length);
      correct = w.syn; opts = shuffle([w.syn, ...trap, ...others]);
    } else {
      label = "Opposite";
      prompt = `Which word means the <b>opposite</b> of <b class="word">${esc(w.w)}</b>?`;
      const trap = [w.syn];
      const others = shuffle(pool.filter((x) => x.ant && x.ant !== w.ant && x.ant !== w.syn && x.syn !== w.ant).map((x) => x.ant)).slice(0, 2);
      correct = w.ant; opts = shuffle([w.ant, ...trap, ...others]);
    }
    return { w, type, label, prompt, opts, correct };
  }

  function startWords(lv) {
    let pool = lv ? WORDS.filter((w) => w.lv === lv) : WORDS.filter((w) => P.words[w.w] !== undefined && P.words[w.w] < 3);
    const weighted = shuffle(pool).map((w) => ({ w, k: Math.random() * (1 + (P.words[w.w] || 0) * 1.5) + (P.words[w.w] === undefined ? -0.8 : 0) })).sort((a, b) => a.k - b.k);
    const chosen = weighted.slice(0, SESSION).map((x) => x.w);
    G = { kind: "words", lv, queue: chosen.map((w) => ({ w, avoid: null, retry: false })), i: 0, asked: 0, right: 0, streak: 0, best: 0, pts: 0, missed: [], gained: [], q: null, answered: false };
    nextWordQ();
  }
  function nextWordQ() {
    if (!G.queue.length) return endWords();
    const item = G.queue.shift();
    G.cur = item; G.q = makeQuestion(item.w, item.avoid); G.answered = false; G.asked++;
    renderWordQ();
  }
  function renderWordQ() {
    const q = G.q;
    app.innerHTML = `
      <div class="hud"><div><small>Question</small><b>${Math.min(G.asked, SESSION)} / ${SESSION}</b></div><div><small>✨ Points</small><b>${G.pts}</b></div><div><small>🔥 Streak</small><b>${G.streak}</b></div></div>
      <div class="qcard"><div class="qlabel">${q.label}</div><div class="prompt">${q.prompt}</div>
      <div class="opts">${q.opts.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join("")}</div>
      <div id="fb"></div></div>
      <p style="text-align:center;margin-top:10px"><button class="btn secondary small" id="quitBtn">Stop for now</button></p>`;
    app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => answerWord(Number(b.dataset.i))));
    $("quitBtn").onclick = () => { persist(); home(); };
  }
  function answerWord(i) {
    if (G.answered) return; G.answered = true;
    const q = G.q, w = q.w, ok = q.opts[i] === q.correct, btns = [...app.querySelectorAll(".opt")];
    btns.forEach((b, k) => { b.disabled = true; if (q.opts[k] === q.correct) b.classList.add("correct"); });
    const prevBox = P.words[w.w] || 0;
    if (ok) {
      btns[i].classList.add("correct");
      G.right += G.cur.retry ? 0 : 1; G.streak++; G.best = Math.max(G.best, G.streak);
      const pts = 10 + Math.min(5, G.streak - 1); G.pts += pts; P.pts += pts;
      P.words[w.w] = Math.min(3, prevBox + 1);
      if (P.words[w.w] === 3 && prevBox < 3) G.gained.push(w);
    } else {
      btns[i].classList.add("incorrect");
      G.streak = 0; P.words[w.w] = 0;
      if (!G.missed.includes(w)) G.missed.push(w);
      if (!G.cur.retry) G.queue.push({ w, avoid: q.type, retry: true });
    }
    const filled = w.s.replace("____", `<b>${esc(w.w)}</b>`);
    $("fb").innerHTML = `<div class="explain ${ok ? "okx" : "badx"}"><b>${ok ? "✅ Yes!" : "Not quite."}</b> <b>${esc(w.w)}</b> means ${esc(w.d)}.<br><i>${filled}</i><br><small>Similar: <b>${esc(w.syn)}</b>${w.ant ? ` • Opposite: <b>${esc(w.ant)}</b>` : ""}</small></div>
      <div class="row"><button class="btn acc" id="nextBtn">${G.queue.length ? "Next ▶" : "Finish ▶"}</button></div>`;
    $("nextBtn").onclick = nextWordQ;
    persist();
  }
  function endWords() {
    persist();
    const total = SESSION, acc = Math.round((G.right / total) * 100);
    app.innerHTML = `
      <div class="card center"><p class="muted" style="margin:0">Practice complete!</p>
        <p class="big-num">${G.right}/${total}</p><p class="muted" style="margin:0">right the first time • ${acc}%</p>
        <div class="end-stats"><div><b>${G.pts}</b>points</div><div><b>${G.best}</b>best streak</div><div><b>${G.gained.length}</b>new words learned</div></div>
        ${G.gained.length ? `<div class="ptitle" style="text-align:left">⭐ Words you've mastered</div><div class="chips">${G.gained.map((w) => `<span class="chip good">${esc(w.w)}</span>`).join("")}</div>` : ""}
        ${G.missed.length ? `<div class="ptitle" style="text-align:left;margin-top:10px">📝 Words to practice</div><div class="review">${G.missed.map((w) => `<div><b>${esc(w.w)}</b>: ${esc(w.d)}</div>`).join("")}</div>` : `<p class="result-text">🌟 Perfect! No mistakes.</p>`}
        <div class="row"><button class="btn good" id="againBtn">Practice more</button><button class="btn secondary" id="homeBtn">Back</button></div></div>`;
    window.scrollTo({ top: 0 });
    const lv = G.lv; $("againBtn").onclick = () => startWords(lv); $("homeBtn").onclick = home;
  }

  // ---------------------------------------------------------------
  // Stories
  // ---------------------------------------------------------------
  const KIND = { detail: "📌 Detail", main: "🎯 Main idea", infer: "🔍 Inference", vocab: "📖 Vocabulary" };
  function startStory(s) {
    G = { kind: "story", s, qs: s.qs.map((q) => { const idx = shuffle(q.o.map((_, i) => i)); return { ...q, o: idx.map((i) => q.o[i]), a: idx.indexOf(q.a) }; }), i: 0, right: 0, first: true, answered: false, stage: "read" };
    readScreen();
  }
  function readScreen() {
    const s = G.s;
    app.innerHTML = `
      <div class="qtop"><button class="btn small secondary" id="backBtn">← Back</button><b>${s.emoji} ${esc(s.title)}</b><span class="muted">${LEVELS[s.lv - 1].grades}</span></div>
      <div class="story">${s.text.split("\n\n").map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}</div>
      <div class="row"><button class="btn acc" id="goBtn">I've read it. Questions! ▶</button></div>`;
    $("backBtn").onclick = home; $("goBtn").onclick = () => { G.stage = "q"; storyQ(); };
  }
  function storyQ() {
    const s = G.s, q = G.qs[G.i]; G.answered = false;
    app.innerHTML = `
      <div class="hud"><div><small>Question</small><b>${G.i + 1} / ${G.qs.length}</b></div><div><small>Right</small><b>${G.right}</b></div><div><small>Story</small><b>${s.emoji}</b></div></div>
      <details class="storybox"><summary>📖 Show the story again</summary><div class="story small">${s.text.split("\n\n").map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}</div></details>
      <div class="qcard"><div class="qlabel">${KIND[q.k]}</div><div class="prompt">${esc(q.q)}</div>
      <div class="opts">${q.o.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join("")}</div><div id="fb"></div></div>`;
    app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => answerStory(Number(b.dataset.i))));
  }
  function answerStory(i) {
    if (G.answered) return; G.answered = true;
    const q = G.qs[G.i], ok = i === q.a, btns = [...app.querySelectorAll(".opt")];
    btns.forEach((b, k) => { b.disabled = true; if (k === q.a) b.classList.add("correct"); });
    if (ok) { G.right++; P.pts += 15; } else btns[i].classList.add("incorrect");
    const last = G.i + 1 >= G.qs.length;
    $("fb").innerHTML = `<div class="explain ${ok ? "okx" : "badx"}"><b>${ok ? "✅ Correct!" : "Not quite."}</b> ${esc(q.why)}</div><div class="row"><button class="btn acc" id="nextBtn">${last ? "See results ▶" : "Next ▶"}</button></div>`;
    $("nextBtn").onclick = () => { if (last) endStory(); else { G.i++; storyQ(); } };
  }
  function endStory() {
    const s = G.s, n = G.qs.length, frac = G.right / n, stars = frac === 1 ? 3 : frac >= 0.7 ? 2 : frac >= 0.4 ? 1 : 0;
    const prev = P.stories[s.id] || { s: 0 };
    P.stories[s.id] = { s: Math.max(prev.s, stars), b: Math.max(prev.b || 0, G.right) }; persist();
    const idx = STORIES.indexOf(s), nxt = STORIES[idx + 1];
    app.innerHTML = `
      <div class="card center"><p class="muted" style="margin:0">${s.emoji} ${esc(s.title)}</p>
        <div class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>
        <p class="big-num">${G.right}/${n}</p><p class="muted" style="margin:0">questions right</p>
        <p class="${stars === 3 ? "result-text" : "muted"}">${stars === 3 ? "🌟 You read it perfectly!" : "Tip: use \"Show the story again\" to look for the answer in the text."}</p>
        <div class="row"><button class="btn good" id="againBtn">Read again</button>${nxt ? `<button class="btn acc" id="nextS">Next story ▶</button>` : ""}<button class="btn secondary" id="homeBtn">Back</button></div></div>`;
    window.scrollTo({ top: 0 });
    $("againBtn").onclick = () => startStory(s); if (nxt) $("nextS").onclick = () => startStory(nxt); $("homeBtn").onclick = home;
  }

  window.WW_DEBUG = () => ({ G, P, WORDS, STORIES, makeQuestion });
  playerScreen();
})();
