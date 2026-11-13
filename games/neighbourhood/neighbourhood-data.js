// Neighbourhood Tycoon — game content: seasons, weather, jobs, goals, money tips, events and quiz.

window.NT = {};

// ---------------------------------------------------------------------------
// Calendar: a year is 52 weeks, 13 weeks per season. Players start in any season.
// ---------------------------------------------------------------------------
NT.SEASONS = [
  { id: "spring", name: "Spring", emoji: "🌸", months: "March – May", bg: "linear-gradient(#bfe8ff, #d9f7c8)" },
  { id: "summer", name: "Summer", emoji: "☀️", months: "June – August", bg: "linear-gradient(#ffd27a, #fff0bd)" },
  { id: "fall", name: "Fall", emoji: "🍂", months: "September – November", bg: "linear-gradient(#ffb36b, #ffe5bd)" },
  { id: "winter", name: "Winter", emoji: "❄️", months: "December – February", bg: "linear-gradient(#b6d4ef, #eef6ff)" },
];
NT.seasonOf = (week) => Math.floor((week - 1) / 13);

// Free hours a kid has each week
NT.hoursFor = function (week) {
  if (week >= 14 && week <= 26) return 16;            // summer vacation
  if (week === 6 || week === 49 || week === 50) return 12; // spring break & winter break
  return 6;                                           // school weeks
};
NT.breakName = function (week) {
  if (week >= 14 && week <= 26) return "Summer vacation: lots of free time!";
  if (week === 6) return "Spring break!";
  if (week === 49 || week === 50) return "Winter break!";
  return "School week: just a few free hours.";
};

// ---------------------------------------------------------------------------
// Weather by season. out = effect on outdoor jobs, thirst = lemonade, snow = shoveling
// ---------------------------------------------------------------------------
NT.weather = [
  [ // spring
    { name: "Sunny", emoji: "☀️", w: 40, out: 1.15 },
    { name: "Cloudy", emoji: "⛅", w: 30, out: 1.0 },
    { name: "Rainy", emoji: "🌧️", w: 30, out: 0.55, thirst: 0.5 },
  ],
  [ // summer
    { name: "Hot & sunny", emoji: "🌞", w: 40, out: 1.1, thirst: 1.4 },
    { name: "Heat wave", emoji: "🥵", w: 20, out: 0.85, thirst: 1.7 },
    { name: "Cloudy", emoji: "⛅", w: 25, out: 1.0 },
    { name: "Thunderstorm", emoji: "⛈️", w: 15, out: 0.3, thirst: 0.3 },
  ],
  [ // fall
    { name: "Crisp & sunny", emoji: "🍁", w: 45, out: 1.1 },
    { name: "Cloudy", emoji: "☁️", w: 30, out: 1.0 },
    { name: "Rainy", emoji: "🌧️", w: 25, out: 0.55 },
  ],
  [ // winter
    { name: "Cold", emoji: "🥶", w: 35, out: 0.8, snow: 0.5 },
    { name: "Snowstorm", emoji: "🌨️", w: 25, out: 0.5, snow: 2.4 },
    { name: "Mild day", emoji: "🌤️", w: 25, out: 1.0, snow: 0.1 },
    { name: "Icy & freezing", emoji: "🧊", w: 15, out: 0.6, snow: 0.3 },
  ],
];

