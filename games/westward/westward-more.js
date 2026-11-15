// Westward Wagons — illnesses and injuries, trail years, weather, traveler traits and extra events.
// (Loaded after westward-data.js. The engine is westward.js.)

// ---------------------------------------------------------------------------
// Illnesses and injuries. hit = health lost when it starts, daily = health lost each day on the trail,
// need = days of rest needed to get better on their own (medicine cures it right away).
// ---------------------------------------------------------------------------
WW.ailments = {
  cold: { name: "Bad Cold", icon: "🤧", hit: 6, daily: 0.8, need: 3, cause: "caught a chill", desc: "A cold makes you sneeze, cough and feel tired. It's not serious, but a weak traveler gets worse if they keep going out in the weather.", care: "Rest and warm clothes help." },
  fever: { name: "Fever", icon: "🤒", hit: 12, daily: 1.8, need: 4, cause: "came down with a fever", desc: "A fever means your body is fighting an illness. You feel hot, shaky and weak.", care: "Rest, or medicine." },
  dysentery: { name: "Dysentery", icon: "🤢", hit: 15, daily: 2.6, need: 6, cause: "drank dirty water", desc: "Dysentery is a bad stomach illness caused by germs in dirty water. It brings terrible cramps and drains your strength fast. It was one of the most common illnesses on the trail.", care: "Rest, clean water, or medicine." },
  cholera: { name: "Cholera", icon: "🦠", hit: 25, daily: 3.8, need: 8, cause: "caught cholera", desc: "Cholera is a dangerous sickness spread by dirty water and crowded camps. It made thousands of pioneers very ill. It takes a long time to get over.", care: "Medicine is the fastest way. Otherwise lots of rest." },
  measles: { name: "Measles", icon: "🔴", hit: 10, daily: 1.6, need: 5, cause: "caught measles", desc: "Measles spreads easily from person to person. It brings red spots, a fever and a lot of tiredness.", care: "Rest or medicine." },
  sprain: { name: "Sprained Ankle", icon: "🦶", hit: 8, daily: 1.0, need: 3, cause: "twisted an ankle", desc: "A sprain is when the tough bands around a joint get stretched too far. Walking hurts until it heals.", care: "Rest. Walking on it makes it worse." },
  brokenArm: { name: "Broken Arm", icon: "🦴", hit: 15, daily: 1.2, need: 7, cause: "broke an arm", desc: "A broken bone needs to be held still with a splint so it can heal. It takes weeks.", care: "Rest in a splint, or medicine for the pain and infection." },
  snakebite: { name: "Snakebite", icon: "🐍", hit: 20, daily: 2.8, need: 4, cause: "was bitten by a rattlesnake", desc: "A rattlesnake bite is dangerous. The bitten person must stay calm and still, and the wound needs to be cleaned and cared for.", care: "Medicine, or rest right away." },
  heat: { name: "Heat Exhaustion", icon: "🥵", hit: 10, daily: 1.5, need: 2, cause: "overheated", desc: "Heat exhaustion happens when your body gets too hot. You feel dizzy, weak and sweaty. Shade, water and rest are the cure.", care: "Rest in the shade and drink water." },
  bruise: { name: "Bruises", icon: "🩹", hit: 8, daily: 0.6, need: 2, cause: "got banged up", desc: "Bruises are sore spots where the body was hit. They hurt, but heal on their own with a little rest.", care: "A little rest." },
};

// Each traveler is a little different
WW.traits = {
  hardy: { icon: "💪", name: "Hardy", dmg: 0.75, heal: 1.2, text: "Tough and strong. Gets sick less and heals faster." },
  frail: { icon: "🤧", name: "Frail", dmg: 1.3, heal: 0.85, text: "Gets sick more easily and heals more slowly. Take extra care!" },
};

