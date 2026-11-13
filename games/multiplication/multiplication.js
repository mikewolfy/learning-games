// Times Table Blast — a multiplication quiz game
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const TIMED_SECONDS = 60;
  const TIMED_GOAL = 30; // correct answers needed to reach the moon in timed mode
  const MAX_DIGITS = 3;

  const settings = {
    tables: new Set([2, 3, 4, 5]),
    mode: "practice", // practice | practice20 | timed
  };

  let game = null;
  let timerId = null;

  // ---------- Saved best scores (safe if storage is blocked) ----------
  function loadBest(key) {
    try { return Number(localStorage.getItem("ttb-best-" + key)) || 0; } catch (e) { return 0; }
  }
  function saveBest(key, value) {
    try { localStorage.setItem("ttb-best-" + key, String(value)); } catch (e) { /* ignore */ }
  }
  function bestKey() {
    const tables = [...settings.tables].sort((a, b) => a - b).join(",");
    return settings.mode + ":" + tables;
  }

  // ---------- Setup screen ----------
  function buildTablePicks() {
    const box = $("tablePicks");
    box.innerHTML = "";
    for (let n = 1; n <= 12; n++) {
      const b = document.createElement("button");
      b.className = "pick" + (settings.tables.has(n) ? " on" : "");
      b.textContent = n;
      b.setAttribute("aria-pressed", settings.tables.has(n));
      b.addEventListener("click", () => {
        if (settings.tables.has(n)) settings.tables.delete(n); else settings.tables.add(n);
        buildTablePicks();
      });
      box.appendChild(b);
    }
    updateBestLine();
  }

  function updateBestLine() {
    const best = settings.tables.size ? loadBest(bestKey()) : 0;
    $("bestLine").textContent = best ? `🏆 Your best with these settings: ${best} correct` : "";
  }

  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const presets = {
        easy: [1, 2, 3, 4, 5],
        medium: [6, 7, 8, 9],
        hard: [10, 11, 12],
        all: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      };
      settings.tables = new Set(presets[btn.dataset.preset]);
      buildTablePicks();
    });
  });

  document.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.mode = btn.dataset.mode;
      document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", b === btn));
      updateBestLine();
    });
  });

  $("startBtn").addEventListener("click", () => {
    if (settings.tables.size === 0) {
      $("setupError").textContent = "Pick at least one times table first!";
      return;
    }
    $("setupError").textContent = "";
    startGame();
  });

  // ---------- Game ----------
  function makeQuestion(previous) {
    const tables = [...settings.tables];
    let a, b, tries = 0;
    do {
      a = tables[Math.floor(Math.random() * tables.length)];
      b = 1 + Math.floor(Math.random() * 12);
      tries++;
    } while (previous && previous.a === a && previous.b === b && tries < 20);
    // Randomly swap so kids see both 7 × 3 and 3 × 7
    return Math.random() < 0.5 ? { a, b } : { a: b, b: a };
  }

  function startGame() {
    const total = settings.mode === "practice" ? 10 : settings.mode === "practice20" ? 20 : Infinity;
    game = {
      total,
      timed: settings.mode === "timed",
      asked: 0,
      correct: 0,
      streak: 0,
      bestStreak: 0,
      missed: new Map(), // "7 × 8" -> answer
      retry: [], // missed questions to ask again later
      current: null,
      input: "",
      locked: false,
      timeLeft: TIMED_SECONDS,
    };
    show("playScreen");
    makeStars();
    nextQuestion();
    if (game.timed) {
      clearInterval(timerId);
      timerId = setInterval(() => {
        game.timeLeft--;
        updateStats();
        if (game.timeLeft <= 0) endGame();
      }, 1000);
    }
    updateStats();
  }

  function nextQuestion() {
    // In practice mode, bring a missed question back a little later
    if (game.retry.length && game.retry[0].due <= game.asked) {
      game.current = game.retry.shift().q;
    } else {
      game.current = makeQuestion(game.current);
    }
    game.input = "";
    game.locked = false;
    $("question").textContent = `${game.current.a} × ${game.current.b}`;
    $("answerBox").className = "answer-box";
    $("feedback").className = "feedback";
    $("feedback").textContent = "";
    renderInput();
    updateStats();
  }

  function renderInput() {
    $("answerBox").textContent = game.input || "?";
  }

  const cheers = ["Great job!", "You got it!", "Awesome!", "Super!", "Nice work!", "Correct!", "Way to go!"];

  function checkAnswer() {
    if (!game || game.locked || game.input === "") return;
    game.locked = true;
    game.asked++;
    const { a, b } = game.current;
    const answer = a * b;
    const right = Number(game.input) === answer;

    if (right) {
      game.correct++;
      game.streak++;
      game.bestStreak = Math.max(game.bestStreak, game.streak);
      $("answerBox").className = "answer-box right";
      $("feedback").className = "feedback right";
      let msg = cheers[Math.floor(Math.random() * cheers.length)];
      if (game.streak > 0 && game.streak % 5 === 0) msg = `🔥 ${game.streak} in a row! Amazing!`;
      $("feedback").textContent = msg;
    } else {
      game.streak = 0;
      game.missed.set(`${a} × ${b}`, answer);
      if (!game.timed) game.retry.push({ q: { a, b }, due: game.asked + 3 });
      $("answerBox").className = "answer-box wrong";
      $("feedback").className = "feedback wrong";
      $("feedback").textContent = `Not quite — ${a} × ${b} = ${answer}`;
    }
    updateStats();

    const delay = right ? 700 : 1800;
    setTimeout(() => {
      if (!game) return;
      if (!game.timed && game.asked >= game.total) endGame();
      else if (game.timed && game.timeLeft <= 0) return; // timer already ended the game
      else nextQuestion();
    }, delay);
  }

  function press(key) {
    if (!game || game.locked) return;
    if (key === "go") return checkAnswer();
    if (key === "del") game.input = game.input.slice(0, -1);
    else if (/^\d$/.test(key) && game.input.length < MAX_DIGITS) {
      game.input = game.input === "0" ? key : game.input + key;
    }
    renderInput();
  }

  $("keypad").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-key]");
    if (btn) press(btn.dataset.key);
  });

  document.addEventListener("keydown", (e) => {
    if ($("playScreen").classList.contains("hidden")) return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") { e.preventDefault(); press("del"); }
    else if (e.key === "Enter") { e.preventDefault(); press("go"); }
  });

  function updateStats() {
    if (!game) return;
    if (game.timed) {
      $("progressStat").textContent = `⏱️ ${Math.max(0, game.timeLeft)}s left`;
    } else {
      $("progressStat").textContent = `Question ${Math.min(game.asked + 1, game.total)} of ${game.total}`;
    }
    $("scoreStat").textContent = game.correct;
    $("streakStat").textContent = game.streak;
    const goal = game.timed ? TIMED_GOAL : game.total;
    const p = Math.min(1, game.correct / goal);
    $("rocket").style.setProperty("--p", p);
  }

  function makeStars() {
    const sky = $("sky");
    sky.querySelectorAll(".star").forEach((s) => s.remove());
    for (let i = 0; i < 18; i++) {
      const s = document.createElement("span");
      s.className = "star";
      s.textContent = "✦";
      s.style.left = Math.random() * 92 + "%";
      s.style.top = Math.random() * 70 + "%";
      sky.appendChild(s);
    }
  }

  function endGame() {
    clearInterval(timerId);
    if (!game) return;
    const g = game;
    game = null;

    const asked = g.asked;
    const accuracy = asked ? Math.round((g.correct / asked) * 100) : 0;
    let stars = 0;
    if (g.timed) stars = g.correct >= 25 ? 3 : g.correct >= 15 ? 2 : g.correct >= 5 ? 1 : 0;
    else stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 50 ? 1 : 0;

    $("resultStars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    $("resultTitle").textContent = ["Keep practicing!", "Good try!", "Great job!", "Superstar! 🌟"][stars];

    const key = bestKey();
    const best = loadBest(key);
    let msg = g.timed
      ? `You answered ${g.correct} correctly in ${TIMED_SECONDS} seconds.`
      : `You answered ${g.correct} out of ${asked} correctly.`;
    if (g.correct > best) {
      saveBest(key, g.correct);
      if (best > 0) msg += " 🏆 That's a new best score!";
    } else if (best) {
      msg += ` Your best is ${best}.`;
    }
    $("resultMsg").textContent = msg;
    $("resCorrect").textContent = g.correct;
    $("resAccuracy").textContent = accuracy + "%";
    $("resStreak").textContent = g.bestStreak;

    const list = $("missedList");
    list.innerHTML = "";
    g.missed.forEach((ans, fact) => {
      const s = document.createElement("span");
      s.textContent = `${fact} = ${ans}`;
      list.appendChild(s);
    });
    $("missedWrap").classList.toggle("hidden", g.missed.size === 0);
    show("resultScreen");
  }

  $("againBtn").addEventListener("click", startGame);
  $("settingsBtn").addEventListener("click", () => { show("setupScreen"); updateBestLine(); });

  function show(id) {
    ["setupScreen", "playScreen", "resultScreen"].forEach((s) => $(s).classList.toggle("hidden", s !== id));
  }

  buildTablePicks();
})();
