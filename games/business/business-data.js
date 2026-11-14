// Business Builder — content: business types, roles, business structures, money tips and quiz.
// (The economy math lives in business-engine.js; story events live in business-events.js.)

window.BB = window.BB || {};

// ---------------------------------------------------------------------------
// Eight kinds of business. Numbers are per QUARTER (3 months).
//   price/cost: what one sale brings in / costs you      market: customers a quarter in a "just average" neighborhood
//   ownerCap: what you can make or serve yourself        makerCap: what one hired maker adds
//   season: demand multiplier for [Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec]
//   elast: how much customers care about price           qv: how much customers value quality
// ---------------------------------------------------------------------------
BB.types = {
  bakery: {
    emoji: "🧁", name: "Cupcake Shop", unit: "cupcakes", blurb: "Bake treats for your neighborhood. Busy at the holidays!",
    startup: 2500, price: 4.5, cost: 1.3, market: 3000, ownerCap: 1200, makerCap: 2400, rent: 900, wage: 3200,
    season: [0.85, 1.0, 0.95, 1.3], elast: 1.7, qv: 0.08, buzzMult: 1, risk: "Medium",
    roles: { maker: "Baker", seller: "Counter Clerk", expert: "Pastry Chef", manager: "Shop Manager" },
    recall: "A batch of cupcakes had a food safety problem.",
  },
  lawn: {
    emoji: "🌿", name: "Lawn & Garden Service", unit: "jobs", blurb: "Mow, rake and plant. Super busy in summer, quiet in winter.",
    startup: 1500, price: 46, cost: 9, market: 250, ownerCap: 100, makerCap: 200, rent: 350, wage: 2700,
    season: [0.35, 1.2, 1.4, 0.75], elast: 1.5, qv: 0.08, buzzMult: 1, risk: "Medium",
    roles: { maker: "Crew Member", seller: "Sales Rep", expert: "Landscape Designer", manager: "Crew Boss" },
    recall: "A crew damaged a customer's yard.",
  },
  tech: {
    emoji: "📱", name: "App Studio", unit: "users", blurb: "Build an app. Costs little to serve more users, but customers expect great quality.",
    startup: 3500, price: 6, cost: 1.2, market: 2600, ownerCap: 1100, makerCap: 2300, rent: 500, wage: 4800,
    season: [1, 1, 1, 1.05], elast: 2.2, qv: 0.11, buzzMult: 1.1, risk: "High",
    roles: { maker: "Support Engineer", seller: "Marketer", expert: "App Developer", manager: "Product Manager" },
    recall: "A bug in your app leaked users' information.",
  },
  shirts: {
    emoji: "👕", name: "Custom T-Shirts", unit: "shirts", blurb: "Print shirts for teams, clubs and families.",
    startup: 2000, price: 18, cost: 7, market: 760, ownerCap: 300, makerCap: 600, rent: 800, wage: 3200,
    season: [0.8, 1.0, 1.05, 1.35], elast: 1.8, qv: 0.08, buzzMult: 1, risk: "Medium",
    roles: { maker: "Printer", seller: "Sales Rep", expert: "Designer", manager: "Shop Manager" },
    recall: "A batch of shirts came out faded and customers want refunds.",
  },
  bikes: {
    emoji: "🚲", name: "Bike Repair & Rentals", unit: "repairs & rentals", blurb: "Fix and rent bikes. Big in the warm months.",
    startup: 3000, price: 32, cost: 9, market: 480, ownerCap: 190, makerCap: 380, rent: 1100, wage: 3300,
    season: [0.55, 1.25, 1.4, 0.8], elast: 1.6, qv: 0.08, buzzMult: 1, risk: "Medium",
    roles: { maker: "Mechanic", seller: "Salesperson", expert: "Master Mechanic", manager: "Shop Manager" },
    recall: "A rental bike's brakes failed and a rider got hurt.",
  },
  pets: {
    emoji: "🐶", name: "Pet Care", unit: "visits", blurb: "Walk, feed and care for pets. Happy owners come back again and again.",
    startup: 1200, price: 28, cost: 8, market: 500, ownerCap: 200, makerCap: 400, rent: 400, wage: 3100,
    season: [0.9, 1.0, 1.15, 0.95], elast: 1.5, qv: 0.08, buzzMult: 1, repW: 1.25, risk: "Low",
    roles: { maker: "Pet Handler", seller: "Receptionist", expert: "Vet Tech", manager: "Care Manager" },
    recall: "A pet got sick while in your care.",
  },
  tutor: {
    emoji: "📚", name: "Tutoring Center", unit: "sessions", blurb: "Help kids learn. Busy during the school year.",
    startup: 1800, price: 36, cost: 8, market: 400, ownerCap: 160, makerCap: 320, rent: 700, wage: 3300,
    season: [1.1, 0.9, 0.7, 1.2], elast: 1.4, qv: 0.09, buzzMult: 1, repW: 1.15, risk: "Low",
    roles: { maker: "Tutor", seller: "Enrollment Rep", expert: "Curriculum Lead", manager: "Center Director" },
    recall: "A parent complained a tutor wasn't qualified.",
  },
  eco: {
    emoji: "🌎", name: "Eco Online Store", unit: "orders", blurb: "Sell earth-friendly products online. Marketing is everything!",
    startup: 3000, price: 22, cost: 9.5, market: 640, ownerCap: 250, makerCap: 500, rent: 300, wage: 3000,
    season: [0.9, 0.95, 0.95, 1.3], elast: 2.0, qv: 0.08, buzzMult: 1.35, risk: "High",
    roles: { maker: "Packer", seller: "Marketer", expert: "Product Designer", manager: "Operations Manager" },
    recall: "A shipment of products was found to be defective.",
  },
};

