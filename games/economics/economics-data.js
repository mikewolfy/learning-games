// Stand Tycoon — economics content: vocabulary, scheduled news events and quiz questions.
// Events change the game by adding "mods" to the state `s`:
//   { key: "cost" | "traffic" | "wtp" | "weather", value, from, until }   (days are inclusive)

window.EC = {};

// ---------------------------------------------------------------------------
// Econ vocabulary — unlocked the first time kids run into each idea
// ---------------------------------------------------------------------------
EC.concepts = {
  profit: { icon: "💰", title: "Profit", text: "Profit = the money you earn (revenue) minus the money you spend (costs). A business only grows when profit is more than zero." },
  demand: { icon: "📈", title: "Demand", text: "Demand is how many people want to buy something. When something gets popular, or more people are around, demand goes UP." },
  supply: { icon: "🚚", title: "Supply", text: "Supply is how much of something is available. When there is a lot of it, like a big fruit harvest, it gets cheaper to buy." },
  scarcity: { icon: "🍃", title: "Scarcity", text: "Scarcity means there isn't enough of something for everyone who wants it. Scarce things cost more." },
  wtp: { icon: "🤑", title: "Willingness to Pay", text: "Different people will pay different amounts. On a hot day, a cold drink is worth more to thirsty people, so they'll pay a higher price." },
  fixed: { icon: "🏠", title: "Fixed vs. Variable Costs", text: "Fixed costs, like rent, stay the same no matter how much you sell. Variable costs, like ingredients, go up the more you make." },
  competition: { icon: "🥊", title: "Competition", text: "When other businesses sell the same thing, customers can choose. Competition pushes businesses to lower prices or offer something better." },
  opportunity: { icon: "⚖️", title: "Opportunity Cost", text: "Every choice means giving something up. If you spend $10 on one thing, you can't spend that same $10 on something else. What you give up is the opportunity cost." },
  inflation: { icon: "🎈", title: "Inflation", text: "Inflation is when prices across the whole economy slowly rise. Your money buys a little less than it used to." },
  inventory: { icon: "📦", title: "Inventory & Spoilage", text: "Inventory is the stuff you have ready to sell. If you make too much and it spoils, you wasted money. If you make too little, you miss sales!" },
  investment: { icon: "🏗️", title: "Investing", text: "Investing means spending money now to earn more later. An upgrade costs cash today, but if it brings in extra profit, it pays for itself." },
  debt: { icon: "🏦", title: "Debt", text: "Debt is money you borrowed and have to pay back. Borrowing can help in a pinch, but you owe it later." },
};

// ---------------------------------------------------------------------------
// News events, scheduled by day so every big idea shows up in a run
// ---------------------------------------------------------------------------
EC.events = {
  harvest: {
    icon: "🍓", title: "Bumper Harvest!", concept: "supply",
    text: "Local farmers grew a HUGE crop this year. There's lots of fruit and sugar, so ingredients are cheap for the next 2 days.",
    apply(s) { s.mods.push({ key: "cost", value: 0.65, from: s.day, until: s.day + 1 }); },
  },
  festival: {
    icon: "🎪", title: "Town Festival Today!", concept: "demand",
    text: "The town festival starts today and the streets are packed with people. Many more customers will walk by your stand!",
    apply(s) { s.mods.push({ key: "traffic", value: 1.8, from: s.day, until: s.day }); },
  },
  rival: {
    icon: "🏪", title: "A Rival Opens Up!", concept: "competition",
    text: "A new stand opened across the street selling the same thing for $2.50. Some customers will go there if your price is higher.",
    apply(s) { s.rival = { price: 2.5, until: s.day + 5 }; s.mods.push({ key: "traffic", value: 0.85, from: s.day, until: s.day + 5 }); },
  },
  frost: {
    icon: "🥶", title: "Frost Ruins Crops!", concept: "scarcity",
    text: "A freezing night damaged lots of crops. Ingredients are scarce and the price has jumped for the next 2 days.",
    apply(s) { s.mods.push({ key: "cost", value: 1.6, from: s.day, until: s.day + 1 }); },
  },
  rent: {
    icon: "🏠", title: "Rent Is Going Up", concept: "fixed",
    text: "Your landlord is raising the rent on your spot from $6 to $9 a day. You have to pay it every day, whether you sell 0 or 100.",
    apply(s) { s.rent = 9; },
  },
  bulk: {
    icon: "🏷️", title: "Bulk Discount Offer", concept: "inventory",
    text: "A supplier offers ingredients for only $0.55 each if you buy at least 40 today. It's a great price, but anything you don't sell today will spoil. Do you take the deal?",
    choices: [
      { label: "Take the deal", hint: "$0.55 each, buy at least 40", run(s) { s.costOverride = 0.55; s.minBuy = 40; s.pendingBuy = 40; return "You took the deal. Make sure you can sell all of those, because leftovers will spoil!"; } },
      { label: "No thanks", hint: "Buy normally", run() { return "You decide to buy only what you think you can sell."; } },
    ],
  },
  viral: {
    icon: "📱", title: "You Went Viral!", concept: "demand",
    text: "Someone posted a video of your stand and it went viral! Lots of new customers are coming for the next 2 days.",
    apply(s) { s.mods.push({ key: "traffic", value: 1.5, from: s.day, until: s.day + 1 }); },
  },
  inflation: {
    icon: "🎈", title: "Prices Are Rising Everywhere", concept: "inflation",
    text: "The cost of nearly everything has gone up about 20%. From now on, your ingredients will cost more every day.",
    apply(s) { s.inflation = 1.2; },
  },
  heat: {
    icon: "🔥", title: "Heat Wave!", concept: "wtp",
    text: "A heat wave is coming! It will be scorching for 2 days. People will be thirsty and willing to pay more for a cold drink.",
    apply(s) { s.mods.push({ key: "weather", value: "hot", from: s.day, until: s.day + 1 }); },
  },
  charity: {
    icon: "🏫", title: "School Fundraiser", concept: "opportunity",
    text: "The school asks you to donate $10 to its fundraiser. People will hear you're helping out and visit your stand more for 2 days. But the $10 can't be spent on anything else.",
    choices: [
      { label: "Donate $10", hint: "More customers for 2 days", disabled: (s) => s.cash < 10, run(s) { s.cash -= 10; s.mods.push({ key: "traffic", value: 1.3, from: s.day, until: s.day + 1 }); return "You donate $10. Customers cheer, and your stand gets busier!"; } },
      { label: "Not this time", hint: "Keep your money", run() { return "You keep your $10 to spend on your business."; } },
    ],
  },
};