// ---------------------------------------------------------------------------
// The "trail year": conditions that change from trip to trip
//   river: river depth multiplier   price: fort price multiplier   mud: slowdown in the early spring prairie
//   coldMonth: when mountain cold starts (0 = January)   weights: makes events more/less likely
//   rain: extra chance of rain   hot: extra chance of hot days   eventChance: more or fewer events
// ---------------------------------------------------------------------------
WW.yearTypes = [
  { id: "normal", weight: 3, icon: "🌤️", name: "An Ordinary Year", text: "Nothing unusual this year. The trail is just as hard as it always is.", river: 1, price: 1, mud: 1, coldMonth: 8, rain: 1, hot: 1, eventChance: 0, weights: {} },
  { id: "wet", weight: 2, icon: "🌧️", name: "A Wet Spring", text: "It's been raining for weeks. Rivers are running high and the trail is muddy. Watch for storms and floods, and pack warm, dry clothes.", river: 1.3, price: 1, mud: 0.9, coldMonth: 8, rain: 2.2, hot: 0.7, eventChance: 0.05, weights: { storm: 2, flashFlood: 3, mudSlide: 3, fever: 1.3 } },
  { id: "dry", weight: 2, icon: "☀️", name: "A Dry, Hot Summer", text: "There's been very little rain. Rivers are low, but water holes are dirty and grass is scarce. Heat is a danger.", river: 0.75, price: 1, mud: 1, coldMonth: 8, rain: 0.4, hot: 2.2, eventChance: 0, weights: { water: 2.5, grass: 2.5, heat: 3, prairieFire: 3 } },
  { id: "sickly", weight: 2, icon: "🤒", name: "A Sickly Season", text: "Sickness is spreading along the trail this year. Crowded camps and dirty water are making travelers ill. Medicine will be worth its weight in gold.", river: 1, price: 1, mud: 1, coldMonth: 8, rain: 1, hot: 1, eventChance: 0.05, weights: { fever: 2.5, measles: 3, cholera: 4, water: 2, abandonedWagon: 2 } },
  { id: "crowded", weight: 2, icon: "🐂", name: "A Crowded Trail", text: "Thousands of wagons are heading west this year. The grass gets eaten up quickly, forts are crowded and prices are high, but there are lots of friendly faces.", river: 1, price: 1.25, mud: 1, coldMonth: 8, rain: 1, hot: 1, eventChance: 0, weights: { grass: 2.5, wagonTrain: 2, hungryFamily: 2, trade: 0.5 } },
  { id: "early", weight: 1.5, icon: "❄️", name: "An Early Winter", text: "Old-timers say winter will come early this year. Cold weather could reach the mountains by August. Don't dawdle!", river: 1, price: 1, mud: 1, coldMonth: 7, rain: 1, hot: 0.6, eventChance: 0, weights: { snow: 2.5 } },
  { id: "lucky", weight: 1.5, icon: "🍀", name: "A Lucky Year", text: "Everything seems to be going right this year. Good weather, friendly neighbors and plenty of fresh food along the trail.", river: 0.9, price: 0.95, mud: 1, coldMonth: 8, rain: 0.7, hot: 1, eventChance: -0.05, weights: { berries: 2, fiddle: 2.5, cleanSpring: 3, gratitude: 2, wolves: 0.5, snakebite: 0.6 } },
];

// ---------------------------------------------------------------------------
// Weather on the trail (changes every few days)
//   speed: how fast you travel
// ---------------------------------------------------------------------------
WW.weather = {
  sunny: { id: "sunny", icon: "☀️", label: "Sunny", speed: 1.0 },
  cloudy: { id: "cloudy", icon: "⛅", label: "Cloudy", speed: 1.0 },
  rain: { id: "rain", icon: "🌧️", label: "Rainy", speed: 0.85 },
  storm: { id: "storm", icon: "⛈️", label: "Stormy", speed: 0.7 },
  hot: { id: "hot", icon: "🥵", label: "Scorching hot", speed: 0.95 },
  cold: { id: "cold", icon: "🥶", label: "Cold", speed: 0.95 },
  snow: { id: "snow", icon: "🌨️", label: "Snowing", speed: 0.6 },
};

