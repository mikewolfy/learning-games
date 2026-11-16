# Learning Games Arcade

A collection of fun learning games for elementary and middle school kids. Everything is plain HTML, CSS and JavaScript — no installs or build steps.

## Games

| Game | Subject | What it does |
| --- | --- | --- |
| **Westward Wagons** (`games/westward/`) | Social Studies (grades 3–8) | Lead a pioneer family's wagon 2,000 miles from Independence, Missouri to Oregon City in 1848. Buy supplies, choose pace and food portions, cross rivers, and make decisions when challenges come up. Sick or injured travelers are named (dysentery, fever, snakebite, broken arm...) with the cause, how long they need to rest, and a Treat button, and hunger, cold and exhaustion are explained too. Every trip is different: a random trail year (wet spring, sickly season, crowded trail...), changing weather, fort prices, hardy or frail travelers, and about 34 trail events drawn so repeats are rare. Each landmark and event teaches a real history fact, collected in a History Journal, and the game ends with a Trail Quiz. |
| **Times Table Blast** (`games/multiplication/`) | Math (grades 2–6) | Multiplication quiz. Pick which times tables (1–12) to practice, then play 10 or 20 questions or a 60-second "Beat the Clock" round. Missed facts come back again later, and the results screen lists facts to practice. Best scores are saved in the browser. |
| **Stand Tycoon** (`games/economics/`) | Economics (grades 4–8) | Run a small business for 20 days. Buy ingredients, set prices, choose advertising and invest in 9 upgrades (Pro Equipment, Big Banner, Cooler, Secret Recipe, Supplier Contract, Backyard Garden, Weather Canopy, Loyalty Cards, Market Research), each with 5 levels that cost more as you go, while reacting to weather and news (a rival opens, frost raises costs, a festival comes to town). Kids discover supply and demand, profit, fixed vs. variable costs, competition, inflation, opportunity cost, investing and diminishing returns, collect "Econ words", see their own demand chart, earn badges, and finish with a quiz. |
| **Neighbourhood Tycoon** (`games/neighbourhood/`) | Money & business (grades 4–8) | A season-by-season life sim. Each week kids split a few free hours across 12 side jobs (lemonade, mowing, babysitting, lifeguard, snow shoveling and more). Jobs need gear or training, depend on the season and weather, and level up with experience. Kids can set their price, save with interest, or invest in a fund or a risky single stock, and work toward a savings goal. Several players can share one browser; each player's progress is saved in cookies (with a localStorage fallback). |
| **Business Builder** (`games/business/`) | Entrepreneurship (grades 5–8) | Pick one of 8 businesses and run it quarter by quarter for up to 10 years. Start as a sole proprietor, then hire a team (makers, sellers, experts, managers), form an LLC or corporation, take loans, sell shares to investors, buy equipment and expand your market, while seasons, booms and recessions, rivals, lawsuits, key employees quitting, and 20+ other events shake things up. Kids learn revenue and profit, fixed vs. variable costs, liability, taxes, cash flow, loans, equity, insurance and more. Each player's progress is saved in the browser, with a business-tips glossary and a final quiz. |
| **Word Sprint** (`games/wordsprint/`) | Spelling (grades 2–8) | Pick a 1, 2 or 3 minute timer, then spell four-letter words using six letters (3 vowels + 3 consonants, letters can repeat). Four words clears a set for a +50 bonus and brand-new letters. 150 letter sets (120 with an S so plurals work), each with its complete word list (ENABLE + Collins dictionaries) so no real word is rejected. The top 50 scores per time limit are saved in the browser. |
| **Map Dash** (`games/mapdash/`) | Geography (grades 3–8) | Click-the-map quiz with 13 maps: all 50 US states, four US regions, the 7 continents, the world, and Europe, Asia, Africa, North America, South America and Oceania. Three modes (find it, name it, capitals), 10 questions or a 90-second clock, with zoom and pan, hints, streak and speed bonuses, and missed places that come back for practice. Each player's best scores and tricky places are saved. |
| **Fraction Kitchen** (`games/fractions/`) | Fractions (grades 3–7) | Customers order dishes and kids cook with fractions. Five levels: measuring cups, same-size slices, different sizes, scaling recipes and mixed numbers, and feeding a crowd. Hints, worked solutions, patience timers, tips and stars (2 stars opens the next level). Progress is saved for each player. |
| **Ecosystem Builder** (`games/ecosystem/`) | Science (grades 3–8) | Pick plants, plant-eaters and meat-eaters for a forest, ocean reef, savanna or pond, then run 10 years of a food-web simulation. Each year brings an event (drought, wildfire, disease, hunters, baby boom) and you choose one action: add, thin out or protect a species. Reports explain why each population rose or fell. Stars and best scores are saved per player. |
| **Code Quest** (`games/codequest/`) | Coding (grades 3–8) | 18 block-programming puzzles in three worlds: sequences, loops, and if / repeat-until decisions. Tap blocks to build a program (including nested ones), run it, and watch the robot collect gems and reach the flag. Stars reward short programs. |
| **Word Wizard** (`games/wordwizard/`) | Reading and vocabulary (grades 3–8) | 90 words in three levels, practiced with meaning, fill-in-the-blank, synonym and antonym questions. Missed words come back and each word is tracked until mastered. Story Time has 9 short passages with main idea, detail, inference and vocabulary questions. |

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
  westward-data.js             Landmarks, core trail events, history facts, quiz questions
  westward-more.js             Illnesses and injuries, trail years, weather, traits, extra events
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
games/business/                Business Builder
  business-data.js             8 business types, roles, legal structures, tips, quiz
  business-engine.js           The economy (pure logic, no screens, easy to test)
  business-events.js           Story events: the ups and downs
  business.js                  Screens and game flow
  business.css                 Game styles
js/profile-store.js            Shared "Who's playing?" saving (cookies or localStorage)
games/wordsprint/              Word Sprint
  wordsprint-data.js           150 letter sets + every valid word for each (generated)
  wordsprint.js                Game engine
  wordsprint.css               Game styles
tools/build_wordsprint_data.py Regenerates the Word Sprint word lists
js/player-picker.js            Shared "Who's playing?" screen
css/player-picker.css          Styles for the player picker
games/mapdash/                 Map Dash
  mapdash-data.js              US + world map shapes, capitals, quiz sets (generated)
  mapdash.js / mapdash.css     Game engine and styles
tools/build_mapdash_data.py    Regenerates the Map Dash map data
games/ecosystem/               Ecosystem Builder
  ecosystem-data.js            Biomes, species and events
  ecosystem-engine.js          The food-web simulation (pure logic)
  ecosystem.js / .css          Screens and styles
games/codequest/               Code Quest (codequest.js has the levels and the robot engine)
games/wordwizard/              Word Wizard
  wordwizard-data.js           Words and stories
  wordwizard.js / .css         Game and styles
games/fractions/               Fraction Kitchen
  fractions.js / fractions.css Game engine and styles
```

The Westward Wagons history content all lives in `westward-data.js`, so it's easy to add new events or quiz questions.
