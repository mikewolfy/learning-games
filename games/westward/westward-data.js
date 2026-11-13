// Westward Wagons — history content (landmarks, events and quiz questions).
// Each event's choices receive a helper object `g` (see makeHelpers in westward.js)
// and return a short sentence describing what happened.

window.WW = {};

// ---------------------------------------------------------------------------
// Landmarks along the trail (miles are approximate, measured from Independence)
// ---------------------------------------------------------------------------
WW.landmarks = [
  {
    name: "Independence, Missouri", miles: 0, type: "start", icon: "🏘️",
    fact: "Towns like Independence were called “jumping-off” points. Families bought wagons, oxen and food here before heading into the wilderness. Most left in April or May, once spring grass had grown to feed their animals.",
  },
  {
    name: "Kansas River Crossing", miles: 102, type: "river", icon: "🌊", depth: [2.5, 5], ferry: 5,
    fact: "There were no bridges on most of the trail. Crossing rivers was one of the most dangerous parts of the whole journey.",
  },
  {
    name: "Fort Kearny", miles: 304, type: "fort", icon: "🏰",
    fact: "Fort Kearny was built by the U.S. Army in 1848 along the Platte River in what is now Nebraska. It was a safe place for travelers to rest, buy supplies and send mail back home.",
  },
  {
    name: "Chimney Rock", miles: 554, type: "landmark", icon: "🗿",
    fact: "Chimney Rock is a tall stone spire that can be seen from miles away. It is one of the most mentioned landmarks in pioneer diaries. Seeing it meant the flat prairie was ending and the mountains were getting closer.",
  },
  {
    name: "Fort Laramie", miles: 640, type: "fort", icon: "🏰",
    fact: "Fort Laramie started as a fur-trading post in 1834. The U.S. Army bought it in 1849. Pioneers stopped here to fix wagons, trade and rest before the hard climb into the Rocky Mountains.",
  },
  {
    name: "Independence Rock", miles: 830, type: "landmark", icon: "🪨",
    fact: "Pioneers hoped to reach Independence Rock by the Fourth of July. If they did, they were on schedule to cross the mountains before snow fell. Thousands of travelers carved or painted their names on it — some are still there today!",
    july4: true,
  },
  {
    name: "South Pass", miles: 932, type: "landmark", icon: "⛰️",
    fact: "South Pass is a wide, gentle valley through the Rocky Mountains — the easiest way for wagons to cross. It sits on the Continental Divide: rivers to the east flow toward the Atlantic Ocean, and rivers to the west flow toward the Pacific.",
  },
  {
    name: "Fort Bridger", miles: 1057, type: "fort", icon: "🏰",
    fact: "Fort Bridger was a trading post started in 1843 by Jim Bridger, a famous mountain man and fur trapper who knew the Rocky Mountains well.",
  },
  {
    name: "Soda Springs", miles: 1151, type: "landmark", icon: "🫧",
    fact: "At Soda Springs, natural springs bubble up out of the ground. Pioneers wrote that the fizzy water tasted like soda water, and some mixed it with sugar to make a treat.",
  },
  {
    name: "Fort Hall", miles: 1288, type: "fort", icon: "🏰",
    fact: "Fort Hall was a trading post in what is now Idaho. Not far past it, some wagons turned southwest on the California Trail while others kept going to Oregon.",
  },
  {
    name: "Snake River Crossing", miles: 1470, type: "river", icon: "🌊", depth: [4, 7], ferry: 0, guide: true,
    fact: "Many pioneers crossed the Snake River at Three Island Crossing, using small islands as stepping stones. The current was strong, and Shoshone people sometimes helped guide wagons across.",
  },
  {
    name: "Fort Boise", miles: 1580, type: "fort", icon: "🏰",
    fact: "Fort Boise was a trading post run by the Hudson’s Bay Company, a British fur-trading company. Back then, both the United States and Great Britain had claimed the Oregon Country.",
  },
  {
    name: "Blue Mountains", miles: 1740, type: "landmark", icon: "🌲",
    fact: "The Blue Mountains were steep and covered with thick forests. Pioneers sometimes had to chop down trees to make room for their wagons and use ropes to lower them down hills.",
  },
  {
    name: "The Dalles", miles: 1840, type: "dalles", icon: "🛶",
    fact: "At The Dalles, the wagon road ended at the Columbia River. Families had to choose: float down the dangerous river on rafts, or take the Barlow Road, a toll road around Mount Hood that opened in 1846.",
  },
  {
    name: "Oregon City", miles: 2000, type: "end", icon: "🏡",
    fact: "Oregon City was the end of the Oregon Trail. Oregon became a U.S. territory in 1848 and a state in 1859. Laws like the Donation Land Claim Act of 1850 gave settlers free farmland — land that had been home to Native peoples for thousands of years.",
  },
];

