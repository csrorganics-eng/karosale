/**
 * Realistic demo catalog copy for search / relevance QA (keyword ILIKE + merchandising scores).
 * Imported by `seed-test-data.ts`. Slugs stay stable so URLs and idempotent seeding keep working.
 */

export type SeedCategorySlug =
  | "vegetable-seeds"
  | "flower-herb-seeds"
  | "organic-manure"
  | "grow-bags"
  | "garden-tools"
  | "organic-groceries";

export type MainSeedProduct = {
  name: string;
  slug: string;
  cat: SeedCategorySlug;
  price: string;
  stock: number;
  organic?: boolean;
  featured?: boolean;
  bestseller?: boolean;
  compare?: string;
  expiry?: boolean;
  low?: boolean;
  shortDescription: string;
  description: string;
  metaKeywords?: string;
};

/** Hero + edge-case rows: synonyms in body/meta (e.g. brinjal/eggplant) for keyword + relevance tests. */
export const MAIN_SEED_PRODUCTS: MainSeedProduct[] = [
  {
    name: "Desi Rose F1 Hybrid Tomato Seeds (50 seeds)",
    slug: "tomato-hybrid-seeds",
    cat: "vegetable-seeds",
    price: "89",
    stock: 120,
    organic: true,
    featured: true,
    bestseller: true,
    shortDescription:
      "High-yield indeterminate slicing tomato for home gardens; strong wilt tolerance and sweet-acid balance.",
    description:
      "<p>Popular <strong>F1 hybrid tomato</strong> for Indian balconies and terrace farms. Excellent for <em>kitchen garden</em> trellising, long harvest window, and classic red slicers.</p><p>Search hints: tomato, tamatar, salad, hybrid seeds.</p>",
    metaKeywords: "tomato seeds, tamatar beej, hybrid tomato, kitchen garden, slicing tomato, F1 seeds",
  },
  {
    name: "Palak / Spinach Bloomsdale Seeds — Cut-and-come-again",
    slug: "spinach-palak-seeds",
    cat: "vegetable-seeds",
    price: "59",
    stock: 80,
    organic: true,
    shortDescription:
      "Cool-season palak with crinkled leaves; ideal for saag, smoothies, and baby-leaf harvests.",
    description:
      "<p><strong>Spinach (palak)</strong> variety suited for pots and raised beds. Bolt-slower in mild winters; pick outer leaves for continuous harvest.</p>",
    metaKeywords: "palak seeds, spinach seeds, saag, leafy greens, winter vegetable seeds",
  },
  {
    name: "French Marigold (Tagetes patula) — Nematode-friendly border mix",
    slug: "marigold-seeds",
    cat: "flower-herb-seeds",
    price: "45",
    stock: 60,
    organic: false,
    shortDescription:
      "Compact marigold blend for companion planting along vegetable beds; bright gold and orange blooms.",
    description:
      "<p>Classic <strong>marigold flower seeds</strong> for pollinators and companion rows near tomatoes and brinjal.</p>",
    metaKeywords: "marigold, genda, companion planting, flower seeds, tagetes",
  },
  {
    name: "Earthworm Castings Vermicompost — 5 kg",
    slug: "vermicompost-5kg",
    cat: "organic-manure",
    price: "299",
    stock: 45,
    organic: true,
    bestseller: true,
    compare: "349",
    shortDescription:
      "Mature vermicompost rich in humus; top-dress for pots, grow bags, and raised beds.",
    description:
      "<p>Fine-textured <strong>vermicompost</strong> (earthworm castings) to improve water retention and root zone biology.</p>",
    metaKeywords: "vermicompost, worm castings, organic manure, potting amendment, 5kg compost",
  },
  {
    name: "Aged Cow Dung Manure — 10 kg (low stock demo)",
    slug: "cow-manure-10kg",
    cat: "organic-manure",
    price: "199",
    stock: 3,
    organic: true,
    low: true,
    shortDescription:
      "Well-composted gobar khad for field crops and fruit trees; blend with cocopeat for potting mixes.",
    description:
      "<p><strong>Cow manure organic</strong> soil builder. Use as basal organic matter; avoid fresh application on tender seedlings.</p>",
    metaKeywords: "cow manure, gobar khad, organic fertilizer, farmyard manure, 10kg",
  },
  {
    name: "HDPE Grow Bag 12 inch — 220 GSM (terrace garden)",
    slug: "grow-bag-12",
    cat: "grow-bags",
    price: "79",
    stock: 200,
    organic: false,
    shortDescription:
      "UV-stabilized grow bag for chilli, brinjal, and cherry tomatoes; drainage holes pre-cut.",
    description:
      "<p>Reusable <strong>12 inch grow bag</strong> for soilless mixes with cocopeat and perlite. Fits most balcony rail setups.</p>",
    metaKeywords: "grow bag, planter bag, terrace garden, HDPE planter, 12 inch",
  },
  {
    name: "Stainless Garden Hand Trowel + Transplanter Set",
    slug: "garden-trowel-set",
    cat: "garden-tools",
    price: "349",
    stock: 25,
    organic: false,
    shortDescription:
      "Rust-resistant hand tools with ergonomic grips for repotting herbs and vegetable seedlings.",
    description:
      "<p>Two-piece <strong>garden tool</strong> kit for dibbling, transplanting, and mixing potting media.</p>",
    metaKeywords: "trowel, transplanter, hand tools, weeding, repotting kit",
  },
  {
    name: "Lakadong Turmeric Powder — Single-origin 200 g",
    slug: "organic-turmeric",
    cat: "organic-groceries",
    price: "149",
    stock: 0,
    organic: true,
    featured: true,
    shortDescription:
      "High-curcumin turmeric from Meghalaya; ideal for golden milk and everyday cooking (OOS demo).",
    description:
      "<p><strong>Organic haldi</strong> powder with warm aroma. Store airtight away from sunlight.</p>",
    metaKeywords: "turmeric powder, haldi, lakadong, organic spice, curcumin",
  },
  {
    name: "Genovese Sweet Basil Seeds — Pesto & Pizza Herb",
    slug: "basil-herb-seeds",
    cat: "flower-herb-seeds",
    price: "55",
    stock: 90,
    organic: true,
    shortDescription:
      "Aromatic Italian basil for pesto, caprese, and hydroponic NFT channels.",
    description:
      "<p><strong>Basil herb seeds</strong> with broad leaves. Pinch flowering tips for longer leaf production.</p>",
    metaKeywords: "basil seeds, tulsi alternative pesto, herb seeds, genovese",
  },
  {
    name: "Neem Cake Soil Conditioner — 2 kg (expiry-dated SKU demo)",
    slug: "neem-cake-2kg",
    cat: "organic-manure",
    price: "179",
    stock: 15,
    organic: true,
    expiry: true,
    shortDescription:
      "Slow-release neem cake for root-knot nematode pressure and soil pest management in organic systems.",
    description:
      "<p><strong>Neem cake fertilizer</strong> side-dress for fruiting vegetables. Works well with <em>vermicompost</em> top-ups.</p>",
    metaKeywords: "neem cake, neem khali, organic pest management, soil conditioner, nematode",
  },
  {
    name: "Bhindi / Okra Lady's Finger Seeds — Arka Anamika type",
    slug: "okra-bhindi-ladyfinger-seeds",
    cat: "vegetable-seeds",
    price: "69",
    stock: 95,
    organic: true,
    shortDescription:
      "Tender green okra pods; heat-tolerant for summer monsoon kitchen gardens.",
    description:
      "<p><strong>Okra seeds</strong> (lady's finger / bhindi) for open pollinated harvests. Search: okra, bhindi, gumbo.</p>",
    metaKeywords: "okra seeds, bhindi beej, lady finger, summer vegetable seeds",
  },
  {
    name: "Brinjal Seeds — Long Purple (eggplant / baingan)",
    slug: "brinjal-long-purple-seeds",
    cat: "vegetable-seeds",
    price: "62",
    stock: 88,
    organic: true,
    shortDescription:
      "Slim purple brinjal for stir-fry and bhartha; keyword test: eggplant synonym in copy.",
    description:
      "<p><strong>Brinjal (eggplant)</strong> cultivar with mild bitterness and creamy texture when roasted. Also searched as baingan.</p>",
    metaKeywords: "brinjal seeds, eggplant seeds, baingan beej, purple brinjal",
  },
  {
    name: "Coriander Dhania Split Seeds — Slow-bolt select",
    slug: "coriander-dhania-seeds",
    cat: "vegetable-seeds",
    price: "49",
    stock: 140,
    organic: true,
    shortDescription:
      "Dual-use coriander for leaf (cilantro) and seed spice; stagger sowings for year-round leaves.",
    description:
      "<p><strong>Dhania beej</strong> for pots 6–8 inch deep. Bolt resistance is relative—shade helps in hot zones.</p>",
    metaKeywords: "coriander seeds, dhania, cilantro, herb seeds, split coriander",
  },
  {
    name: "Cherry Tomato Seeds — Balcony Micro-dwarf Red",
    slug: "cherry-tomato-balcony-seeds",
    cat: "vegetable-seeds",
    price: "95",
    stock: 70,
    organic: true,
    bestseller: true,
    shortDescription:
      "Compact cherry tomato for 8–10 inch pots; high Brix snack tomatoes.",
    description:
      "<p>Distinct from large slicing types—use for <strong>cherry tomato</strong> keyword tests vs hybrid beefsteak lines.</p>",
    metaKeywords: "cherry tomato seeds, balcony tomato, micro dwarf, snack tomato",
  },
  {
    name: "Coconut Coir Pith Block — 5 kg (expands ~70 L)",
    slug: "cocopeat-block-5kg",
    cat: "grow-bags",
    price: "259",
    stock: 55,
    organic: false,
    shortDescription:
      "Low EC cocopeat for seed starting; wash and buffer before sensitive seedlings.",
    description:
      "<p><strong>Cocopeat block</strong> for hydroponics and potting blends. Pair with grow bags and perlite.</p>",
    metaKeywords: "cocopeat, coir pith, soilless media, seed starting, hydroponics india",
  },
  {
    name: "Mustard Cake Liquid Plant Tonic — 1 L concentrate",
    slug: "mustard-cake-tonic-1l",
    cat: "organic-manure",
    price: "189",
    stock: 42,
    organic: true,
    shortDescription:
      "Cold-pressed mustard cake extract for foliar and soil drench on flowering and fruiting plants.",
    description:
      "<p>Organic <strong>sarson khali</strong> derived tonic. Dilute per label; keyword: mustard cake, liquid fertilizer.</p>",
    metaKeywords: "mustard cake, sarson khali, liquid organic fertilizer, plant tonic",
  },
];

