// Business Builder — story events: the ups and downs of building a business.
//
// Each event: { id, icon, title, tip, weight(b), once, text(b), choices: [{ label, hint, can(b), run(b, rng) -> result text }] }
// `weight` is how likely the event is this quarter (0 = can't happen). `best` is the sensible choice (used by test bots).

(function (root) {
  "use strict";
  const BB = (root.BB = root.BB || {});
  const E = BB.engine;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const r0 = Math.round;
  const money = (n) => "$" + r0(n).toLocaleString("en-US");

  // How big the business is: scales bills so a tiny shop isn't crushed by a big company's costs
  const size = (b) => {
    const n = Math.min(4, b.hist.rev.length);
    const q = n ? b.hist.rev.slice(-n).reduce((t, x) => t + x, 0) / n : 2500;
    return clamp(0.7 + (q * 4) / 40000, 0.7, 6);
  };
  const T = (b) => BB.types[b.type];
  const who = (b, out) => (out.savings > 0 ? ` Because you're a sole proprietor, ${money(out.savings)} came out of YOUR personal savings.` : b.structure !== "solo" && out.cash + out.debt > 0 ? " Your personal savings are safe because your company is its own legal entity." : "");
  const pickStaff = (b, rng) => b.staff[Math.floor((rng || Math.random)() * b.staff.length)];
  const insNote = (out) => (out.covered > 0 ? ` Insurance paid ${money(out.covered)}.` : "");

  BB.events = [
    {
      id: "competitor", icon: "🥊", title: "A New Competitor!", tip: "competition", best: 1,
      weight: (b) => (b.comp.level < 3 && b.qi >= 3 ? 3 : 0),
      text: (b) => `A new ${T(b).name.toLowerCase()} just opened a few blocks away. Customers are curious about them.`,
      choices: [
        { label: "Cut your prices for a while", hint: "More customers, thinner profit", run: (b) => { b.comp.level += 1; b.comp.until = b.qi + 8; b.plan.price = Math.max(E.PRICE_MIN, +(b.plan.price - 0.1).toFixed(2)); E.addMod(b, "dem", 1.12, 2); return "You lower your prices to keep customers. Sales hold up, but each one earns you less."; } },
        { label: "Invest in quality", hint: "Costs money, builds loyalty", can: (b) => b.cash >= 600 * size(b), run: (b) => { const c = r0(600 * size(b)); b.cash -= c; b.Q = clamp(b.Q + 0.8, 1, 10); b.comp.level += 1; b.comp.until = b.qi + 8; return `You spend ${money(c)} improving what you offer. Customers notice the difference.`; } },
        { label: "Ride it out", hint: "Do nothing", run: (b) => { b.comp.level += 1; b.comp.until = b.qi + 8; return "You stick to your plan. Some customers try the newcomer."; } },
      ],
    },
    {
      id: "viral", icon: "📱", title: "You Went Viral!", tip: "capacity", best: 0,
      weight: (b) => (b.qi >= 3 ? 1.8 : 0),
      text: () => "Someone posted about your business and it's spreading like crazy. A wave of new customers is coming!",
      choices: [
        { label: "Rush in extra help", hint: "Costs money, so you can serve everyone", can: (b) => b.cash >= 800 * size(b), run: (b) => { const c = r0(800 * size(b)); b.cash -= c; E.addMod(b, "dem", 1.6, 2); E.addMod(b, "cap", 1.3, 2); b.buzz = clamp(b.buzz + 12, 0, 100); return `You pay ${money(c)} for temporary help and serve far more people. A huge win!`; } },
        { label: "Just enjoy the ride", hint: "You might not be able to serve everyone", run: (b) => { E.addMod(b, "dem", 1.6, 2); b.buzz = clamp(b.buzz + 12, 0, 100); return "Demand surges, but you can only make so much. Some people will leave disappointed."; } },
      ],
    },
    {
      id: "bigOrder", icon: "📦", title: "A Big Order!", tip: "capacity", best: 1,
      weight: (b) => (b.qi >= 4 ? 2 : 0),
      text: (b) => `A local company wants to place a big bulk order of ${T(b).unit} at a small discount. It would fill a lot of your capacity.`,
      choices: [
        { label: "Take it with overtime", hint: "Good money, but your team is tired", run: (b) => { const g = r0(0.45 * E.capacity(b) * T(b).price * 0.85 - 0.45 * E.capacity(b) * T(b).cost); b.cash += g; b.staff.forEach((e) => { e.m = clamp(e.m - 10, 0, 100); }); b.rep = clamp(b.rep + 2, 0, 100); return `You earn about ${money(g)} extra. Your team worked a lot of extra hours and is worn out.`; } },
        { label: "Take it, with temp help", hint: "Keeps the team happy, costs some profit", run: (b) => { const gross = 0.45 * E.capacity(b) * T(b).price * 0.85 - 0.45 * E.capacity(b) * T(b).cost; const g = r0(gross * 0.7); b.cash += g; b.rep = clamp(b.rep + 2, 0, 100); return `You hire temporary help and net about ${money(g)}. Everyone stays happy.`; } },
        { label: "Politely decline", hint: "Stay focused on regular customers", run: () => "You pass on the order and keep serving your regular customers." },
      ],
    },
    {
      id: "supplierSpike", icon: "📈", title: "Supplier Costs Jump", tip: "fixed", best: 2,
      weight: (b) => (b.qi >= 3 ? 2 : 0),
      text: () => "Your main supplier raises prices by about 25% for the next few quarters.",
      choices: [
        { label: "Absorb the higher cost", hint: "Profit shrinks for a while", run: (b) => { E.addMod(b, "cost", 1.25, 3); return "You keep your prices the same and eat the higher costs."; } },
        { label: "Raise your prices 8%", hint: "Customers may buy a bit less", run: (b) => { E.addMod(b, "cost", 1.25, 3); b.plan.price = Math.min(E.PRICE_MAX, +(b.plan.price + 0.08).toFixed(2)); return "You pass part of the cost on to customers. Some will grumble."; } },
        { label: "Find a new supplier", hint: "Costs a little, slightly lower quality", can: (b) => b.cash >= 500 * size(b), run: (b) => { const c = r0(500 * size(b)); b.cash -= c; E.addMod(b, "cost", 1.08, 6); b.Q = clamp(b.Q - 0.4, 1, 10); return `You spend ${money(c)} switching suppliers. Costs rise less, but the quality isn't quite as good.`; } },
      ],
    },
    {
      id: "equipBreaks", icon: "🔧", title: "Equipment Breaks Down", tip: "insurance", best: 0,
      weight: (b) => (b.qi >= 4 ? 2 : 0),
      text: () => "A key piece of equipment stops working in the middle of your busiest day.",
      choices: [
        { label: "Pay for a quick repair", hint: "Costs money now", run: (b) => { const o = E.charge(b, 900 * size(b), true); return `The repair costs ${money(o.amount)}.${insNote(o)}${who(b, o)}`; } },
        { label: "Limp along for now", hint: "You make less until it's fixed", run: (b) => { E.addMod(b, "cap", 0.8, 2); return "You keep working with the broken equipment. You can't make as much for a couple of quarters."; } },
      ],
    },
    {
      id: "poached", icon: "🧲", title: "Someone Wants Your Employee", tip: "morale", best: 0,
      weight: (b) => (b.staff.length >= 1 ? 2 : 0),
      text: (b) => { const e = b.staff[0]; return `A rival business is trying to hire ${e.n}, one of your ${T(b).roles[e.r].toLowerCase()}s, with a bigger paycheck.`; },
      choices: [
        { label: "Counter-offer: a 15% raise", hint: "Costs more every quarter, keeps them happy", run: (b, rng) => { const e = pickStaff(b, rng); e.w = r0(e.w * 1.15); e.m = clamp(e.m + 12, 0, 100); return `${e.n} stays and feels valued. Your payroll goes up a little.`; } },
        { label: "Let them go", hint: "You'll have to hire and train someone new", run: (b, rng) => { const e = pickStaff(b, rng); b.staff = b.staff.filter((x) => x !== e); b.staff.forEach((o) => { o.m = clamp(o.m - 5, 0, 100); }); return `${e.n} leaves for the other job. You'll need to hire a replacement.`; } },
      ],
    },
    {
      id: "moraleDip", icon: "😟", title: "The Team Is Stressed", tip: "morale", best: 0,
      weight: (b) => (b.staff.length >= 2 ? 1.2 + (b.staff.reduce((t, e) => t + e.m, 0) / b.staff.length < 60 ? 2 : 0) : 0),
      text: () => "Your team has been working hard and morale is slipping. People look tired and a bit grumpy.",
      choices: [
        { label: "Give everyone a bonus", hint: "Costs about 20% of a quarter's wages", can: (b) => b.cash >= E.payroll(b) * 0.2, run: (b) => { const c = r0(E.payroll(b) * 0.2); b.cash -= c; b.staff.forEach((e) => { e.m = clamp(e.m + 18, 0, 100); }); return `You spend ${money(c)} on bonuses and a team lunch. Spirits soar.`; } },
        { label: "Tell them to hang in there", hint: "Free, but risky", run: (b) => { b.staff.forEach((e) => { e.m = clamp(e.m - 6, 0, 100); }); return "You thank everyone for their effort. Morale slips a little more."; } },
      ],
    },
    {
      id: "lawsuit", icon: "⚖️", title: "A Customer Sues You!", tip: "liability", best: 0,
      weight: (b) => (b.qi >= 4 ? (b.structure === "solo" ? 2.6 : 1.8) : 0),
      text: (b) => `A customer claims that something went wrong with your ${T(b).unit.replace(/s$/, "")} and says you owe them money.`,
      choices: [
        { label: "Settle quickly", hint: "Pay a fair amount and move on", run: (b) => { b.stats.lawsuits += 1; const o = E.charge(b, 2500 * size(b), true); b.rep = clamp(b.rep - 2, 0, 100); return `You settle for ${money(o.amount)}.${insNote(o)}${who(b, o)}`; } },
        { label: "Fight it in court", hint: "A gamble: could cost less, could cost much more", run: (b, rng) => { b.stats.lawsuits += 1; const win = (rng || Math.random)() < 0.5; const o = E.charge(b, (win ? 700 : 5200) * size(b), true); b.rep = clamp(b.rep + (win ? 3 : -5), 0, 100); return `${win ? "You win! Legal fees still cost" : "You lose the case and pay"} ${money(o.amount)}.${insNote(o)}${who(b, o)}`; } },
      ],
    },
    {
      id: "audit", icon: "🧾", title: "Tax Audit", tip: "taxes", best: 1, once: true,
      weight: (b) => (b.qi >= 6 && !b.flags.bookkeeper ? 1.5 : 0),
      text: () => "The tax office wants to check your records. Your paperwork is a little messy.",
      choices: [
        { label: "Pay the penalty", hint: "Quick but costly", run: (b) => { const c = r0(700 * size(b)); const o = E.charge(b, c); return `You pay ${money(o.amount)} in penalties and fees.${who(b, o)}`; } },
        { label: "Hire a bookkeeper", hint: "Pay for help and keep better records", run: (b) => { const c = r0(500 * size(b)); const o = E.charge(b, c); b.flags.bookkeeper = 1; return `You pay ${money(o.amount)} for a bookkeeper to clean up your records. Future audits will be a breeze.`; } },
      ],
    },
    {
      id: "investor", icon: "🤝", title: "An Investor Is Interested", tip: "equity", best: 2,
      weight: (b) => (b.structure === "corp" && b.inv + 0.15 <= 0.45 && E.annual(b, "prof") > 10000 ? 2.2 : 0),
      text: (b) => { b.flags.offer = E.investorOffer(b, 0.15); return `An investor offers ${money(b.flags.offer)} for 15% of your company. That would give you cash to grow, but you'd own less of the business.`; },
      choices: [
        { label: "Accept the offer", hint: "Cash now, a smaller slice later", run: (b) => { b.inv += 0.15; b.cash += b.flags.offer; return `You get ${money(b.flags.offer)}! The investor now owns ${Math.round(b.inv * 100)}% of the company.`; } },
        { label: "Ask for more", hint: "A 50% chance they say yes", run: (b, rng) => { const ok = (rng || Math.random)() < 0.5; if (ok) { const c = r0(b.flags.offer * 1.25); b.inv += 0.15; b.cash += c; return `They agree to ${money(c)}! The investor owns ${Math.round(b.inv * 100)}% of the company.`; } return "The investor walks away. Maybe you were too greedy."; } },
        { label: "Decline", hint: "Keep full ownership", run: () => "You keep your company all to yourself, for now." },
      ],
    },
    {
      id: "rentUp", icon: "🏠", title: "Rent Is Going Up", tip: "fixed", best: 1,
      weight: (b) => (b.qi >= 4 && b.rentMult < 1.6 ? 1.5 : 0),
      text: () => "Your landlord says the rent will rise 20%. Rent is a fixed cost: you pay it whether you have a great quarter or a terrible one.",
      choices: [
        { label: "Accept it", hint: "Rent goes up 20%", run: (b) => { b.rentMult = +(b.rentMult * 1.2).toFixed(3); return "You sign the new lease. Your fixed costs go up."; } },
        { label: "Negotiate", hint: "A 50% chance of a smaller increase", run: (b, rng) => { const ok = (rng || Math.random)() < 0.5; b.rentMult = +(b.rentMult * (ok ? 1.07 : 1.25)).toFixed(3); return ok ? "Your negotiating works! Rent only goes up 7%." : "The landlord refuses and rent goes up 25% for the push-back."; } },
      ],
    },
    {
      id: "badReview", icon: "😠", title: "A Bad Review", tip: "reputation", best: 0,
      weight: (b) => (b.qi >= 2 ? 2 : 0),
      text: () => "An unhappy customer posted a harsh review online. Lots of people are reading it.",
      choices: [
        { label: "Apologize and make it right", hint: "Costs a little, protects your name", can: (b) => b.cash >= 300 * size(b), run: (b) => { const c = r0(300 * size(b)); b.cash -= c; b.rep = clamp(b.rep - 3, 0, 100); return `You refund them ${money(c)} and reply kindly. Other customers respect how you handled it.`; } },
        { label: "Ignore it", hint: "Free, but it stings", run: (b) => { b.rep = clamp(b.rep - 9, 0, 100); return "You say nothing. The review keeps getting views and your reputation takes a hit."; } },
      ],
    },
    {
      id: "goodPress", icon: "📰", title: "You're in the News!", tip: "marketing", best: 0,
      weight: (b) => (b.qi >= 2 ? 1.6 : 0),
      text: () => "A local reporter wrote a great story about your business. Lots of people now know your name!",
      choices: [
        { label: "Run a special promotion", hint: "Costs a little, keeps the buzz alive", can: (b) => b.cash >= 400 * size(b), run: (b) => { const c = r0(400 * size(b)); b.cash -= c; b.buzz = clamp(b.buzz + 25, 0, 100); b.rep = clamp(b.rep + 4, 0, 100); return `You spend ${money(c)} on a promotion while everyone's talking about you. Awareness jumps!`; } },
        { label: "Just enjoy it", hint: "Free publicity", run: (b) => { b.buzz = clamp(b.buzz + 15, 0, 100); b.rep = clamp(b.rep + 4, 0, 100); return "More people know about you now, without spending a dime."; } },
      ],
    },
    {
      id: "theft", icon: "🦹", title: "Theft!", tip: "insurance", best: 1, once: true,
      weight: (b) => (b.qi >= 5 && !b.flags.security ? 1 : 0),
      text: () => "Someone broke in overnight and took cash and supplies.",
      choices: [
        { label: "File a claim and move on", hint: "Pay what's not covered", run: (b) => { const o = E.charge(b, 500 * size(b), true); return `You lose ${money(o.amount)}.${insNote(o)}${who(b, o)}`; } },
        { label: "Also install a security system", hint: "Extra cost now, safer later", run: (b) => { const o = E.charge(b, 500 * size(b) + 700 * size(b), true); b.flags.security = 1; return `The theft and the new security system cost ${money(o.amount)} in all.${insNote(o)} You should be safer from now on.${who(b, o)}`; } },
      ],
    },
    {
      id: "construction", icon: "🚧", title: "Road Construction", tip: "cashflow", best: 0,
      weight: (b) => (b.qi >= 3 ? 1.4 : 0),
      text: () => "The city is tearing up the road in front of your business. Fewer people will come by for a while.",
      choices: [
        { label: "Run a 'We're still open!' promotion", hint: "Costs a little, softens the blow", can: (b) => b.cash >= 400 * size(b), run: (b) => { const c = r0(400 * size(b)); b.cash -= c; E.addMod(b, "dem", 0.85, 2); return `You spend ${money(c)} on signs and deals. Sales dip, but not as much.`; } },
        { label: "Wait it out", hint: "Free, but sales drop", run: (b) => { E.addMod(b, "dem", 0.7, 2); return "Customers are hard to find for a couple of quarters. You'll have to stay patient and watch your cash."; } },
      ],
    },
    {
      id: "trend", icon: "🌀", title: "Customers Want Something New", tip: "reputation", best: 0,
      weight: (b) => (b.qi >= 8 ? 1.5 : 0),
      text: () => "Customers' tastes are changing. What was popular last year feels a bit old now.",
      choices: [
        { label: "Invest in something fresh", hint: "Costs money, raises quality", can: (b) => b.cash >= 1200 * size(b), run: (b) => { const c = r0(1200 * size(b)); b.cash -= c; b.Q = clamp(b.Q + 1, 1, 10); b.buzz = clamp(b.buzz + 8, 0, 100); return `You spend ${money(c)} refreshing what you offer. Customers love the new look.`; } },
        { label: "Stick with what works", hint: "Free, but you may fall behind", run: (b) => { b.Q = clamp(b.Q - 0.6, 1, 10); return "You stay the course. Some customers drift away to newer options."; } },
      ],
    },
    {
      id: "mentor", icon: "🧓", title: "A Mentor Offers Advice", tip: "opportunity", best: 0, once: true,
      weight: (b) => (b.qi >= 2 && b.qi <= 16 ? 1.2 : 0),
      text: () => "A retired business owner from your neighborhood offers to coach you. It would take some of your time, but you could learn a lot.",
      choices: [
        { label: "Say yes!", hint: "Less time to work this quarter, better quality", run: (b) => { b.Q = clamp(b.Q + 0.7, 1, 10); E.addMod(b, "cap", 0.9, 1); b.buzz = clamp(b.buzz + 4, 0, 100); return "You learn a ton about customers and pricing. You were a little less productive that quarter, but it was worth it."; } },
        { label: "Too busy right now", hint: "Stay focused", run: () => "You thank them and keep working. Maybe next time." },
      ],
    },
    {
      id: "burnout", icon: "🥱", title: "You're Exhausted", tip: "delegation", best: 0,
      weight: (b) => (b.staff.length === 0 && b.qi >= 5 && b.buzz > 40 ? 3 : 0),
      text: () => "Doing everything yourself is catching up with you. You're tired, and you've been getting sick more often.",
      choices: [
        { label: "Take a short break", hint: "Make less this quarter", run: (b) => { E.addMod(b, "cap", 0.7, 1); return "You rest and recharge. You made less that quarter, but you feel great."; } },
        { label: "Push through it", hint: "Risky for your health", run: (b, rng) => { const sick = (rng || Math.random)() < 0.45; if (sick) { E.addMod(b, "cap", 0.35, 2); b.rep = clamp(b.rep - 4, 0, 100); return "You get really sick and have to close for weeks. A team that could cover for you would have helped."; } return "You make it through. You can't keep this up forever though."; } },
      ],
    },
    {
      id: "recall", icon: "🚨", title: "A Serious Problem", tip: "reputation", best: 0,
      weight: (b) => (b.qi >= 6 ? 1.2 : 0),
      text: (b) => T(b).recall + " Customers are worried.",
      choices: [
        { label: "Fix it and tell everyone", hint: "Costly, but honest", run: (b) => { const o = E.charge(b, 1500 * size(b), true); b.rep = clamp(b.rep - 5, 0, 100); return `You do the right thing publicly. It costs ${money(o.amount)}.${insNote(o)} Customers respect your honesty.${who(b, o)}`; } },
        { label: "Keep quiet and hope for the best", hint: "Cheap now, dangerous later", run: (b, rng) => { const found = (rng || Math.random)() < 0.55; if (found) { b.rep = clamp(b.rep - 28, 0, 100); b.buzz = clamp(b.buzz - 10, 0, 100); return "The truth comes out and customers feel betrayed. Your reputation crashes."; } return "No one noticed this time. You were lucky."; } },
      ],
    },
    {
      id: "referrals", icon: "💬", title: "Customers Are Spreading the Word", tip: "reputation", best: 0,
      weight: (b) => (b.rep > 55 && b.qi >= 3 ? 1.6 : 0),
      text: () => "Happy customers are telling their friends about you.",
      choices: [
        { label: "Reward referrals", hint: "Costs a little, boosts it", can: (b) => b.cash >= 250 * size(b), run: (b) => { const c = r0(250 * size(b)); b.cash -= c; E.addMod(b, "dem", 1.3, 2); return `You spend ${money(c)} on a thank-you gift for people who bring friends. New customers pour in.`; } },
        { label: "Let it grow naturally", hint: "Free", run: (b) => { E.addMod(b, "dem", 1.15, 2); return "Word of mouth gives you a gentle bump in customers."; } },
      ],
    },
    {
      id: "inflation", icon: "🎈", title: "Everything Costs More", tip: "fixed", best: 1,
      weight: (b) => (b.qi >= 6 ? 1.2 : 0),
      text: () => "Prices are rising across the economy. Supplies, rent and wages are all creeping up.",
      choices: [
        { label: "Hold your prices", hint: "Keep customers, lose margin", run: (b) => { E.addMod(b, "cost", 1.15, 4); return "You hold the line on prices while costs rise for a year."; } },
        { label: "Raise prices a little", hint: "Protect your margin", run: (b) => { E.addMod(b, "cost", 1.15, 4); b.plan.price = Math.min(E.PRICE_MAX, +(b.plan.price + 0.06).toFixed(2)); return "You nudge your prices up. Most customers understand."; } },
      ],
    },
    {
      id: "idea", icon: "💡", title: "An Employee Has an Idea", tip: "morale", best: 0,
      weight: (b) => (b.staff.length >= 2 ? 1.4 : 0),
      text: (b) => `${b.staff[0].n} suggests a smarter way to do things that could save money.`,
      choices: [
        { label: "Try it", hint: "Small cost, saves money for years", can: (b) => b.cash >= 300, run: (b, rng) => { b.cash -= 300; E.addMod(b, "cost", 0.95, 8); const e = pickStaff(b, rng); e.m = clamp(e.m + 10, 0, 100); return `You spend $300 trying ${e.n}'s idea. It works, and ${e.n} feels proud!`; } },
        { label: "Stick to the usual way", hint: "Free", run: (b) => { b.staff.forEach((e) => { e.m = clamp(e.m - 3, 0, 100); }); return "You decide not to change anything. Your team shrugs."; } },
      ],
    },
    {
      id: "buyout", icon: "💼", title: "A Company Wants to Buy You", tip: "equity", best: 1, once: true,
      weight: (b) => (b.qi >= 12 && E.value(b) > 60000 ? 1.1 : 0),
      text: (b) => { b.flags.buyout = r0(E.value(b) * 1.15); return `A bigger company has offered ${money(b.flags.buyout)} to buy your whole business. If you accept, the game ends and you cash out.`; },
      choices: [
        { label: "Sell the business", hint: "Cash out and finish", run: (b) => { const share = r0(b.flags.buyout * (1 - b.inv)); b.savings += share; b.cash = 0; b.debt = 0; b.edebt = 0; b.over = "sold"; b.flags.soldFor = share; return `You sell the company and receive ${money(share)}. What a journey!`; } },
        { label: "Keep building", hint: "Turn down the offer", run: () => "You decline. You believe your business is worth even more in the future." },
      ],
    },
  ];

  // Guaranteed story beats that teach the big ideas
  BB.scheduled = function (b) {
    if (b.structure === "solo" && !b.flags.advised && b.qi >= 4 && E.annual(b, "prof") >= 8000 && b.cash >= 2500) { b.flags.advised = 1; return "advisor"; }
    return null;
  };
  BB.events.push({
    id: "advisor", icon: "🧑‍💼", title: "Time to Think Bigger?", tip: "llc", best: 0,
    weight: () => 0,
    text: () => "Your business is doing well! A friendly accountant stops by: \"You're earning real money now. Right now YOU and the business are legally the same, so if something goes wrong, your personal savings are at risk. Have you thought about forming an LLC?\"",
    choices: [
      { label: "Form an LLC ($800 + $150 a quarter)", hint: "Protects your savings", can: (b) => b.cash >= 800, run: (b) => { E.setStructure(b, "llc"); return "You file the paperwork. From now on your personal savings are protected from business problems."; } },
      { label: "Maybe later", hint: "Stay a sole proprietor", run: () => "You decide to wait. You can form an LLC or a corporation any time from the Grow tab." },
    ],
  });

  if (typeof module !== "undefined" && module.exports) module.exports = BB;
})(typeof window !== "undefined" ? window : globalThis);