// ---------------------------------------------------------------------------
// Jobs.  hours: per shift.  base: typical number of customers/requests in a normal week.
// season: demand multiplier for [spring, summer, fall, winter].
// outdoor: how much bad weather hurts (0 = indoors).
// gear = one-time buy-in.  training = fee + study hours.
// ---------------------------------------------------------------------------
NT.jobs = [
  { id: "lemonade", emoji: "🍋", name: "Lemonade Stand", blurb: "Sell cold drinks to thirsty neighbours.",
    hours: 2, pay: 14, supplies: 4, base: 3.2, season: [0.8, 1.5, 0.6, 0.05], outdoor: 0.8, thirst: true,
    gear: { name: "Stand & pitcher", cost: 15 }, seasonNote: "Best on hot summer days" },
  { id: "dogwalk", emoji: "🐕", name: "Dog Walking", blurb: "Walk the neighbours' dogs around the block.",
    hours: 1, pay: 7, supplies: 0, base: 4.8, season: [1.1, 1.0, 1.1, 0.7], outdoor: 0.5,
    gear: { name: "Leash & treat pouch", cost: 10 }, seasonNote: "Busy most of the year" },
  { id: "mowing", emoji: "🌿", name: "Mowing Lawns", blurb: "Mow lawns for neighbours who are too busy.",
    hours: 2, pay: 19, supplies: 3, base: 3.2, season: [1.2, 1.3, 0.8, 0], outdoor: 0.9,
    gear: { name: "Lawn mower", cost: 120 }, seasonNote: "Grass doesn't grow in winter" },
  { id: "carwash", emoji: "🚗", name: "Car Washing", blurb: "Wash and dry cars in the driveway.",
    hours: 2, pay: 19, supplies: 4, base: 2.4, season: [1.2, 1.4, 0.7, 0.1], outdoor: 0.9,
    gear: { name: "Buckets, soap & sponges", cost: 20 }, seasonNote: "Best in warm weather" },
  { id: "rake", emoji: "🍂", name: "Raking Leaves", blurb: "Clear leaves off yards when they fall.",
    hours: 2, pay: 20, supplies: 1, base: 3.2, season: [0.3, 0, 2.0, 0], outdoor: 0.6,
    gear: { name: "Leaf rake & bags", cost: 12 }, seasonNote: "Only really needed in fall" },
  { id: "shovel", emoji: "⛄", name: "Snow Shoveling", blurb: "Shovel driveways and sidewalks after snow.",
    hours: 2, pay: 19, supplies: 0, base: 3.2, season: [0, 0, 0.1, 1.3], outdoor: 0.3, snow: true,
    gear: { name: "Snow shovel", cost: 18 }, seasonNote: "Needs snow! Busiest in snowstorms" },
  { id: "babysit", emoji: "👶", name: "Babysitting", blurb: "Look after younger kids while parents are out.",
    hours: 3, pay: 17, supplies: 0, base: 2, season: [1, 1, 1, 1.2], outdoor: 0,
    training: { name: "Babysitting Course", cost: 30, hours: 6 }, seasonNote: "Steady all year long" },
  { id: "petsit", emoji: "🐱", name: "Pet Sitting", blurb: "Feed and play with pets while families travel.",
    hours: 2, pay: 14, supplies: 0, base: 2.4, season: [0.8, 1.6, 0.8, 1.2], outdoor: 0.2,
    training: { name: "Pet Care Basics", cost: 20, hours: 4 }, seasonNote: "Busy when families go on vacation" },
  { id: "lifeguard", emoji: "🏊", name: "Lifeguard", blurb: "Watch over the community pool.",
    hours: 4, pay: 38, supplies: 0, base: 3.2, season: [0, 1, 0, 0], outdoor: 0.3,
    training: { name: "Lifeguard Certification", cost: 60, hours: 12 }, seasonNote: "Pool is only open in summer" },
  { id: "tutor", emoji: "📚", name: "Tutoring", blurb: "Help younger kids with homework and reading.",
    hours: 1, pay: 11, supplies: 0, base: 4, season: [1.1, 0.5, 1.3, 1.2], outdoor: 0,
    training: { name: "Tutor Training Workshop", cost: 30, hours: 8 }, seasonNote: "Busy during the school year" },
  { id: "tech", emoji: "💻", name: "Tech Helper", blurb: "Teach neighbours to use phones and computers.",
    hours: 2, pay: 22, supplies: 0, base: 2.4, season: [1, 1, 1, 1], outdoor: 0,
    training: { name: "Tech Skills Class", cost: 35, hours: 6 }, seasonNote: "Steady all year long" },
  { id: "bake", emoji: "🍪", name: "Bake Sale", blurb: "Bake cookies and treats to sell.",
    hours: 3, pay: 34, supplies: 12, base: 2.4, season: [1, 0.7, 1.2, 1.5], outdoor: 0,
    gear: { name: "Baking kit", cost: 30 }, seasonNote: "Holiday treats sell best in winter" },
];

NT.rates = {
  l: { name: "Low price", emoji: "🏷️", pay: 0.8, dem: 1.3, tip: "20% less pay per job, but about 30% more customers." },
  n: { name: "Normal", emoji: "💲", pay: 1, dem: 1, tip: "Regular pay, regular number of customers." },
  p: { name: "Premium", emoji: "💎", pay: 1.3, dem: 0.7, tip: "30% more pay per job, but about 30% fewer customers. Unlocks at Level 2." },
};
NT.levels = [0, 4, 10, 20, 35];  // jobs done needed for levels 1–5
NT.levelNames = ["Beginner", "Getting Good", "Skilled", "Expert", "Master"];