// day -> event id
EC.schedule = { 3: "harvest", 5: "festival", 7: "rival", 8: "frost", 10: "rent", 12: "bulk", 14: "viral", 15: "inflation", 17: "heat", 19: "charity" };

// ---------------------------------------------------------------------------
// End-of-game quiz — first answer is always the correct one (shuffled by the game)
// ---------------------------------------------------------------------------
EC.quiz = [
  { q: "What is profit?", a: ["Money you earn minus money you spend", "All the money you earn", "The price of your product"], explain: "Profit = revenue (what you earn) − costs (what you spend)." },
  { q: "A festival comes to town and way more people walk by your stand. What happened to demand?", a: ["It went up", "It went down", "It stayed the same"], explain: "More people wanting to buy means demand went up." },
  { q: "A farmer has a giant harvest, so there's lots of fruit. What usually happens to the price of fruit?", a: ["It goes down", "It goes up", "Nothing changes"], explain: "When supply is high, prices tend to fall." },
  { q: "Frost destroyed lots of crops, so there's less fruit. What happens to the price?", a: ["It goes up", "It goes down", "It stays exactly the same"], explain: "When something is scarce, prices tend to rise." },
  { q: "Which of these is a FIXED cost for a stand?", a: ["Daily rent for your spot", "Fruit for each smoothie", "Cups for each customer"], explain: "Rent stays the same no matter how much you sell. Ingredients are variable costs." },
  { q: "You charge more and fewer customers buy. This shows that…", a: ["Higher prices usually mean fewer buyers", "Customers are silly", "Prices don't matter"], explain: "That's the basic idea of a demand curve: as price goes up, quantity demanded goes down." },
  { q: "On a hot day, why can you often charge more?", a: ["People are thirsty and willing to pay more", "Ingredients are free", "Nobody else is selling"], explain: "Customers value a cold drink more when it's hot, so their willingness to pay goes up." },
  { q: "A rival opens across the street and sells for less. What is this called?", a: ["Competition", "Inflation", "Scarcity"], explain: "Competition gives customers choices and pushes businesses to improve." },
  { q: "You spend $10 on a donation, so you can't spend it on ingredients. What is the $10 of ingredients you gave up called?", a: ["Opportunity cost", "Profit", "Inflation"], explain: "Opportunity cost is the next-best thing you give up when you make a choice." },
  { q: "Why did unsold smoothies at the end of the day cost you money?", a: ["You paid for ingredients that spoiled", "They were free", "They made profit overnight"], explain: "Inventory that spoils is money wasted. Planning how much to make is a key business skill." },
  { q: "You buy a faster blender to serve more customers later. This is an example of…", a: ["Investing", "Inflation", "Debt"], explain: "Investing means spending now to earn more later." },
  { q: "Prices across the whole town slowly go up by 20%. What is that called?", a: ["Inflation", "Competition", "Profit"], explain: "Inflation is a general rise in prices over time." },
];