/** Same rotation order as `seed-test-data.ts` bulk loop (i 1..200). */
export const BULK_SEED_CAT_ORDER: SeedCategorySlug[] = [
  "vegetable-seeds",
  "flower-herb-seeds",
  "organic-manure",
  "grow-bags",
  "garden-tools",
  "organic-groceries",
];

type BulkTemplate = { title: string; short: string; body: string; meta: string };

const BULK_POOLS: Record<SeedCategorySlug, BulkTemplate[]> = {
  "vegetable-seeds": [
    {
      title: "Ridge Gourd Turai Seeds — spineless type",
      short: "Monsoon season turai for trellis; tender ridges for stir-fry.",
      body: "<p><strong>Ridge gourd seeds</strong> (turai / peerkangai) for vertical kitchen gardens.</p>",
      meta: "turai seeds, ridge gourd, peerkangai, monsoon vegetable",
    },
    {
      title: "Bottle Gourd Lauki Seeds — long pale hybrid",
      short: "Soft lauki for dal and halwa; needs strong trellis in windy terraces.",
      body: "<p><strong>Lauki beej</strong> for long bottle gourds; keyword lauki, doodhi, calabash.</p>",
      meta: "lauki seeds, bottle gourd, doodhi, summer vine",
    },
    {
      title: "Karela Bitter Gourd Seeds — spiny medium fruit",
      short: "Karela for diabetic-friendly dishes; bitter melon type for humid plains.",
      body: "<p><strong>Bitter gourd seeds</strong> (karela) with pronounced ridges.</p>",
      meta: "karela seeds, bitter gourd, kakarakaya",
    },
    {
      title: "Bell Pepper Capsicum Mix Seeds — yellow & red",
      short: "Sweet blocky peppers for cool-season polytunnel or AC balcony trials.",
      body: "<p><strong>Capsicum seeds</strong> bell pepper mix for stuffed recipes.</p>",
      meta: "capsicum seeds, bell pepper, shimla mirch seeds",
    },
    {
      title: "Beans French Filet Seeds — bush habit",
      short: "Stringless pencil pods for steaming and stir-fry; container friendly.",
      body: "<p><strong>French beans seeds</strong> bush type for raised beds.</p>",
      meta: "beans seeds, french filet, green beans",
    },
    {
      title: "Carrot Nantes Seeds — deep orange root",
      short: "Loose soil core for 6–8 inch roots; sweet for juicing and halwa.",
      body: "<p><strong>Carrot seeds</strong> nantes type; keyword: gajar beej.</p>",
      meta: "carrot seeds, gajar, nantes, root vegetable",
    },
    {
      title: "Cucumber Khira Seeds — salad slicer",
      short: "Heat-tolerant slicer for summer salads and raita.",
      body: "<p><strong>Cucumber seeds</strong> khira type for trellis.</p>",
      meta: "cucumber seeds, kheera, salad slicer",
    },
    {
      title: "Pumpkin Kaddu Seeds — small sugar type",
      short: "Sweet pumpkin for pies and subzi; long-vining—needs space.",
      body: "<p><strong>Kaddu beej</strong> small sugar pumpkin.</p>",
      meta: "pumpkin seeds, kaddu, winter squash",
    },
    {
      title: "Radish Mooli Seeds — daikon style long white",
      short: "Fast cycle mooli for intercropping between slow brassicas.",
      body: "<p><strong>Radish seeds</strong> mooli long white.</p>",
      meta: "mooli seeds, radish, daikon india",
    },
    {
      title: "Beetroot Chukandar Seeds — cylindra form",
      short: "Uniform roots for pickling and roasting; bolt watch in peak summer.",
      body: "<p><strong>Beetroot seeds</strong> chukandar cylindra.</p>",
      meta: "beetroot seeds, chukandar, pickling beet",
    },
  ],
  "flower-herb-seeds": [
    {
      title: "Vinca Periwinkle Seeds — spreading mix colors",
      short: "Heat-proof annual flowers for full-sun borders and median strips.",
      body: "<p><strong>Vinca flower seeds</strong> periwinkle mix.</p>",
      meta: "vinca, periwinkle, sadabahar seeds",
    },
    {
      title: "Zinnia Dahlia-flowered Mix — cut flower patch",
      short: "Long stems for vases; deadhead for repeat blooms through winter.",
      body: "<p><strong>Zinnia seeds</strong> cut flower mix.</p>",
      meta: "zinnia seeds, cut flowers, winter annual",
    },
    {
      title: "Cosmos Sensation Mix — tall butterfly magnet",
      short: "Feathery foliage with pink and white daisy blooms.",
      body: "<p><strong>Cosmos seeds</strong> sensation blend.</p>",
      meta: "cosmos seeds, butterfly garden, tall annuals",
    },
    {
      title: "Sunflower Dwarf Seeds — pot culture",
      short: "Short sunflower for 10–12 inch pots and railing boxes.",
      body: "<p><strong>Sunflower seeds</strong> dwarf pot type.</p>",
      meta: "sunflower seeds, surajmukhi dwarf, pot sunflower",
    },
    {
      title: "Lavender English Seeds — trial pack",
      short: "Perennial herb for cool hills; challenging in humid coast—use gritty mix.",
      body: "<p><strong>Lavender seeds</strong> english type trial.</p>",
      meta: "lavender seeds, english lavender, herb perennial",
    },
    {
      title: "Oregano Seeds — Greek strain",
      short: "Pizza herb with pungent oil; drought tolerant in pots.",
      body: "<p><strong>Oregano herb seeds</strong> greek strain.</p>",
      meta: "oregano seeds, pizza herb, mediterranean herb",
    },
    {
      title: "Thyme Seeds — creeping thyme for gaps",
      short: "Low mat for rock gardens and path edging between stepping stones.",
      body: "<p><strong>Thyme seeds</strong> creeping type.</p>",
      meta: "thyme seeds, creeping thyme, path herb",
    },
    {
      title: "Parsley Moss Curled Seeds — garnish",
      short: "Biennial treated as annual; slow germination—soak stratify optional.",
      body: "<p><strong>Parsley seeds</strong> moss curled.</p>",
      meta: "parsley seeds, garnish herb, moss curled",
    },
    {
      title: "Chamomile German Seeds — herbal tea flowers",
      short: "Apple-scented flowers for calming tea; reseeds lightly in cool winters.",
      body: "<p><strong>Chamomile seeds</strong> german type.</p>",
      meta: "chamomile seeds, herbal tea flower, german chamomile",
    },
    {
      title: "Nasturtium Trailing Seeds — edible flowers",
      short: "Peppery leaves and blooms for salads; trap crop for aphids near brassicas.",
      body: "<p><strong>Nasturtium seeds</strong> trailing edible flower.</p>",
      meta: "nasturtium seeds, edible flowers, trap crop",
    },
  ],
  "organic-manure": [
    {
      title: "Bone Meal Steamed Powder — 1 kg",
      short: "Phosphorus source for flowering and fruit set; blend into potting mix.",
      body: "<p><strong>Bone meal organic</strong> amendment for roses and fruiting vegetables.</p>",
      meta: "bone meal, phosphorus fertilizer, organic bloom booster",
    },
    {
      title: "Seaweed Extract Granules — 500 g",
      short: "Kelp-based stress tonic granules for root drench and foliar brews.",
      body: "<p><strong>Seaweed fertilizer</strong> granules for monsoon recovery sprays.</p>",
      meta: "seaweed extract, kelp fertilizer, plant stress",
    },
    {
      title: "Potash Rich Wood Ash — sifted 2 kg",
      short: "Use sparingly on acid soils; avoid chloride-sensitive crops in excess.",
      body: "<p><strong>Wood ash potash</strong> soil amendment for fruiting stage.</p>",
      meta: "wood ash, potash organic, fruiting fertilizer",
    },
    {
      title: "Liquid Fish Emulsion — 500 ml",
      short: "Mild nitrogen boost for leafy greens; odor noticeable for 24–48h.",
      body: "<p><strong>Fish emulsion fertilizer</strong> for organic kitchen gardens.</p>",
      meta: "fish emulsion, organic liquid feed, nitrogen tonic",
    },
    {
      title: "Rock Phosphate Powder — 1 kg",
      short: "Slow-release P for root crops and legume nodulation support in acidic soils.",
      body: "<p><strong>Rock phosphate</strong> mineral amendment; grind fine before mixing.</p>",
      meta: "rock phosphate, slow P, organic mineral",
    },
    {
      title: "Castor Cake Soil Amendment — 1 kg",
      short: "Nitrogen-rich cake; incorporate 10–14 days before sowing sensitive seeds.",
      body: "<p><strong>Castor cake</strong> organic fertilizer for heavy feeders.</p>",
      meta: "castor cake, eranda khali, organic nitrogen",
    },
    {
      title: "Humic Acid Granules — soil conditioner 500 g",
      short: "Improves CEC in sandy soils; pairs with compost and cocopeat.",
      body: "<p><strong>Humic acid</strong> granules for root zone buffering.</p>",
      meta: "humic acid, soil conditioner, CEC improvement",
    },
    {
      title: "Epsom Salt Magnesium Sulfate — 400 g",
      short: "Foliar spray for magnesium deficiency in tomato and pepper.",
      body: "<p><strong>Epsom salt</strong> for mg deficiency correction.</p>",
      meta: "epsom salt, magnesium sulfate, tomato spray",
    },
    {
      title: "Biochar Horticulture Grade — 2 L",
      short: "Stable carbon for moisture retention; inoculate with compost tea.",
      body: "<p><strong>Biochar</strong> amendment for terrace potting mixes.</p>",
      meta: "biochar, carbon soil amendment, moisture retention",
    },
    {
      title: "Mycorrhiza Root Inoculant — 100 g",
      short: "Dry granular inoculant for transplant dip or potting blend.",
      body: "<p><strong>Mycorrhiza</strong> root symbiont for phosphorus uptake.</p>",
      meta: "mycorrhiza, root inoculant, VAM fungi",
    },
  ],
  "grow-bags": [
    {
      title: "Fabric Grow Bag 15 inch — breathable root pruning",
      short: "Aeration fabric pot for mango dwarfing trials and large chilli bushes.",
      body: "<p><strong>Fabric grow bag 15 inch</strong> for air pruning roots.</p>",
      meta: "fabric grow bag, air pot, 15 inch planter",
    },
    {
      title: "Railing Planter Box 60 cm — dual herb row",
      short: "UV plastic railing planter for coriander-basil combos.",
      body: "<p><strong>Railing planter</strong> box 60 cm for balcony herbs.</p>",
      meta: "railing planter, balcony box, herb planter",
    },
    {
      title: "Perlite Horticultural Grade — 5 L",
      short: "Drainage amendment for succulents and potting aeration.",
      body: "<p><strong>Perlite</strong> for potting mixes with cocopeat.</p>",
      meta: "perlite, drainage amendment, soilless mix",
    },
    {
      title: "Vermiculite Fine Grade — 3 L",
      short: "Seed germination cover for moisture retention.",
      body: "<p><strong>Vermiculite</strong> fine for seed starting trays.</p>",
      meta: "vermiculite, seed germination, moisture retention",
    },
    {
      title: "Coco Chips Husk Chunk — 4 kg",
      short: "Orchid and anthurium chunky media; also orchid-lite for monsteras.",
      body: "<p><strong>Coco chips</strong> husk chunk media.</p>",
      meta: "coco chips, husk chunk, orchid media",
    },
    {
      title: "Raised Bed Liner Weed Mat — 2 × 1 m",
      short: "Geotextile liner under raised beds to block nutgrass rhizomes.",
      body: "<p><strong>Weed mat</strong> geotextile for raised garden beds.</p>",
      meta: "weed mat, geotextile, raised bed liner",
    },
    {
      title: "Drip Irrigation Kit — 20 pot balcony",
      short: "Gravity or tap-pressure drip for grow bags and railing planters.",
      body: "<p><strong>Drip irrigation kit</strong> balcony 20 emitters.</p>",
      meta: "drip kit, balcony irrigation, emitter kit",
    },
    {
      title: "Moss Stick Coir Pole — 90 cm",
      short: "Support for monstera, money plant, and climbing philodendron.",
      body: "<p><strong>Coir moss pole</strong> 90 cm for indoor climbers.</p>",
      meta: "moss pole, coir pole, monstera support",
    },
    {
      title: "Seedling Tray 50 Cell — reusable",
      short: "PS tray for vegetable starts; pair with cocopeat plugs.",
      body: "<p><strong>Seedling tray</strong> 50 cell propagation.</p>",
      meta: "seedling tray, propagation, 50 cell",
    },
    {
      title: "Garden Shade Net 50% — 2 × 3 m",
      short: "Summer shade for lettuce and spinach in hot balconies.",
      body: "<p><strong>Shade net 50 percent</strong> agro shade cloth.</p>",
      meta: "shade net, agro shade, summer lettuce",
    },
  ],
  "garden-tools": [
    {
      title: "Bypass Pruner SK5 Blade — 8 inch",
      short: "Clean cuts on soft stems; replaceable spring and lock catch.",
      body: "<p><strong>Bypass pruner</strong> for rose and fruit pruning.</p>",
      meta: "pruner, bypass secateur, SK5 blade",
    },
    {
      title: "Watering Wand with Shower Head — 70 cm",
      short: "Gentle shower for seedlings and seed trays without soil splash.",
      body: "<p><strong>Watering wand</strong> long reach for hanging baskets.</p>",
      meta: "watering wand, shower head, seedling irrigation",
    },
    {
      title: "Soil pH Test Kit — 40 tests",
      short: "Colorimetric strips for potting mix troubleshooting.",
      body: "<p><strong>Soil pH kit</strong> home garden testing.</p>",
      meta: "soil ph test, garden testing kit, acidity strips",
    },
    {
      title: "Garden Gloves Nitrile Coated — M size",
      short: "Grip in wet media; breathable knit back for long potting sessions.",
      body: "<p><strong>Garden gloves</strong> nitrile coated medium.</p>",
      meta: "garden gloves, nitrile grip, potting gloves",
    },
    {
      title: "Hand Fork Cultivator — carbon steel",
      short: "Loosen surface crust in pots before top-dressing compost.",
      body: "<p><strong>Hand fork cultivator</strong> for container gardens.</p>",
      meta: "hand fork, cultivator, soil aeration hand tool",
    },
    {
      title: "Sprayer Pump 2 L — pressure garden",
      short: "Foliar neem oil and seaweed sprays with adjustable brass nozzle.",
      body: "<p><strong>Garden sprayer</strong> 2 liter pump type.</p>",
      meta: "garden sprayer, foliar spray, 2L pump",
    },
    {
      title: "Harvest Scissors Curved Blade — micro serration",
      short: "Snips for grape clusters, chilli picking, and deadheading.",
      body: "<p><strong>Harvest scissors</strong> curved micro serrated.</p>",
      meta: "harvest scissors, picking snips, curved blade",
    },
    {
      title: "Measuring Jug 1 L — mixing fertilizers",
      short: "PP jug with embossed ml scale for diluting liquid feeds.",
      body: "<p><strong>Measuring jug 1L</strong> fertilizer mixing.</p>",
      meta: "measuring jug, fertilizer mix, 1 liter jug",
    },
    {
      title: "Garden Kneeler Foam Pad",
      short: "Dense foam pad for weeding sessions on hard terrace floors.",
      body: "<p><strong>Kneeler pad</strong> garden comfort foam.</p>",
      meta: "kneeler pad, garden foam, weeding comfort",
    },
    {
      title: "Bamboo Plant Labels — 20 pack",
      short: "Writable tags for seedling trays and graft lines.",
      body: "<p><strong>Bamboo plant labels</strong> 20 pack.</p>",
      meta: "plant labels, bamboo tags, seedling labels",
    },
  ],
  "organic-groceries": [
    {
      title: "Cold-pressed Virgin Coconut Oil — 500 ml glass",
      short: "Kerala sourced; medium chain profile for cooking and oil pulling trials.",
      body: "<p><strong>Virgin coconut oil</strong> cold pressed glass bottle.</p>",
      meta: "coconut oil, virgin cold pressed, nariyal tel",
    },
    {
      title: "Forest Honey Wild Multi-flora — 350 g",
      short: "Unfiltered forest honey for tea and marinades; crystallizes in winter.",
      body: "<p><strong>Wild forest honey</strong> multiflora raw style.</p>",
      meta: "wild honey, forest honey, raw honey india",
    },
    {
      title: "Red Rice Matta — 1 kg",
      short: "Kerala parboiled red rice; nutty flavor for porridge and idli mix.",
      body: "<p><strong>Matta rice</strong> red parboiled grain.</p>",
      meta: "matta rice, red rice, kerala rice",
    },
    {
      title: "Jaggery Powder Organic — 500 g",
      short: "Panela-style powder for baking and traditional sweets.",
      body: "<p><strong>Organic jaggery powder</strong> unrefined sweetener.</p>",
      meta: "jaggery powder, gur powder, organic sweetener",
    },
    {
      title: "Stone-ground Sattu Flour — 500 g",
      short: "Roasted gram flour for summer drinks and litti stuffing.",
      body: "<p><strong>Sattu atta</strong> stone ground roasted chana.</p>",
      meta: "sattu, roasted gram flour, summer protein drink",
    },
    {
      title: "Himalayan Pink Salt Coarse — 500 g grinder refill",
      short: "Trace mineral salt for finishing grills and salads.",
      body: "<p><strong>Pink salt coarse</strong> grinder refill pack.</p>",
      meta: "pink salt, himalayan salt, coarse salt",
    },
    {
      title: "Apple Cider Vinegar with Mother — 500 ml",
      short: "Raw ACV for dressings and hair rinse dilutions (external use).",
      body: "<p><strong>Apple cider vinegar mother</strong> raw 500ml.</p>",
      meta: "apple cider vinegar, mother vinegar, raw ACV",
    },
    {
      title: "Sprouting Mix Seeds — 250 g",
      short: "Radish-mustard-fenugreek blend for jar sprouting.",
      body: "<p><strong>Sprouting mix</strong> seeds 250g jar culture.</p>",
      meta: "sprouting seeds, microgreen mix, jar sprouts",
    },
    {
      title: "Quinoa White — 500 g",
      short: "Wash thoroughly to remove saponin bitterness before cooking.",
      body: "<p><strong>White quinoa</strong> grain bowl staple.</p>",
      meta: "quinoa white, protein grain, salad bowl",
    },
    {
      title: "Steel-cut Oats — 750 g",
      short: "Low GI porridge oats; longer cook than rolled flakes.",
      body: "<p><strong>Steel cut oats</strong> breakfast porridge grain.</p>",
      meta: "steel cut oats, porridge oats, low gi breakfast",
    },
  ],
};

export function getBulkSeedRow(i: number): BulkTemplate & { cat: SeedCategorySlug } {
  const cat = BULK_SEED_CAT_ORDER[(i - 1) % BULK_SEED_CAT_ORDER.length]!;
  const pool = BULK_POOLS[cat];
  const idxInCat = Math.floor((i - 1) / BULK_SEED_CAT_ORDER.length);
  const tpl = pool[idxInCat % pool.length]!;
  return { ...tpl, cat };
}

export function bulkDisplayName(i: number, tpl: BulkTemplate): string {
  const suffix = ` · QA#${i}`;
  const max = 255 - suffix.length;
  const base = tpl.title.length > max ? tpl.title.slice(0, max - 1).trimEnd() + "…" : tpl.title;
  return `${base}${suffix}`;
}