// ---------------------------------------------------------------------------
// Which Native nation's homeland the trail passes through (by mile)
// ---------------------------------------------------------------------------
WW.nationAt = function (miles) {
  if (miles < 450) return "Pawnee";
  if (miles < 950) return "Lakota";
  if (miles < 1580) return "Shoshone";
  return "Cayuse";
};

// ---------------------------------------------------------------------------
// Random trail events
//   when(g)   -> optional; return false to skip this event right now
//   text(g)   -> the situation
//   choices   -> [{ label, hint, ok(g) (optional: can you pick it?), run(g) -> result text }]
// ---------------------------------------------------------------------------
WW.events = [
  {
    id: "wheel", icon: "🛞", title: "Broken Wheel!",
    text: () => "CRACK! One of your wagon wheels hit a rock and broke.",
    choices: [
      {
        label: "Use a spare wagon part", hint: "Uses 1 spare part, 1 day",
        ok: (g) => g.s.supplies.parts > 0,
        run: (g) => { g.change("parts", -1); g.days(1); return "You swap in the spare part. Good thing you packed one!"; },
      },
      {
        label: "Try to fix it yourselves", hint: "Takes 2+ days, might not work",
        run: (g) => {
          const odds = g.s.role === "blacksmith" ? 0.95 : 0.5;
          if (g.chance(odds)) { g.days(2); return g.s.role === "blacksmith" ? "Your blacksmith skills make quick work of it. Fixed in 2 days!" : "After 2 days of hard work, the wheel holds together!"; }
          g.days(5); return "The first try didn't work. It took 5 long days, but you finally fixed it.";
        },
      },
      {
        label: "Pay another wagon train to help", hint: "Costs $15, 1 day",
        ok: (g) => g.s.money >= 15,
        run: (g) => { g.s.money -= 15; g.days(1); return "A friendly family helps you fix the wheel in a day."; },
      },
    ],
    fact: "Pioneers packed spare wheels, axles and wagon tongues. There were no repair shops for hundreds of miles, so families had to fix things themselves.",
  },
  {
    id: "fever", icon: "🤒", title: "Sickness on the Trail",
    text: (g) => `${g.pick().name} feels very sick with a fever.`,
    choices: [
      {
        label: "Stop and rest for 3 days", hint: "Uses food and time",
        run: (g) => { g.days(3); g.heal(30, g.picked); g.heal(5); return `After resting, ${g.picked.name} is feeling better.`; },
      },
      {
        label: "Use medicine", hint: "Uses 1 medicine kit",
        ok: (g) => g.s.supplies.medicine > 0,
        run: (g) => { g.change("medicine", -1); g.heal(40, g.picked); return `The medicine helps. ${g.picked.name} is feeling much better.`; },
      },
      {
        label: "Keep moving", hint: "Risky for their health",
        run: (g) => { g.hurt(25, g.picked); return `${g.picked.name} rides in the wagon, but gets weaker.`; },
      },
    ],
    fact: "Sickness was the biggest danger on the trail — much bigger than accidents or animals. A disease called cholera, spread by dirty water, made thousands of pioneers sick.",
  },
  {
    id: "storm", icon: "⛈️", title: "Prairie Thunderstorm",
    when: (g) => g.s.miles < 700,
    text: () => "Dark clouds roll across the prairie. Thunder booms and hail starts to fall!",
    choices: [
      {
        label: "Stop and wait it out", hint: "Lose 1 day",
        run: (g) => { g.days(1); return "Everyone huddles in the wagon until the storm passes. Everyone is safe."; },
      },
      {
        label: "Keep going through the storm", hint: "Saves time, but risky",
        run: (g) => {
          if (g.chance(0.5)) {
            const lost = g.change("food", -40);
            g.hurt(10);
            return `Rain soaks your wagon and ${-lost} pounds of food is ruined. ${g.picked.name} catches a chill.`;
          }
          return "You push through the storm and come out just fine!";
        },
      },
    ],
    fact: "The Great Plains are known for huge thunderstorms, hail and even tornadoes. With almost no trees on the prairie, there was nowhere to hide.",
  },
  {
    id: "bison", icon: "🦬", title: "Bison Herd!",
    when: (g) => g.s.miles > 200 && g.s.miles < 950,
    text: () => "The ground rumbles. A HUGE herd of bison is crossing the trail ahead of you. There are too many to count!",
    choices: [
      { label: "Wait for the herd to pass", hint: "Lose 2 days", run: (g) => { g.days(2); return "It takes two whole days for the herd to pass by. What a sight!"; } },
      {
        label: "Try to go around them", hint: "Lose 1 day, rough ground",
        run: (g) => {
          g.days(1);
          if (g.chance(0.3)) {
            if (g.s.supplies.parts > 0) { g.change("parts", -1); return "The rough ground breaks part of your wagon. You use a spare part to fix it."; }
            g.days(2); return "The rough ground damages your wagon. Fixing it takes 2 extra days.";
          }
          return "You find a way around the herd.";
        },
      },
    ],
    fact: "Tens of millions of bison once lived on the Great Plains. Plains nations like the Lakota used every part of the bison for food, clothing, tools and tipis. By the 1880s, hunters had killed almost all of them.",
  },
  {
    id: "trade", icon: "🤝", title: "Trading Partners",
    text: (g) => `A group of ${WW.nationAt(g.s.miles)} people meet your wagon and offer to trade with you.`,
    choices: [
      {
        label: "Trade 2 sets of clothing for food", hint: "Get 100 lbs of food",
        ok: (g) => g.s.supplies.clothes >= 2,
        run: (g) => { g.change("clothes", -2); g.change("food", 100); return "You trade clothing for 100 pounds of dried meat and other food."; },
      },
      {
        label: "Trade $15 for fresh food", hint: "Get 80 lbs of food",
        ok: (g) => g.s.money >= 15,
        run: (g) => { g.s.money -= 15; g.change("food", 80); return "You trade for 80 pounds of food. Your family is grateful!"; },
      },
      { label: "Politely say no thanks", hint: "", run: () => "You thank them and continue on your way." },
    ],
    fact: "The trail crossed the homelands of many Native nations, including the Pawnee, Lakota, Cheyenne, Shoshone and Cayuse. In the early years most meetings were peaceful and trading was common. But as more and more settlers came, they used up the grass, water and animals, and the U.S. government took Native lands. This led to many conflicts.",
  },
  {
    id: "lostOx", icon: "🐂", title: "Missing Ox",
    when: (g) => g.s.supplies.oxen > 1,
    text: () => "When you wake up, one of your oxen has wandered away from camp!",
    choices: [
      {
        label: "Search for it", hint: "Lose 1 day, might find it",
        run: (g) => {
          g.days(1);
          if (g.chance(0.65)) return "You follow its tracks and find it munching grass by a creek!";
          g.change("oxen", -1); return "You search all day but can't find it. You'll have to go on with one less ox.";
        },
      },
      { label: "Keep going without it", hint: "Lose 1 ox", run: (g) => { g.change("oxen", -1); return "You leave without the missing ox."; } },
    ],
    fact: "Most families used oxen to pull their wagons. Oxen were slower than horses, but they were stronger, cheaper and could eat the dry prairie grass.",
  },
  {
    id: "berries", icon: "🫐", title: "Wild Berries!",
    text: () => "Your kids spot bushes full of ripe wild berries next to the trail.",
    choices: [
      {
        label: "Stop and pick berries", hint: "Takes 1 day, get food",
        run: (g) => {
          g.days(1);
          let amount = 25 + Math.floor(g.rand() * 30);
          if (g.s.role === "farmer") amount = Math.round(amount * 1.5);
          g.change("food", amount); g.heal(5);
          return `You pick ${amount} pounds of berries. Delicious!`;
        },
      },
      { label: "No time — keep moving", hint: "", run: () => "You wave goodbye to the berries and keep rolling." },
    ],
    fact: "Pioneers mostly ate flour, bacon, beans, rice and coffee. Fresh fruit was rare, so wild berries were a special treat and helped keep people healthy.",
  },
  {
    id: "water", icon: "💧", title: "Bad Water",
    text: () => "The only water nearby is muddy and smells strange.",
    choices: [
      { label: "Boil the water before drinking", hint: "Lose 1 day", run: (g) => { g.days(1); return "It takes time to gather wood and boil water, but everyone stays healthy."; } },
      {
        label: "Drink it anyway", hint: "Saves time, risky",
        run: (g) => {
          if (g.chance(0.45)) { g.hurt(25); return `Uh oh! ${g.picked.name} gets a terrible stomachache.`; }
          return "Lucky! Nobody gets sick this time.";
        },
      },
    ],
    fact: "Pioneers didn't know that tiny germs in dirty water caused diseases like cholera. Today we know that boiling water kills those germs.",
  },
  {
    id: "steep", icon: "🏔️", title: "Steep Hill",
    when: (g) => g.s.miles > 800,
    text: () => "The trail climbs a steep, rocky hill. Your oxen are huffing and struggling to pull the heavy wagon.",
    choices: [
      { label: "Leave heavy furniture by the trail", hint: "Lighter wagon, no time lost", run: () => "You leave Grandma's heavy oak dresser and the iron stove beside the trail. It's sad, but now the oxen can pull." },
      { label: "Unload, carry things up, and reload", hint: "Lose 2 days", run: (g) => { g.days(2); return "Everyone carries boxes up the hill. It's exhausting, but you keep everything."; } },
      {
        label: "Push the oxen to pull it all", hint: "Risky for your oxen",
        run: (g) => {
          if (g.chance(0.4)) { g.change("oxen", -1); return "One of your oxen is hurt pulling the load and can't go on."; }
          return "The oxen strain and pull, and you make it to the top!";
        },
      },
    ],
    fact: "The trail was littered with things pioneers left behind to lighten their wagons — iron stoves, tools, trunks, and even pianos!",
  },
  {
    id: "ankle", icon: "🦶", title: "Twisted Ankle",
    text: (g) => `${g.pick().name} twisted an ankle jumping down from the wagon.`,
    choices: [
      { label: "Rest for 2 days", hint: "Uses food and time", run: (g) => { g.days(2); g.heal(20, g.picked); return `${g.picked.name}'s ankle feels much better after resting.`; } },
      { label: "Let them ride in the wagon", hint: "Bumpy ride!", run: (g) => { g.hurt(8, g.picked); return `The wagon is very bumpy. ${g.picked.name} is sore, but you keep moving.`; } },
    ],
    fact: "Most pioneers — even kids — walked the whole 2,000 miles! Wagons were packed full of supplies and had no springs, so riding was bumpy and uncomfortable.",
  },
  {
    id: "wagonTrain", icon: "🚩", title: "Join a Wagon Train?",
    when: (g) => !g.s.flags.joinedTrain,
    text: () => "A wagon train of 20 families invites you to travel with them.",
    choices: [
      {
        label: "Join them", hint: "Share some food, but more help",
        run: (g) => { g.s.flags.joinedTrain = true; g.change("food", -30); g.heal(10); return "You join the group! You share some food, but everyone helps each other and spirits are high."; },
      },
      { label: "Travel on your own", hint: "", run: () => "You thank them and keep traveling on your own." },
    ],
    fact: "Families often traveled together in wagon trains. They voted for a captain, made rules, and helped each other with river crossings, repairs and sickness.",
  },
  {
    id: "letter", icon: "✉️", title: "A Traveler Heading East",
    text: () => "You meet a rider heading back east. He offers to carry letters to your relatives back home.",
    choices: [
      { label: "Write a letter home", hint: "Lifts everyone's spirits", run: (g) => { g.heal(5); return "Your family writes about everything you've seen. Everyone feels happier."; } },
      { label: "Keep moving", hint: "", run: () => "You wave goodbye and keep going." },
    ],
    fact: "There was no mail service on the trail. Pioneers sent letters with travelers going east or left them at forts. Some families didn't hear from each other for many months.",
  },
  {
    id: "snow", icon: "❄️", title: "Snow in the Mountains",
    when: (g) => g.monthIndex() >= 9 && g.s.miles > 800,
    text: () => "Cold wind blows and snow begins to fall in the mountains!",
    choices: [
      {
        label: "Make camp and wait for it to stop", hint: "Lose 2 days",
        run: (g) => { g.days(2); if (g.s.supplies.clothes < g.active().length) { g.hurt(8); return `Without enough warm clothes, ${g.picked.name} gets very cold.`; } return "Your warm clothes keep everyone cozy until the snow stops."; },
      },
      {
        label: "Push on through the snow", hint: "Risky without warm clothes",
        run: (g) => { if (g.s.supplies.clothes < g.active().length) { g.hurt(15); g.hurt(10); return "It's freezing! Not everyone has warm clothes, and some family members get sick."; } return "Bundled in warm clothes, you push through the snow."; },
      },
    ],
    fact: "Timing mattered! In 1846, a group called the Donner Party left late and got trapped by snow in the mountains of California all winter. That's why pioneers hurried to cross the mountains before the snow.",
  },
  {
    id: "gold", icon: "⛏️", title: "Gold Fever!",
    when: (g) => g.s.miles > 1100 && g.s.miles < 1500 && !g.s.flags.gold,
    text: () => "You meet travelers who are very excited. “Gold has been found in California!” they shout. “Come with us and get rich!”",
    choices: [
      { label: "Stick with the plan — Oregon!", hint: "", run: (g) => { g.s.flags.gold = true; return "You wish them luck and keep heading to Oregon and its rich farmland."; } },
      { label: "Ask them about it, then keep going", hint: "Lose 1 day", run: (g) => { g.s.flags.gold = true; g.days(1); g.heal(3); return "You hear exciting stories around the campfire, but decide farming in Oregon is a surer thing."; } },
    ],
    fact: "In January 1848, gold was discovered at Sutter's Mill in California. By 1849, about 90,000 people rushed west to find gold. They were called the “Forty-Niners.”",
  },
  {
    id: "grass", icon: "🌾", title: "No Grass for the Oxen",
    when: (g) => g.s.miles > 300,
    text: () => "So many wagons have come this way that the grass near the trail is all eaten up. Your oxen are hungry.",
    choices: [
      { label: "Take the oxen farther away to graze", hint: "Lose 1 day", run: (g) => { g.days(1); return "You find good grass a few miles away. The oxen eat their fill."; } },
      {
        label: "Push on and hope for grass ahead", hint: "Risky for your oxen",
        run: (g) => { if (g.chance(0.3)) { g.change("oxen", -1); return "One weak, hungry ox can't go any farther."; } return "You find a little grass farther ahead. The oxen are okay."; },
      },
    ],
    fact: "By the early 1850s, tens of thousands of people traveled the trail each year. So many animals grazed along the way that the grass near the trail often disappeared.",
  },
  {
    id: "prairieDogs", icon: "🐿️", title: "Prairie Dog Town",
    when: (g) => g.s.miles < 900,
    text: () => "Your family spots hundreds of little prairie dogs popping in and out of holes, squeaking at each other.",
    choices: [
      { label: "Watch them for a while", hint: "Just for fun", run: (g) => { g.heal(3); return "The kids laugh as the prairie dogs bark and chase each other. What a fun break!"; } },
    ],
    fact: "Pioneers wrote about “prairie dog villages” that stretched for miles. Prairie dogs bark to warn each other about danger, which is how they got their name.",
  },
];