// ---------------------------------------------------------------------------
// Savings goals
// ---------------------------------------------------------------------------
NT.goals = [
  { id: "headphones", emoji: "🎧", name: "Cool Headphones", cost: 90 },
  { id: "bike", emoji: "🚲", name: "New Bike", cost: 220 },
  { id: "camp", emoji: "🏕️", name: "Summer Camp Trip", cost: 300 },
  { id: "console", emoji: "🎮", name: "Game Console", cost: 400 },
  { id: "scooter", emoji: "🛴", name: "Electric Scooter", cost: 550 },
  { id: "laptop", emoji: "💻", name: "Laptop", cost: 800 },
  { id: "vacation", emoji: "🏝️", name: "Dream Vacation", cost: 1500 },
  { id: "car", emoji: "🚗", name: "First Car Fund", cost: 3000 },
];

// ---------------------------------------------------------------------------
// Investing
// ---------------------------------------------------------------------------
NT.bankRate = 0.0015;                       // weekly savings interest (kid-friendly!)
NT.fund = { name: "Whole Market Fund", emoji: "🧺", mean: 0.0025, sd: 0.025, start: 100 };
NT.single = { name: "Zoom Scooters Inc.", emoji: "🛵", mean: 0.003, sd: 0.07, start: 50 };

// ---------------------------------------------------------------------------
// Money tips — unlocked the first time they matter
// ---------------------------------------------------------------------------
NT.tips = {
  opportunity: { icon: "⚖️", title: "Opportunity Cost", text: "You only have so many free hours. Every hour you spend on one job is an hour you can't spend on another. The best job to give up is the one that pays you least for your time." },
  startup: { icon: "🏗️", title: "Start-up Costs", text: "Some jobs need you to buy equipment first. That money is an investment: you spend now so you can earn more later. Check how many jobs it will take to earn it back." },
  training: { icon: "🎓", title: "Training Pays Off", text: "Learning a skill takes time and money, but it unlocks jobs that pay more per hour. Spending on your own skills is one of the best investments you can make." },
  seasons: { icon: "🍂", title: "Seasonal Demand", text: "Some jobs are busy only at certain times of year. Nobody needs their lawn mowed under snow! Smart business owners change what they do when the seasons change." },
  margin: { icon: "🧾", title: "Profit Margin", text: "Money you take in is called revenue. After you pay for supplies, what's left is your profit. A job with lower supply costs keeps more of every dollar." },
  skill: { icon: "⭐", title: "Experience Counts", text: "The more you do a job, the better you get. Experienced workers can earn more and customers ask for them more often." },
  rate: { icon: "💎", title: "Setting Your Price", text: "Lower prices bring more customers, but you earn less from each one. Higher prices bring fewer customers who each pay more. Finding the sweet spot is how businesses make the most money." },
  waste: { icon: "😴", title: "Supply and Demand", text: "If you plan more jobs than there are customers, you waste your time waiting around. Check the forecast and match your hours to demand." },
  interest: { icon: "🏦", title: "Interest", text: "A bank pays you interest for keeping money in savings. Your money grows without you doing any work. (Real banks pay less than this kid-friendly bank!)" },
  compound: { icon: "❄️", title: "Compound Growth", text: "Interest earns interest! Each week you earn on your original money PLUS the interest you already earned. Small amounts snowball over a long time." },
  risk: { icon: "🎢", title: "Risk and Return", text: "Stocks can earn more than a savings account over many years, but their prices go up AND down. Higher possible reward comes with higher risk. Only invest money you won't need soon." },
  diversify: { icon: "🧺", title: "Diversification", text: "A fund holds tiny pieces of hundreds of companies, so one company's bad news barely matters. A single stock can jump or crash. Don't put all your eggs in one basket!" },
  emergency: { icon: "🚑", title: "Emergency Fund", text: "Surprise expenses happen to everyone. Keeping some money in cash or savings means a surprise bill doesn't force you to sell investments at a bad time." },
  liquidity: { icon: "💧", title: "Liquidity", text: "Cash is the easiest money to spend. Savings take a step to withdraw, and stocks have to be sold, maybe when the price is low. Money that's easy to reach is called liquid." },
  goal: { icon: "🎯", title: "Saving for Goals", text: "Having a goal makes saving easier. Decide what you want, figure out the cost, and make a plan to get there, instead of spending on whatever comes up." },
  wants: { icon: "🛍️", title: "Wants vs. Needs", text: "Fun things are nice, but they're wants, not needs. It's okay to enjoy some spending as long as you protect your savings goals." },
};

