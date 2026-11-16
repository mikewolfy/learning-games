// Shared "Who's playing?" screen for the learning games.
//
//   PlayerPicker.show({
//     app,                       // the element to draw into
//     store,                     // a profile store from createProfileStore(...)
//     title, blurb,              // heading and a one-line description
//     summary(p) -> string,      // text under each player's name (p is the saved list entry)
//     onPlay(id),                // called when someone picks a saved player
//     onCreate(name, avatar),    // called when a new player is made (you create and save the profile)
//   })
//
// Styles are in css/player-picker.css.

(function (root) {
  "use strict";
  const AVATARS = ["🧑", "👩", "👨", "🧒", "🦊", "🐼", "🦁", "🐸", "🤖", "🦄", "🐯", "🐙"];
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function confirmBox(message, yesLabel, onYes) {
    const wrap = document.createElement("div");
    wrap.className = "pp-overlay";
    wrap.innerHTML = `<div class="pp-confirm card"><p>${esc(message)}</p><div class="pp-row"><button class="btn" data-y>${esc(yesLabel)}</button><button class="btn secondary" data-n>Keep it</button></div></div>`;
    document.body.appendChild(wrap);
    wrap.querySelector("[data-y]").onclick = () => { wrap.remove(); onYes(); };
    wrap.querySelector("[data-n]").onclick = () => wrap.remove();
  }

  function show(o) {
    const players = o.store.list();
    const mode = o.store.mode();
    o.app.innerHTML = `
      <div class="card pp">
        <div class="center">
          <h2 class="pp-title">${esc(o.title)}</h2>
          <p class="muted" style="margin:4px 0 0">${esc(o.blurb || "")}</p>
        </div>
        ${mode === "none" ? `<div class="pp-notice">⚠️ Your browser is blocking storage, so progress <b>can't be saved</b>. You can still play.</div>` : ""}
        <h3 class="pp-sub">${players.length ? "Who's playing?" : "Welcome! Let's set up your first player."}</h3>
        <div class="pp-list">
          ${players.map((p) => `
            <div class="pp-player">
              <div class="pp-av">${esc(p.a)}</div>
              <div class="pp-meta"><b>${esc(p.n)}</b><small>${esc(o.summary ? o.summary(p) : "")}</small></div>
              <button class="btn small" data-play="${esc(p.i)}">Play ▶</button>
              <button class="pp-del" data-del="${esc(p.i)}" aria-label="Delete ${esc(p.n)}" title="Delete this player">🗑️</button>
            </div>`).join("")}
        </div>
        ${o.store.canAddPlayer() ? `<button class="btn good block" id="ppNew">➕ New player</button>` : `<p class="muted center">You've reached ${o.store.MAX_PLAYERS} players. Delete one to add another.</p>`}
        <p class="muted center" style="font-size:0.85rem;margin:14px 0 0">Each player's progress is saved in this browser.</p>
      </div>`;
    o.app.querySelectorAll("[data-play]").forEach((b) => (b.onclick = () => o.onPlay(b.dataset.play)));
    o.app.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => {
      const p = players.find((x) => x.i === b.dataset.del);
      confirmBox(`Delete ${p.n}? This erases all of their progress and can't be undone.`, "Yes, delete", () => { o.store.remove(p.i); show(o); });
    }));
    const nb = document.getElementById("ppNew");
    if (nb) nb.onclick = () => newPlayer(o);
  }

  function newPlayer(o) {
    let av = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    o.app.innerHTML = `
      <div class="card pp">
        <h2 class="pp-title" style="font-size:1.7rem">New Player</h2>
        <h3 class="pp-sub">Your name</h3>
        <input type="text" class="pp-input" id="ppName" maxlength="14" placeholder="Type your name or nickname" autocomplete="off">
        <h3 class="pp-sub">Pick a picture</h3>
        <div class="pp-avs">${AVATARS.map((a) => `<button class="pp-av-btn" data-av="${a}">${a}</button>`).join("")}</div>
        <p id="ppErr" class="pp-err"></p>
        <div class="pp-row"><button class="btn good" id="ppGo" style="flex:1 1 200px;font-size:1.1rem">Start playing! ▶</button><button class="btn secondary" id="ppBack">Back</button></div>
      </div>`;
    const refresh = () => o.app.querySelectorAll("[data-av]").forEach((b) => b.classList.toggle("on", b.dataset.av === av));
    o.app.querySelectorAll("[data-av]").forEach((b) => (b.onclick = () => { av = b.dataset.av; refresh(); }));
    refresh();
    document.getElementById("ppBack").onclick = () => show(o);
    const go = () => {
      const name = document.getElementById("ppName").value.trim();
      if (!name) { document.getElementById("ppErr").textContent = "Please type a name first."; return; }
      o.onCreate(name, av);
    };
    document.getElementById("ppGo").onclick = go;
    document.getElementById("ppName").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    document.getElementById("ppName").focus();
  }

  root.PlayerPicker = { show };
})(window);