// ---------------------------------------------------------------------------
// Extra trail events. They use the same helper object `g` as the original events, plus:
//   g.sicken(ailmentId, person, cause)  -> gives someone an illness or injury, returns them
//   g.cure(person)  g.restDays(n)  g.advance(miles)
//   weight(g) -> how likely this event is (default 1)
// ---------------------------------------------------------------------------
WW.events.push(
  {
    id: "snakebite", icon: "🐍", title: "Snakebite!",
    when: (g) => g.monthIndex() >= 3 && g.monthIndex() <= 9 && g.s.miles > 100,
    text: (g) => { const p = g.sicken("snakebite", g.pick()); return `${p.name} was bitten by a rattlesnake while gathering firewood!`; },
    choices: [
      { label: "Use medicine", hint: "Uses 1 medicine kit", ok: (g) => g.s.supplies.medicine > 0, run: (g) => { g.change("medicine", -1); g.cure(g.picked); return `The medicine works quickly. ${g.picked.name} is going to be okay.`; } },
      { label: "Clean the bite and rest for 3 days", hint: "Slow, but it can work", run: (g) => { g.restDays(3); return g.picked.ail ? `${g.picked.name} is getting better but still has the snakebite. A little more rest, or medicine, will help.` : `After careful rest, ${g.picked.name} recovers from the snakebite.`; } },
      { label: "Keep moving to the next fort", hint: "Risky for their health", run: (g) => `${g.picked.name} rides in the wagon, getting weaker each day until the bite is treated.` },
    ],
    fact: "Rattlesnakes were common on the plains and in the hills. Pioneers wrote about killing many snakes. Folk cures like cutting the bite rarely worked. The best treatment was to stay calm and keep the bitten limb still.",
  },
  {
    id: "brokenArm", icon: "🦴", title: "A Bad Fall",
    text: (g) => { const p = g.sicken("brokenArm", g.pick(), "fell from the wagon and broke an arm"); return `${p.name} slipped while climbing off the wagon and landed hard. Their arm looks broken!`; },
    choices: [
      { label: "Make a splint and rest for 3 days", hint: "Uses time and food", run: (g) => { g.restDays(3); return `You tie the arm to a straight board to keep it still. ${g.picked.name} is feeling better, but the arm needs more time to heal.`; } },
      { label: "Use medicine", hint: "Uses 1 medicine kit", ok: (g) => g.s.supplies.medicine > 0, run: (g) => { g.change("medicine", -1); g.cure(g.picked); return `The medicine helps with the pain and keeps the arm from getting infected. ${g.picked.name} is much better.`; } },
      { label: "Make a sling and keep moving", hint: "Saves time, but it hurts", run: (g) => `${g.picked.name} rides with a sling. The bumpy trail makes the arm hurt more each day.` },
    ],
    fact: "Accidents were a big danger on the trail. People fell under wagon wheels, were kicked by animals, or had guns go off by mistake. With no doctors for hundreds of miles, families set bones themselves.",
  },
  {
    id: "measles", icon: "🔴", title: "Measles Outbreak",
    when: (g) => g.s.miles > 200,
    text: (g) => { const p = g.sicken("measles", g.pick()); return `Measles is spreading through the wagons nearby. Now ${p.name} has a fever and red spots too.`; },
    choices: [
      { label: "Rest apart from the others for 4 days", hint: "Slow, but it keeps it from spreading", run: (g) => { g.restDays(4); return g.picked.ail ? `${g.picked.name} is getting better, but still has the measles.` : `${g.picked.name} has finally recovered from the measles.`; } },
      { label: "Use medicine", hint: "Uses 1 medicine kit", ok: (g) => g.s.supplies.medicine > 0, run: (g) => { g.change("medicine", -1); g.cure(g.picked); return `The medicine helps ${g.picked.name} get over the measles quickly.`; } },
      { label: "Keep moving", hint: "Risky for their health", run: (g) => `${g.picked.name} rides in the wagon feeling miserable.` },
    ],
    fact: "Measles, cholera and other diseases spread fast in crowded wagon trains and camps. Pioneer children were especially at risk. Today vaccines protect us from measles, but in the 1800s there was no vaccine.",
  },
  {
    id: "heat", icon: "🥵", title: "Heat Wave!",
    when: (g) => g.monthIndex() >= 5 && g.monthIndex() <= 8,
    text: (g) => { const p = g.sicken("heat", g.pick()); return `The sun beats down on the dry prairie. ${p.name} gets dizzy, faints and is helped into the shade.`; },
    choices: [
      { label: "Rest in the shade for a day", hint: "Lose 1 day", run: (g) => { g.restDays(1); return g.picked.ail ? `${g.picked.name} is feeling a little better but is still weak from the heat.` : `After a day of shade and water, ${g.picked.name} is feeling better.`; } },
      { label: "Ride in the wagon and keep going", hint: "Saves time, risky", run: (g) => `${g.picked.name} rides in the wagon with a wet cloth on their head, but is still weak from the heat.` },
    ],
    fact: "Summer days on the plains and in the desert could be scorching, and water was often far away. To save their oxen's strength, many pioneers traveled early in the morning and in the evening, resting during the heat of the day.",
  },
  {
    id: "hail", icon: "🧊", title: "Hailstorm!",
    when: (g) => g.s.miles < 1100,
    text: () => "Chunks of ice the size of eggs pound your wagon cover. It starts to tear!",
    choices: [
      { label: "Patch it right away with a set of clothes", hint: "Lose 1 set of clothes", ok: (g) => g.s.supplies.clothes >= 1, run: (g) => { g.change("clothes", -1); return "You cut up a set of clothes to patch the cover. Everything inside stays dry."; } },
      { label: "Wait it out under the wagon", hint: "Lose 1 day", run: (g) => { g.days(1); const lost = -g.change("food", -30); const p = g.sicken("bruise", g.pick(), "got banged up by hail"); return `The hail passes, but rain leaks in and ruins ${lost} pounds of food. ${p.name} has bruises from the hailstones.`; } },
    ],
    fact: "Hailstorms on the plains could be violent. There are records of hail killing oxen and badly injuring people. Canvas wagon covers were coated with oil to make them waterproof, but they tore easily.",
  },
  {
    id: "prairieFire", icon: "🔥", title: "Prairie Fire!",
    when: (g) => g.s.miles < 900 && g.monthIndex() >= 6,
    text: () => "Smoke fills the air. A wall of fire is racing across the dry grass toward your wagon!",
    choices: [
      { label: "Set a backfire to burn a safe patch", hint: "A clever trick, but risky", run: (g) => { if (g.chance(0.7)) return "You burn a patch of grass ahead of you. When the big fire arrives, it has nothing left to burn and passes around you. Everyone is safe!"; g.change("food", -40); return "The backfire spreads out of control and burns some of your supplies. You lose 40 pounds of food, but everyone gets away safely."; } },
      { label: "Race toward the river", hint: "Fast, but hard on the oxen", run: (g) => { if (g.chance(0.6)) return "You whip the oxen into a run and reach the river just in time!"; if (g.s.supplies.oxen > 2) { g.change("oxen", -1); return "You reach the river, but one worn-out ox collapses and can't go on."; } return "You barely make it to the river with your tired oxen."; } },
    ],
    fact: "Prairie fires, started by lightning or sparks from campfires, could race across the dry grass faster than a person could run. Settlers learned from Native peoples that the safest answer was often to burn a firebreak.",
  },
  {
    id: "stampede", icon: "🐂", title: "Oxen Stampede!",
    when: (g) => g.s.supplies.oxen >= 4,
    text: () => "A gunshot from a nearby camp makes your oxen panic. They bolt across the prairie, dragging the wagon!",
    choices: [
      { label: "Run alongside and calm them down", hint: "Brave, but risky", run: (g) => { if (g.chance(0.6)) return "You catch up and talk the oxen into stopping. Nothing is hurt!"; if (g.s.supplies.parts > 0) { g.change("parts", -1); return "The wagon hits a rock and breaks a wheel. You use a spare part to fix it."; } g.days(2); return "The wagon hits a rock and breaks a wheel. It takes 2 days to fix."; } },
      { label: "Let them run themselves out", hint: "Lose 1 day", run: (g) => { g.days(1); if (g.chance(0.35) && g.s.supplies.oxen > 2) { g.change("oxen", -1); return "The oxen finally stop, but one is missing. You search but can't find it."; } return "After a mile, the oxen tire out. Everything is fine, but it takes most of the day to get back to the trail."; } },
    ],
    fact: "Oxen spooked easily, and a stampede could wreck a wagon and everything inside. Pioneers circled their wagons at night to keep the animals safe in the middle.",
  },
  {
    id: "flashFlood", icon: "🌊", title: "Flash Flood!",
    when: (g) => g.s.miles < 1500,
    text: () => "A storm upstream sends a wall of water racing down the dry creek bed where you are camped!",
    choices: [
      { label: "Move the wagon to high ground", hint: "Lose 1 day", run: (g) => { g.days(1); return "You scramble uphill with everything. The creek roars by below you, but your family is safe and dry."; } },
      { label: "Try to cross before it gets worse", hint: "Saves time, very risky", run: (g) => { if (g.chance(0.5)) return "You race across just in time! Whew."; const lost = -g.change("food", -50); const p = g.sicken("cold", g.pick(), "got soaked and chilled"); g.days(1); return `The water catches you halfway! You lose ${lost} pounds of food, and ${p.name} gets soaked and chilled.`; } },
    ],
    fact: "In dry country, a storm miles away could send a flash flood down a creek bed with no warning. Experienced travelers never camped in a dry creek bed.",
  },
  {
    id: "mudSlide", icon: "🟫", title: "Stuck in the Mud",
    when: (g) => g.monthIndex() <= 5 && g.s.miles < 1000,
    text: () => "After days of rain, the trail is a sea of mud. Your wagon sinks up to its axles!",
    choices: [
      { label: "Unload and dig out the wheels", hint: "Lose 2 days", run: (g) => { g.days(2); return "It's slow, messy work, but you get the wagon moving again."; } },
      { label: "Hitch extra oxen from another wagon", hint: "Costs $10, lose 1 day", ok: (g) => g.s.money >= 10, run: (g) => { g.s.money -= 10; g.days(1); return "A neighbor lends two extra oxen for a fee. The wagon pops out of the mud!"; } },
    ],
    fact: "Spring rains made the Missouri and Kansas parts of the trail very muddy. That's one reason pioneers waited until the grass had grown and the ground dried out before leaving.",
  },
  {
    id: "wolves", icon: "🐺", title: "Wolves in the Night",
    when: (g) => g.s.supplies.oxen >= 2,
    text: () => "Wolves are howling close to camp, and your oxen are restless.",
    choices: [
      { label: "Build up the fire and take turns on watch", hint: "Everyone gets tired", run: (g) => { g.heal(-4); return "You keep a big fire burning all night. The wolves stay away, but nobody gets much sleep."; } },
      { label: "Get some sleep and hope for the best", hint: "Risky for your oxen", run: (g) => { if (g.chance(0.4) && g.s.supplies.oxen > 2) { g.change("oxen", -1); return "You wake to find one ox gone, taken by the wolves."; } return "The wolves don't come close. You wake up rested."; } },
    ],
    fact: "Wolves, coyotes and even bears followed wagon trains, hoping for food. At night pioneers circled their wagons, kept fires burning and took turns standing guard.",
  },
  {
    id: "guide", icon: "🧭", title: "A Mountain Man Offers a Shortcut",
    when: (g) => g.s.miles > 300 && g.s.miles < 1500,
    text: () => "A weathered trapper tells you that he knows a shortcut that could save you several days. He'll show you the way for a fee.",
    choices: [
      { label: "Pay $20 for the shortcut", hint: "Saves about 45 miles", ok: (g) => g.s.money >= 20, run: (g) => { g.s.money -= 20; const m = g.advance(45); return m > 0 ? `The shortcut is real! You save about ${m} miles of travel. Money well spent.` : "You follow the shortcut, but you're already close to the next landmark."; } },
      { label: "Stick to the main trail", hint: "Safe and known", run: () => "You thank him and stay on the well-worn trail." },
    ],
    fact: "Mountain men like Jim Bridger and Kit Carson had spent years trapping furs in the West. They knew the passes and shortcuts better than anyone, and sometimes worked as paid guides.",
  },
  {
    id: "fiddle", icon: "🎻", title: "Music Around the Campfire",
    text: () => "One of the families in a nearby wagon pulls out a fiddle. Before long, the whole camp is singing and dancing!",
    choices: [
      { label: "Join the fun!", hint: "Lose half a day, lift everyone's spirits", run: (g) => { g.days(1); g.heal(8); return "You dance until the stars come out. Everyone feels cheerful and rested."; } },
      { label: "Get to bed early", hint: "Save your strength", run: (g) => { g.heal(3); return "You listen to the music from your bedroll and fall asleep with a smile."; } },
    ],
    fact: "Evenings on the trail weren't all work. Pioneers sang, danced, told stories and played instruments around the fire. Music was a way to keep spirits up on a very long journey.",
  },
  {
    id: "abandonedWagon", icon: "🛻", title: "An Abandoned Wagon",
    when: (g) => g.s.miles > 150,
    text: () => "You find a wagon sitting empty beside the trail. Its owners are nowhere to be seen. There might be useful supplies inside.",
    choices: [
      { label: "Search the wagon", hint: "Lose 1 day, might find supplies", run: (g) => { g.days(1); const r = g.rand(); if (r < 0.2) { const p = g.sicken("cholera", g.pick(), "touched sick belongings"); return `Inside you find only a blanket, but it was used by someone who was very ill. ${p.name} soon feels sick too.`; } if (r < 0.55) { g.change("food", 60); return "You find 60 pounds of flour and bacon that were left behind!"; } if (r < 0.8) { g.change("medicine", 1); g.change("clothes", 1); return "You find a medicine kit and a warm coat!"; } g.change("parts", 1); return "You find a spare wagon wheel in good shape!"; } },
      { label: "Leave it alone", hint: "Better safe than sorry", run: () => "You move on without touching anything. You never learn what happened to the family." },
    ],
    fact: "The trail was littered with abandoned wagons, graves and left-behind belongings. About one in ten pioneers died on the trip, most from disease. Some families took blankets and clothes from the dead without knowing they could spread illness.",
  },
  {
    id: "lostChild", icon: "🔦", title: "Someone Wandered Off",
    text: (g) => `You count heads at dusk and ${g.pick().name} is missing! The prairie stretches in every direction.`,
    choices: [
      { label: "Fire a rifle and send up a signal fire", hint: "Lose half a day", run: (g) => { g.days(1); return `Just after dark, ${g.picked.name} walks into camp, tired and scared but safe. They had followed some butterflies too far from the wagons.`; } },
      { label: "Everyone searches in different directions", hint: "Lose 1 day, everyone is worn out", run: (g) => { g.days(1); g.heal(-5); const p = g.sicken("bruise", g.picked, "fell in a gully"); return `After hours of searching, you find ${p.name} at the bottom of a gully. They're scratched and bruised, but alive, and the whole family is exhausted.`; } },
    ],
    fact: "Children walked beside the wagons all day, and it was easy to wander off in tall prairie grass. Families taught kids to stay close and to build smoke signals if they got lost.",
  },
  {
    id: "hungryFamily", icon: "🍞", title: "A Family Is Hungry",
    when: (g) => g.s.supplies.food >= 150,
    text: () => "A family camped nearby lost most of their food when their wagon tipped over. Their children are hungry and they ask if you can spare some.",
    choices: [
      { label: "Share 50 pounds of food", hint: "A kind act, but costs supplies", run: (g) => { g.change("food", -50); g.s.flags.kind = (g.s.flags.kind || 0) + 1; g.heal(3); return "The family is deeply thankful. You feel good about helping, even though your own supplies shrink."; } },
      { label: "Sorry, you need it yourselves", hint: "Look after your own family first", run: () => "You wish them luck and explain that you can't spare anything. It's a hard decision." },
    ],
    fact: "On the trail, neighbors often depended on one another. Pioneers wrote about sharing food, lending oxen, and caring for sick strangers. But supplies were limited, and it wasn't always easy to decide how much to give.",
  },
  {
    id: "gratitude", icon: "🎁", title: "A Familiar Face",
    when: (g) => (g.s.flags.kind || 0) > 0 && !g.s.flags.paidBack,
    text: () => "A wagon pulls up next to yours. It's the family you helped earlier. They haven't forgotten your kindness!",
    choices: [
      { label: "Accept their gift", hint: "", run: (g) => { g.s.flags.paidBack = true; g.change("food", 70); g.change("medicine", 1); g.heal(5); return "They give you 70 pounds of food and a medicine kit as a thank-you. Kindness comes back around!"; } },
    ],
    fact: "Pioneer diaries tell many stories of strangers helping each other. A kindness one week could be returned many miles later, and trust between travelers was one of the most important things on the trail.",
  },
  {
    id: "cleanSpring", icon: "🏞️", title: "A Clear, Cold Spring",
    text: () => "You discover a bubbling spring of clear, cold water in a shady grove of trees. What a find!",
    choices: [
      { label: "Rest here and refill everything", hint: "Lose half a day, everyone feels better", run: (g) => { g.days(1); g.heal(7); return "Everyone drinks deeply and fills every barrel. You also find wild mint and watercress. It's the best day in weeks."; } },
      { label: "Fill the barrels and move on", hint: "Quick stop", run: (g) => { g.heal(3); return "You fill your barrels with fresh water and keep going."; } },
    ],
    fact: "Good water was precious. Pioneers kept a close watch for clear springs, because streams on the plains were often muddy and dirty. Clean water kept travelers healthy.",
  },
  {
    id: "cholera", icon: "🦠", title: "Sickness in the Camp Ahead",
    when: (g) => g.s.miles > 150,
    text: () => "A wagon train just ahead has a lot of people sick with cholera. Their camp is right next to the only good water for miles.",
    choices: [
      { label: "Camp upstream and wait 2 days", hint: "Lose 2 days, but stay safe", run: (g) => { g.days(2); return "You camp far upstream from them and use only your own boiled water. Everyone stays healthy, and you pass by when the sick travelers move on."; } },
      { label: "Pass through quickly", hint: "Risky", run: (g) => { if (g.chance(0.35)) { const p = g.sicken("cholera", g.pick(), "caught cholera passing through a sick camp"); return `You hurry past, but ${p.name} has caught the sickness anyway.`; } return "You hold your breath and hurry through without stopping. You get lucky this time."; } },
      { label: "Take extra care to boil water", hint: "Costs a day, much safer", run: (g) => { g.days(1); if (g.chance(0.1)) { const p = g.sicken("fever", g.pick()); return `You boil all your water. Even so, ${p.name} comes down with a fever.`; } return "You boil every drop of water before drinking. Nobody gets sick."; } },
    ],
    fact: "Cholera swept the trail in 1849 and 1850, killing thousands. People believed it came from bad air, but it was really spread by germs in dirty water. Boiling water would have saved many lives, but no one knew that yet.",
  },
);

// ---------------------------------------------------------------------------
// Little facts about illnesses, shown the first time someone gets one (collected in the History Journal)
// ---------------------------------------------------------------------------
WW.ailmentFact = "Illness was the biggest danger of the Oregon Trail. About one pioneer in ten died on the way. Most deaths were from diseases like cholera, dysentery and measles, not from accidents or attacks.";
