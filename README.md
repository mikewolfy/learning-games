# Learning Games Arcade

A collection of fun learning games for elementary and middle school kids. Everything is plain HTML, CSS and JavaScript — no installs or build steps.

## Games

| Game | Subject | What it does |
| --- | --- | --- |
| **Westward Wagons** (`games/westward/`) | Social Studies (grades 3–8) | Lead a pioneer family's wagon 2,000 miles from Independence, Missouri to Oregon City in 1848. Buy supplies, choose pace and food portions, cross rivers, and make decisions when challenges come up. Each landmark and event teaches a real history fact, collected in a History Journal, and the game ends with a Trail Quiz. |
| **Times Table Blast** (`games/multiplication/`) | Math (grades 2–6) | Multiplication quiz. Pick which times tables (1–12) to practice, then play 10 or 20 questions or a 60-second "Beat the Clock" round. Missed facts come back again later, and the results screen lists facts to practice. Best scores are saved in the browser. |

## Playing it

- **On your computer:** open `index.html` in a web browser (double-click it).
- **Free on the web with GitHub Pages:** in the GitHub repo go to **Settings → Pages**, choose **Deploy from a branch**, pick the `main` branch and `/ (root)` folder, and save. After a minute the site will be at `https://<your-username>.github.io/learning-games/`.

## Adding a new game

1. Create a folder like `games/spelling/` with an `index.html` inside. (Copy the top bar from an existing game so there's an "← All Games" link.)
2. In the main `index.html`, copy one of the `<a class="game-card">` blocks and change the link, picture, title and description.

## Project layout

```
index.html                     Main page with the game picker
css/style.css                  Shared styles (buttons, cards, colors)
games/westward/                Westward Wagons
  westward-data.js             Landmarks, trail events, history facts, quiz questions
  westward.js                  Game engine
  westward.css                 Game styles
games/multiplication/          Times Table Blast
```

The Westward Wagons history content all lives in `westward-data.js`, so it's easy to add new events or quiz questions.