// ---------------------------------------------------------------------------
// Random weekly events (gain / cost in dollars). needsWork: only if you worked this week.
// ---------------------------------------------------------------------------
NT.events = [
  { id: "bday", w: 3, icon: "🎂", text: "It's your birthday week! Grandma sends a card with $25 inside.", gain: 25 },
  { id: "tip", w: 4, icon: "😊", needsWork: true, text: "A happy customer gives you a surprise $8 tip!", gain: 8 },
  { id: "found", w: 3, icon: "🪙", text: "You find $5 in the pocket of an old jacket.", gain: 5 },
  { id: "chores", w: 3, icon: "🧹", text: "Mom and Dad pay you $10 for helping with big chores at home.", gain: 10 },
  { id: "tire", w: 4, icon: "🚲", text: "Your bike tire pops! The repair costs $14.", cost: 14, tip: "emergency" },
  { id: "pot", w: 2, icon: "🪴", text: "You accidentally break a neighbour's flower pot and pay $12 to replace it.", cost: 12, tip: "emergency" },
  { id: "arcade", w: 3, icon: "🕹️", text: "Your friends invite you to the arcade. You spend $9 having fun.", cost: 9, tip: "wants" },
  { id: "recommend", w: 3, icon: "📣", needsWork: true, text: "A neighbour tells everyone how great you are! You'll get 20% more customers next week.", buff: 1.2 },
];

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------
NT.quiz = [
  { q: "You have 8 free hours. Mowing pays $9.50 an hour and dog walking pays $8 an hour. What is the opportunity cost of mowing for those hours?", a: ["The dog walking money you gave up", "Nothing, mowing is free", "The cost of the mower"], explain: "Opportunity cost is the next-best choice you give up." },
  { q: "Why do lawn mowing jobs disappear in winter?", a: ["Demand changes with the seasons", "Mowers break in the cold", "Kids don't like winter"], explain: "Seasonal demand: customers only need certain services at certain times of year." },
  { q: "You buy a $120 mower to earn money later. This is an example of…", a: ["Investing in equipment", "Interest", "Inflation"], explain: "A start-up cost is an investment: you spend now to earn more later." },
  { q: "Why does a lifeguard certification help you earn more?", a: ["Training gives you skills that pay more per hour", "It makes pools open longer", "It lowers your taxes"], explain: "Skills and training are investments in yourself." },
  { q: "Your savings account pays interest every week. After a few years, why does the growth speed up?", a: ["Interest earns interest (compounding)", "The bank gets nicer", "Prices go down"], explain: "Compound growth: you earn on your original money plus past interest." },
  { q: "Which has MORE risk: a single company's stock or a fund of hundreds of companies?", a: ["The single stock", "The fund", "They are exactly the same"], explain: "Diversification spreads risk across many companies." },
  { q: "The stock market had a bad month and your investments dropped. What's the best way to think about it?", a: ["Prices go up and down; investing is for money you won't need soon", "Stocks never recover", "You should panic and sell everything"], explain: "Over long times stocks have often grown, but short-term drops are normal." },
  { q: "You raise your price and get fewer customers, but each pays more. What is that tradeoff called?", a: ["Price vs. demand", "Interest", "Saving"], explain: "Higher prices usually mean fewer buyers." },
  { q: "Your bike tire pops and you must pay for a repair. What helps most?", a: ["An emergency fund", "A bigger lawn mower", "More stocks"], explain: "An emergency fund covers surprises without selling investments." },
  { q: "You planned 5 shifts but only 2 customers asked. What was the problem?", a: ["Supply was bigger than demand", "Prices were too low", "The weather was too nice"], explain: "Match your hours to how many customers there really are." },
  { q: "Revenue minus the cost of supplies equals…", a: ["Profit", "Interest", "Savings"], explain: "Profit is what's left after costs." },
  { q: "Which is the most liquid, meaning easiest to spend right now?", a: ["Cash in your wallet", "Stocks", "A savings account"], explain: "Cash is the most liquid; stocks must be sold first." },
];