// Role details shared by every business (names come from the business type)
BB.roles = {
  maker: { emoji: "🛠️", wageMult: 1.0, desc: "Makes or serves your product. Adds capacity." },
  seller: { emoji: "📣", wageMult: 0.95, desc: "Brings in more customers." },
  expert: { emoji: "🎓", wageMult: 1.25, desc: "Raises your quality over time." },
  manager: { emoji: "📋", wageMult: 1.5, desc: "Keeps a bigger team running smoothly and happy." },
};

// ---------------------------------------------------------------------------
// Business structures
// ---------------------------------------------------------------------------
BB.structures = {
  solo: { name: "Sole Proprietor", emoji: "🧑", short: "Just you", fee: 0, quarterly: 0, rate: 0.030,
    text: "You and the business are the same legal person. It's simple and cheap, but if the business is sued or owes money, YOUR personal savings are on the line." },
  llc: { name: "LLC", emoji: "🛡️", short: "Limited Liability Company", fee: 800, quarterly: 150, rate: 0.026,
    text: "A Limited Liability Company is its own legal entity. If the business is sued or goes broke, your personal savings are protected. You pay a filing fee and a small yearly cost." },
  corp: { name: "Corporation", emoji: "🏛️", short: "Incorporated", fee: 3000, quarterly: 450, rate: 0.020,
    text: "A corporation is owned through shares. Your personal savings are protected, banks lend at better rates, and you can sell shares to investors for cash. It costs more in paperwork and fees." },
};

// ---------------------------------------------------------------------------
// Business tips (unlock the first time they matter)
// ---------------------------------------------------------------------------
BB.tips = {
  solo: { icon: "🧑", title: "Sole Proprietorship", text: "Most small businesses begin as a sole proprietorship: just you. It's easy to start, and you keep all the profit. The catch: you and the business are legally the same, so business debts can reach your personal savings." },
  profit: { icon: "💰", title: "Revenue, Costs and Profit", text: "Revenue is the money customers pay you. Costs are what you spend. Profit = revenue − costs. A business that makes a profit can grow; one that loses money can't survive for long." },
  fixed: { icon: "🏠", title: "Fixed and Variable Costs", text: "Rent is a fixed cost: you pay it no matter how much you sell. Ingredients and supplies are variable costs: they rise with every sale. Selling more spreads your fixed costs thinner." },
  demand: { icon: "📈", title: "Price and Demand", text: "When your price goes up, fewer customers buy. When it goes down, more do. But customers also care about quality: a better product can earn a higher price." },
  capacity: { icon: "🚧", title: "Capacity", text: "Capacity is the most you can make or serve. If more customers want your product than you can handle, you lose sales AND disappoint people. That's a sign it's time to grow your team." },
  payroll: { icon: "👥", title: "Payroll", text: "When you hire people you pay their wages every quarter plus payroll taxes. Employees are an investment: they only help your profit if the extra sales they make possible are bigger than what they cost." },
  taxes: { icon: "🧾", title: "Taxes", text: "Businesses pay taxes on their profit. If you lose money one quarter, that loss can lower your taxes later, but only if you earn profit again!" },
  cashflow: { icon: "🌊", title: "Cash Flow", text: "Cash flow is the money moving in and out. A business can be profitable on paper and still run out of cash to pay bills. That's why keeping a cash cushion matters." },
  liability: { icon: "🛡️", title: "Liability", text: "Liability means being responsible for debts and damages. As a sole proprietor your personal savings can be used to pay business bills. An LLC or corporation builds a legal wall that protects your own savings." },
  llc: { icon: "🏛️", title: "LLCs and Corporations", text: "Forming an LLC or corporation costs money, but it protects your personal savings. A corporation can also sell shares to investors and borrow more cheaply." },
  loan: { icon: "🏦", title: "Loans and Interest", text: "A loan lets you spend money you don't have yet, but you pay interest every quarter on what you owe. Borrow when the money will earn MORE than the interest costs." },
  equity: { icon: "🥧", title: "Equity and Investors", text: "Equity is ownership. When an investor puts in money for a share of your company, you get cash to grow now, but you own a smaller slice of the pie from then on." },
  reputation: { icon: "⭐", title: "Reputation", text: "Reputation is what customers say about you. Great quality and happy customers build it slowly; one bad event can damage it fast. A strong reputation brings in more customers." },
  cycle: { icon: "🎢", title: "Business Cycles", text: "Economies go through booms, when people spend freely, and recessions, when they hold back. Smart owners save in good times so they can survive the tough ones." },
  competition: { icon: "🥊", title: "Competition", text: "When a rival opens, customers can choose. You can compete with lower prices, better quality or smarter marketing, but each has a cost." },
  morale: { icon: "😊", title: "Morale", text: "Happy employees work harder and stay longer. Paying fairly and keeping the team from burning out costs money, but losing good people and training new ones costs more." },
  delegation: { icon: "📋", title: "Delegation and Management", text: "One manager can lead only so many people. Past about five employees per manager, the team gets less efficient. Delegating lets you focus on growing the business instead of doing every job." },
  insurance: { icon: "☂️", title: "Insurance", text: "Insurance costs a little every quarter but pays most of the bill when something bad happens, like an accident or a lawsuit. It trades a small certain cost for protection from a big surprise." },
  scale: { icon: "🏗️", title: "Scaling Up", text: "Growing into new markets means bigger rent, more staff and a lot of upfront cost, and people in the new place don't know you yet. Big growth means big risk, and sometimes big reward." },
  opportunity: { icon: "⚖️", title: "Opportunity Cost", text: "Every choice means giving something up. An hour spent learning from a mentor is an hour not spent working, and money spent on one thing can't be spent on another. The best choice is the one that's worth more than what you give up." },
  marketing: { icon: "📣", title: "Marketing", text: "Marketing builds awareness. Customers can't buy from you if they don't know you exist. But awareness fades without repeat effort, and spending more has diminishing returns." },
};

