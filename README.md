# Learning Games Arcade

A collection of fun learning games for elementary and middle school kids. Everything is plain HTML, CSS and JavaScript — no installs or build steps.

## Games

| Game | Subject | What it does |
| --- | --- | --- |
| **Westward Wagons** (`games/westward/`) | Social Studies (grades 3–8) | Lead a pioneer family's wagon 2,000 miles from Independence, Missouri to Oregon City in 1848. Buy supplies, choose pace and food portions, cross rivers, and make decisions when challenges come up. Each landmark and event teaches a real history fact, collected in a History Journal, and the game ends with a Trail Quiz. |
| **Times Table Blast** (`games/multiplication/`) | Math (grades 2–6) | Multiplication quiz. Pick which times tables (1–12) to practice, then play 10 or 20 questions or a 60-second "Beat the Clock" round. Missed facts come back again later, and the results screen lists facts to practice. Best scores are saved in the browser. |
| **Stand Tycoon** (`games/economics/`) | Economics (grades 4–8) | Run a small business for 20 days. Buy ingredients, set prices, choose advertising and buy upgrades while reacting to weather and news (a rival opens, frost raises costs, a festival comes to town). Kids discover supply and demand, profit, fixed vs. variable costs, competition, inflation, opportunity cost and investing, collect "Econ words", see their own demand chart, earn badges, and finish with a quiz. |
| **Neighbourhood Tycoon** (`games/neighbourhood/`) | Money & business (grades 4–8) | A season-by-season life sim. Each week kids split a few free hours across 12 side jobs (lemonade, mowing, babysitting, lifeguard, snow shoveling and more). Jobs need gear or training, depend on the season and weather, and level up with experience. Kids can set their price, save with interest, or invest in a fund or a risky single stock, and work toward a savings goal. Several players can share one browser; each player's progress is saved in cookies (with a localStorage fallback). |

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
games/economics/               Stand Tycoon
  economics-data.js            Econ vocabulary, news events, quiz questions
  economics.js                 Game engine
  economics.css                Game styles
games/neighbourhood/           Neighbourhood Tycoon
  neighbourhood-data.js        Jobs, seasons, weather, goals, events, tips, quiz
  neighbourhood-store.js       Saves players in cookies (localStorage fallback)
  neighbourhood.js             Game engine
  neighbourhood.css            Game styles
```

The Westward Wagons history content all lives in `westward-data.js`, so it's easy to add new events or quiz questions.