// ---------------------------------------------------------------------------
// End-of-game quiz
// ---------------------------------------------------------------------------
WW.quiz = [
  { q: "About how long was the Oregon Trail?", a: ["About 2,000 miles", "About 200 miles", "About 20,000 miles"], explain: "The trail was about 2,000 miles — that took 4 to 6 months to travel!" },
  { q: "Why did pioneers usually start their trip in the spring?", a: ["So there was grass for animals and they could cross the mountains before snow", "Because school was over", "Because rivers were frozen solid"], explain: "Spring grass fed the oxen, and leaving early meant reaching the mountains before winter." },
  { q: "What animal pulled most pioneer wagons?", a: ["Oxen", "Camels", "Dogs"], explain: "Oxen were strong, cheap and could eat prairie grass." },
  { q: "What was the biggest danger on the trail?", a: ["Sickness like cholera", "Bears", "Getting lost"], explain: "Disease spread by dirty water made thousands of pioneers sick." },
  { q: "Pioneers hoped to reach Independence Rock by what date?", a: ["July 4th", "New Year's Day", "Halloween"], explain: "Reaching it by the Fourth of July meant they were on schedule." },
  { q: "South Pass crosses what important line?", a: ["The Continental Divide", "The Equator", "The Mason-Dixon Line"], explain: "West of the Continental Divide, rivers flow toward the Pacific Ocean." },
  { q: "What did “Manifest Destiny” mean?", a: ["The belief that the U.S. should spread across the whole continent", "A map of the trail", "The name of a famous wagon"], explain: "Many Americans in the 1840s believed it was their destiny to spread west to the Pacific." },
  { q: "Who already lived on the lands the pioneers crossed?", a: ["Many Native American nations, like the Lakota, Pawnee and Shoshone", "Nobody lived there", "Only fur trappers"], explain: "Native nations had lived on these lands for thousands of years." },
  { q: "How did most pioneers travel the trail?", a: ["They walked beside their wagons", "They rode in trains", "They rode in the wagons the whole time"], explain: "Wagons were full of supplies and very bumpy, so most people walked!" },
  { q: "Where did the Oregon Trail end?", a: ["Oregon City", "New York City", "Chicago"], explain: "Oregon City, near the Willamette Valley, was the end of the trail." },
  { q: "What was discovered in California in 1848?", a: ["Gold", "Oil", "Dinosaur bones"], explain: "Gold at Sutter's Mill started the California Gold Rush." },
  { q: "What did pioneers often leave behind to lighten their wagons?", a: ["Heavy things like stoves and furniture", "Their food", "Their oxen"], explain: "The trail was littered with stoves, trunks and even pianos!" },
];

WW.manifestDestinyFact = "In the 1840s, many Americans believed in “Manifest Destiny” — the idea that the United States was meant to spread all the way to the Pacific Ocean. Between about 1840 and 1860, over 300,000 people traveled west on the Oregon, California and Mormon trails.";