// ---------------------------------------------------------------------------
// End-of-game quiz — first answer is always the correct one (the game shuffles them)
// ---------------------------------------------------------------------------
BB.quiz = [
  { q: "As a sole proprietor, who is responsible if the business owes money?", a: ["You personally, with your own savings", "Only the business", "The bank"], explain: "A sole proprietor and the business are legally the same, so personal savings can be used to pay business debts." },
  { q: "What is the main benefit of forming an LLC?", a: ["It protects your personal savings from business debts and lawsuits", "It makes the business pay no taxes", "It guarantees customers"], explain: "Limited liability means the owner's personal assets are protected." },
  { q: "Profit equals…", a: ["Revenue minus costs", "Revenue plus costs", "The price you charge"], explain: "Profit = what comes in (revenue) minus what goes out (costs)." },
  { q: "Rent that you pay no matter how much you sell is a…", a: ["Fixed cost", "Variable cost", "Revenue"], explain: "Fixed costs don't change with sales. Variable costs, like ingredients, do." },
  { q: "More customers want your product than you can make. What is that called?", a: ["Being over capacity", "A recession", "Inflation"], explain: "Capacity is the most you can make or serve. Past that, you lose sales." },
  { q: "An investor gives you $20,000 for 20% of your company. What did you give up?", a: ["Equity: a share of ownership", "Your reputation", "Your rent"], explain: "Selling equity gives you cash now but a smaller share of future profits." },
  { q: "Why can a profitable business still run out of cash?", a: ["Bills come due before customers' money arrives or is saved", "Profit is not real", "Taxes are zero"], explain: "Cash flow is about timing. Always keep a cushion." },
  { q: "A recession hits and customers spend less. What's the smartest way to prepare?", a: ["Keep a cash cushion saved from good times", "Borrow as much as possible", "Hire more people"], explain: "Businesses that save in booms survive busts." },
  { q: "You pay a small amount every quarter for insurance. What do you get?", a: ["Protection from big surprise costs", "Higher profit every quarter", "More customers"], explain: "Insurance trades a small certain cost for protection from a big unlikely loss." },
  { q: "You raise your price but your product quality stays the same. What usually happens?", a: ["Fewer customers buy", "More customers buy", "Nothing changes"], explain: "Higher prices reduce demand unless quality justifies them." },
  { q: "A manager can lead about how many employees well?", a: ["About five", "About fifty", "Just one"], explain: "Past a manager's span of control, teams become less efficient." },
  { q: "Interest on a loan is…", a: ["The fee you pay for borrowing money", "A discount from the bank", "A kind of profit"], explain: "Interest is the price of using someone else's money." },
];

// Names for job candidates
BB.names = ["Ava", "Liam", "Maya", "Noah", "Zoe", "Eli", "Ivy", "Omar", "Lena", "Jack", "Nia", "Leo", "Rosa", "Sam", "Tara", "Ben", "Mia", "Kai", "Ruth", "Dev", "Ella", "Max", "June", "Ravi", "Cora", "Tom", "Alma", "Finn", "Dina", "Gus", "Hana", "Ian", "Jade", "Kofi", "Lucy", "Milo", "Nora", "Otis", "Pia", "Quinn"];
BB.surnameInitials = "ABCDEFGHJKLMNOPRSTW".split("");
