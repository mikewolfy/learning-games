// Ecosystem Builder data: biomes, species, food webs, events.
// kind: P producer (makes its own food from sun), H herbivore (eats plants), C carnivore (eats animals)
(function (root) {
  const S = (id, name, e, kind, eats, fact) => ({ id, name, e, kind, eats: eats || [], fact });
  const BIOMES = [
    {
      id: "forest", name: "Forest", emoji: "🌲", color: "#2b8a3e", pick: 7, goal: 6,
      blurb: "Oak trees, berry bushes, rabbits and wolves.",
      species: [
        S("grass", "Grass", "🌿", "P", [], "Grass is a producer. It makes its own food from sunlight, and it grows back fast after being eaten."),
        S("berries", "Berry bushes", "🫐", "P", [], "Berry bushes use sunlight to grow fruit that many animals love."),
        S("oak", "Oak trees", "🌳", "P", [], "Oak trees grow slowly, but acorns feed many animals."),
        S("rabbit", "Rabbits", "🐇", "H", ["grass", "berries"], "Rabbits eat plants. They have lots of babies, so their numbers can shoot up fast."),
        S("deer", "Deer", "🦌", "H", ["grass", "oak"], "Deer are big herbivores. A hungry herd can nibble a forest bare."),
        S("mouse", "Mice", "🐁", "H", ["berries", "oak"], "Mice eat seeds and berries, and they are food for lots of hunters."),
        S("fox", "Foxes", "🦊", "C", ["rabbit", "mouse"], "Foxes are carnivores. They eat small animals like rabbits and mice."),
        S("wolf", "Wolves", "🐺", "C", ["deer", "rabbit"], "Wolves hunt in packs and keep deer herds from growing too large."),
        S("owl", "Owls", "🦉", "C", ["mouse", "rabbit"], "Owls hunt at night. One owl can eat over a thousand mice in a year."),
      ],
    },
    {
      id: "ocean", name: "Ocean Reef", emoji: "🌊", color: "#1971c2", pick: 7, goal: 6,
      blurb: "Sunlit algae, tiny krill, big sharks.",
      species: [
        S("algae", "Algae", "🟢", "P", [], "Tiny algae float near the surface and make food from sunlight. They feed almost the whole ocean."),
        S("seaweed", "Seaweed", "🌱", "P", [], "Seaweed forests give food and hiding places."),
        S("krill", "Krill", "🦐", "H", ["algae"], "Krill are tiny shrimp that eat algae. Huge swarms feed whales."),
        S("turtle", "Sea turtles", "🐢", "H", ["seaweed"], "Sea turtles graze on seaweed and keep it from growing out of control."),
        S("parrot", "Parrotfish", "🐠", "H", ["algae", "seaweed"], "Parrotfish scrape algae off coral so the reef stays healthy."),
        S("tuna", "Tuna", "🐟", "C", ["krill", "parrot"], "Tuna are fast hunters that eat smaller fish and krill."),
        S("whale", "Blue whales", "🐋", "C", ["krill"], "The biggest animal ever eats the tiniest: it can eat 4 tons of krill a day."),
        S("shark", "Sharks", "🦈", "C", ["tuna", "turtle", "parrot"], "Sharks are top predators. They keep the fish below them healthy and balanced."),
      ],
    },
    {
      id: "savanna", name: "Savanna", emoji: "🦁", color: "#c2410c", pick: 7, goal: 6,
      blurb: "Wide grasslands, acacia trees and big cats.",
      species: [
        S("grass", "Grass", "🌾", "P", [], "Savanna grass dries out in droughts, then grows back fast with the rains."),
        S("acacia", "Acacia trees", "🌳", "P", [], "Acacia trees have deep roots, so they survive dry spells that kill grass."),
        S("zebra", "Zebras", "🦓", "H", ["grass"], "Zebras move in herds. Many eyes make it harder for a lion to sneak up."),
        S("gazelle", "Gazelles", "🦌", "H", ["grass", "acacia"], "Gazelles are speedy grazers and the favorite meal of many big cats."),
        S("giraffe", "Giraffes", "🦒", "H", ["acacia"], "Giraffes reach leaves on the tall acacia that nobody else can."),
        S("elephant", "Elephants", "🐘", "H", ["grass", "acacia"], "Elephants eat 150 kg of plants a day. They can change a whole landscape."),
        S("lion", "Lions", "🦁", "C", ["zebra", "gazelle"], "Lions live in prides and hunt together."),
        S("cheetah", "Cheetahs", "🐆", "C", ["gazelle"], "Cheetahs are the fastest land animal, but they only eat one kind of prey here."),
        S("dog", "Wild dogs", "🐕", "C", ["gazelle", "zebra"], "African wild dogs hunt in packs and share the food."),
      ],
    },
    {
      id: "pond", name: "Pond", emoji: "🐸", color: "#0f766e", pick: 6, goal: 5,
      blurb: "A small world of algae, tadpoles and frogs.",
      species: [
        S("algae", "Pond algae", "🟩", "P", [], "Algae turn pond water green. A little is great, but too much blocks the sun."),
        S("lily", "Water lilies", "🌸", "P", [], "Water lilies float on top, and the shade they give helps small fish hide."),
        S("tadpole", "Tadpoles", "🥚", "H", ["algae"], "Tadpoles eat algae, then grow into frogs."),
        S("snail", "Snails", "🐌", "H", ["algae", "lily"], "Snails clean the pond by eating algae and old plant bits."),
        S("beetle", "Water beetles", "🪲", "H", ["lily"], "Water beetles chew on lily leaves."),
        S("frog", "Frogs", "🐸", "C", ["beetle", "snail"], "Frogs catch bugs and snails with their long sticky tongues."),
        S("fish", "Pond fish", "🐟", "C", ["tadpole", "beetle"], "Fish eat tadpoles and bugs."),
        S("bird", "Kingfishers", "🐦", "C", ["fish", "tadpole", "frog"], "Kingfishers dive into the pond to catch fish."),
      ],
    },
  ];

  // weight = how often it shows up in the year deck
  const EVENTS = [
    { id: "calm", w: 4, icon: "☀️", name: "A calm year", text: "The weather is just right. Nothing unusual happens." },
    { id: "rain", w: 2, icon: "🌧️", name: "Lots of rain", text: "Plenty of rain makes plants grow extra well." },
    { id: "drought", w: 2, icon: "🏜️", name: "Drought!", text: "It hardly rains. Plants dry out and can't grow back as fast." },
    { id: "disease", w: 2, icon: "🤒", name: "A disease spreads", text: "A sickness spreads through one kind of animal." },
    { id: "fire", w: 1, icon: "🔥", name: "Wildfire", text: "Fire burns many plants and hurts the plant-eaters, too." },
    { id: "cold", w: 1, icon: "❄️", name: "Harsh season", text: "A very cold season. Animals struggle to find enough food." },
    { id: "boom", w: 1, icon: "🍼", name: "Baby boom", text: "One kind of animal has lots of babies." },
    { id: "hunt", w: 1, icon: "🎯", name: "Hunters arrive", text: "People hunt one of the top predators." },
  ];
  const out = { BIOMES, EVENTS };
  if (typeof module !== "undefined" && module.exports) module.exports = out; else root.ECO_DATA = out;
})(typeof window !== "undefined" ? window : globalThis);
