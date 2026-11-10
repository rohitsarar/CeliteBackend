/**
 * Builds the product-page content for one tyre row: a description, key
 * highlights and a specification table.
 *
 * Everything here is derived from data we already have and can stand behind:
 *   - the size string ("245/40R20 99Y XL RFT") is decoded with the standard
 *     ETRTO load-index and speed-symbol tables, and dimensions are calculated;
 *   - the model text describes the Pirelli pattern in general terms;
 *   - the car (manufacturer_name) comes from the OE marking in the price list.
 * Nothing is invented per row (no prices, no test results, no warranty terms).
 *
 * Used by `npm run tyre-details` (fills existing rows) and by the admin
 * create endpoint (fills new rows).
 */

export type TyreSpec = { label: string; value: string };

export type TyreContent = {
  description: string;
  highlights: string[];
  specs: TyreSpec[];
};

type TyreRowInput = {
  brandName?: string | null;
  modelName: string;
  size: string;
  manufacturerName?: string | null;
};

// ─── Standard tables ─────────────────────────────────────────────────────────

/** ETRTO load index → max load per tyre in kg (indices 60–130). */
const LOAD_INDEX_KG: Record<number, number> = {
  60: 250, 61: 257, 62: 265, 63: 272, 64: 280, 65: 290, 66: 300, 67: 307, 68: 315, 69: 325,
  70: 335, 71: 345, 72: 355, 73: 365, 74: 375, 75: 387, 76: 400, 77: 412, 78: 425, 79: 437,
  80: 450, 81: 462, 82: 475, 83: 487, 84: 500, 85: 515, 86: 530, 87: 545, 88: 560, 89: 580,
  90: 600, 91: 615, 92: 630, 93: 650, 94: 670, 95: 690, 96: 710, 97: 730, 98: 750, 99: 775,
  100: 800, 101: 825, 102: 850, 103: 875, 104: 900, 105: 925, 106: 950, 107: 975, 108: 1000,
  109: 1030, 110: 1060, 111: 1090, 112: 1120, 113: 1150, 114: 1180, 115: 1215, 116: 1250,
  117: 1285, 118: 1320, 119: 1360, 120: 1400, 121: 1450, 122: 1500, 123: 1550, 124: 1600,
  125: 1650, 126: 1700, 127: 1750, 128: 1800, 129: 1850, 130: 1900,
};

/** Speed symbol → max speed in km/h. */
const SPEED_KMH: Record<string, string> = {
  L: "120", M: "130", N: "140", P: "150", Q: "160", R: "170", S: "180", T: "190",
  U: "200", H: "210", V: "240", W: "270", Y: "300", ZR: "above 240",
};

/** Car maker → how Pirelli marks the tyres developed with that maker. */
const OE_MARKING: Record<string, string> = {
  BMW: "★ (BMW star)",
  Mercedes: "MO / MOE (Mercedes-Benz)",
  "BMW-Mercedes": "★ and MO (BMW and Mercedes-Benz)",
  Audi: "AO (Audi)",
  Porsche: "N-marked (Porsche)",
  JLR: "J / JLR (Jaguar Land Rover)",
  Volvo: "VOL (Volvo)",
  Lamborghini: "L (Lamborghini)",
  Bentley: "B (Bentley)",
  "Alfa Romeo": "AR (Alfa Romeo)",
};

// ─── Model descriptions ──────────────────────────────────────────────────────

type ModelInfo = {
  type: string;
  season: string;
  summary: string;
  highlights: string[];
};

const SEAL_INSIDE_HIGHLIGHT =
  "Seal Inside technology: a sealant layer closes most tread punctures (up to about 4 mm) so you can keep driving";

/** Matched in order, first match wins. Keys are lower-case substrings of the model name. */
const MODEL_INFO: Array<[string, ModelInfo]> = [
  ["p zero all season", {
    type: "Ultra-high-performance all-season tyre",
    season: "All season",
    summary:
      "The P Zero All Season brings P Zero sports-car handling to a tyre that keeps its grip across changing temperatures and in heavy rain.",
    highlights: [
      "Sporty, precise steering in the dry",
      "Strong grip and braking on wet roads",
      "Compound that stays effective across a wide temperature range",
      "Quiet and comfortable for daily driving",
    ],
  }],
  ["p zero e", {
    type: "Ultra-high-performance summer tyre",
    season: "Summer",
    summary:
      "The P Zero E is Pirelli's high-performance tyre built with a large share of natural and recycled materials, designed for powerful petrol, hybrid and electric cars.",
    highlights: [
      "Made with a high share of natural and recycled materials",
      "Low rolling resistance for better range and efficiency",
      "Strong wet grip and short braking distances",
      "Low noise, suited to quiet electric cars",
    ],
  }],
  ["p zero", {
    type: "Ultra-high-performance summer tyre",
    season: "Summer",
    summary:
      "The P Zero is Pirelli's flagship ultra-high-performance tyre, developed together with the world's leading premium and sports-car makers for precise handling and grip at high speed.",
    highlights: [
      "Precise, responsive steering and cornering",
      "Excellent grip and short braking on dry and wet roads",
      "Stable and controlled at high speed",
      "Developed with premium car makers for their specific models",
    ],
  }],
  ["cinturato p7 blue", {
    type: "Premium touring summer tyre (eco)",
    season: "Summer",
    summary:
      "The Cinturato P7 Blue focuses on safety in the wet and on low rolling resistance, for lower fuel use without giving up comfort.",
    highlights: [
      "Very strong grip and braking on wet roads",
      "Low rolling resistance for better fuel economy",
      "Quiet, comfortable ride",
      "Even wear for long tyre life",
    ],
  }],
  ["p7 all season", {
    type: "Premium touring all-season tyre",
    season: "All season",
    summary:
      "The Cinturato P7 All Season gives the comfort of the Cinturato range with grip that holds up in rain and changing weather all year round.",
    highlights: [
      "Reliable grip in rain and changing weather",
      "Comfortable and quiet",
      "Long, even wear",
      "Low rolling resistance",
    ],
  }],
  ["p7 cinturato", {
    type: "Premium touring summer tyre",
    season: "Summer",
    summary:
      "The Cinturato P7 is Pirelli's premium touring tyre for saloons and executive cars, balancing comfort, safety in the wet and low rolling resistance.",
    highlights: [
      "Short braking distances on wet roads",
      "Comfortable, quiet ride on city roads and highways",
      "Low rolling resistance for better fuel economy",
      "Precise and predictable handling",
    ],
  }],
  ["cinturato", {
    type: "Touring tyre",
    season: "Summer",
    summary:
      "The Cinturato range is Pirelli's comfort and safety family for everyday cars, focused on wet grip, low noise and long life.",
    highlights: [
      "Safe grip on wet roads",
      "Comfortable, quiet ride",
      "Long, even wear",
      "Efficient on fuel",
    ],
  }],
  ["powergy", {
    type: "Summer tyre for everyday cars",
    season: "Summer",
    summary:
      "The Powergy is a summer tyre for everyday cars that balances safety, durability and value.",
    highlights: [
      "Safe braking in the dry and wet",
      "Durable tread for long life",
      "Comfortable daily driving",
      "Good value for money",
    ],
  }],
  ["scorpion zero all season", {
    type: "High-performance SUV all-season tyre",
    season: "All season",
    summary:
      "The Scorpion Zero All Season is built for powerful SUVs, combining sporty handling with grip in rain and changing conditions all year.",
    highlights: [
      "Sporty handling for high-performance SUVs",
      "Confident grip in wet and changing weather",
      "Stable at high speed despite SUV weight",
      "Comfortable on long drives",
    ],
  }],
  ["scorpion zero", {
    type: "High-performance SUV summer tyre",
    season: "Summer",
    summary:
      "The Scorpion Zero is Pirelli's high-performance tyre for powerful SUVs, giving sports-car levels of grip and stability to heavy vehicles.",
    highlights: [
      "Strong grip and precise steering for heavy, fast SUVs",
      "Stable at high speed",
      "Short braking distances",
      "Designed for premium performance SUVs",
    ],
  }],
  ["scorpion verde all season", {
    type: "SUV touring all-season tyre",
    season: "All season",
    summary:
      "The Scorpion Verde All Season is a comfortable, efficient SUV tyre that keeps good grip in rain and changing weather throughout the year.",
    highlights: [
      "Grip in rain and changing weather",
      "Low rolling resistance for better fuel economy",
      "Quiet and comfortable",
      "Long tread life",
    ],
  }],
  ["scorpion verde", {
    type: "SUV touring summer tyre",
    season: "Summer",
    summary:
      "The Scorpion Verde is Pirelli's comfort and efficiency tyre for SUVs and crossovers, with low rolling resistance and safe handling.",
    highlights: [
      "Low rolling resistance for better fuel economy",
      "Comfortable and quiet on highways",
      "Safe braking on wet roads",
      "Even wear for long life",
    ],
  }],
  ["all terrain", {
    type: "All-terrain SUV / pickup tyre",
    season: "All season",
    summary:
      "The Scorpion All Terrain Plus is built for SUVs and pickups that drive on tarmac and off-road, with a tough casing and a tread that grips on loose surfaces.",
    highlights: [
      "Grip on gravel, mud and dirt roads",
      "Tough, cut-resistant construction",
      "Comfortable on regular roads",
      "Long-lasting tread",
    ],
  }],
  ["at plus", {
    type: "All-terrain SUV / pickup tyre",
    season: "All season",
    summary:
      "The Scorpion AT Plus is built for SUVs and pickups that drive on tarmac and off-road, with a tough casing and a tread that grips on loose surfaces.",
    highlights: [
      "Grip on gravel, mud and dirt roads",
      "Tough, cut-resistant construction",
      "Comfortable on regular roads",
      "Long-lasting tread",
    ],
  }],
  ["scorpion atr", {
    type: "All-terrain SUV / pickup tyre",
    season: "All season",
    summary:
      "The Scorpion ATR is an all-terrain tyre for SUVs and pickups that split their time between the road and rough tracks.",
    highlights: [
      "Traction on loose and uneven surfaces",
      "Robust construction",
      "Comfortable road manners",
      "Durable tread",
    ],
  }],
  ["scorpion ms", {
    type: "SUV all-season tyre",
    season: "All season",
    summary:
      "The Scorpion MS is an SUV tyre designed to keep reliable grip across seasons and in mixed weather.",
    highlights: [
      "Reliable grip in mixed weather",
      "Comfortable on long drives",
      "Stable handling for SUVs",
      "Durable tread",
    ],
  }],
  ["scorpion", {
    type: "SUV tyre",
    season: "Summer",
    summary:
      "The Scorpion is Pirelli's SUV tyre for comfort, safety and long life, made for crossovers and SUVs on city roads and highways.",
    highlights: [
      "Comfortable and quiet",
      "Safe grip on wet and dry roads",
      "Stable handling for taller vehicles",
      "Long tread life",
    ],
  }],
];

const GENERIC_MODEL: ModelInfo = {
  type: "Passenger car tyre",
  season: "Summer",
  summary: "A quality tyre engineered for safe grip, comfort and long life.",
  highlights: ["Safe grip on wet and dry roads", "Comfortable ride", "Long tread life"],
};

const findModelInfo = (modelName: string): ModelInfo => {
  const m = modelName.toLowerCase();
  return MODEL_INFO.find(([key]) => m.includes(key))?.[1] ?? GENERIC_MODEL;
};

// ─── Size decoding ───────────────────────────────────────────────────────────

export type ParsedSize = {
  prefix?: string; // P, LT, HL
  width: number;
  aspect: number;
  construction: string; // R or ZR
  rim: number;
  loadIndex?: number;
  speed?: string;
  xl: boolean;
  runFlat: boolean;
};

export const parseSize = (size: string): ParsedSize | null => {
  const m =
    /^(P|LT|HL)?\s*(\d{3})\/(\d{2})\s*(ZR|R)\s*(\d{2})(?:\s+(\d{2,3})(?:\/\d{2,3})?\s*\(?([A-Z])\)?)?/i.exec(
      size.trim(),
    );
  if (!m) return null;
  const upper = size.toUpperCase();
  return {
    prefix: m[1]?.toUpperCase(),
    width: Number(m[2]),
    aspect: Number(m[3]),
    construction: m[4].toUpperCase(),
    rim: Number(m[5]),
    loadIndex: m[6] ? Number(m[6]) : undefined,
    speed: m[7]?.toUpperCase(),
    xl: /\bXL\b/.test(upper),
    runFlat: /\b(RFT|RUN\s*FLAT|R-F)\b/.test(upper),
  };
};

const fmt = (n: number) => n.toLocaleString("en-IN");

const buildSpecs = (row: TyreRowInput, info: ModelInfo, p: ParsedSize | null): TyreSpec[] => {
  const specs: TyreSpec[] = [
    { label: "Brand", value: titleCase(row.brandName || "Pirelli") },
    { label: "Pattern", value: row.modelName },
    { label: "Size", value: row.size },
    { label: "Tyre type", value: info.type },
    { label: "Season", value: info.season },
  ];

  if (p) {
    const sidewall = Math.round((p.width * p.aspect) / 100);
    const diameter = Math.round(p.rim * 25.4 + 2 * sidewall);
    specs.push(
      { label: "Section width", value: `${p.width} mm` },
      { label: "Aspect ratio", value: `${p.aspect}% (sidewall about ${sidewall} mm)` },
      { label: "Rim size", value: `${p.rim} inch` },
      { label: "Overall diameter", value: `about ${fmt(diameter)} mm` },
      {
        label: "Construction",
        value: p.construction === "ZR" ? "Radial, ZR rated (above 240 km/h)" : "Radial",
      },
    );
    if (p.loadIndex !== undefined) {
      const kg = LOAD_INDEX_KG[p.loadIndex];
      specs.push({
        label: "Load index",
        value: kg ? `${p.loadIndex} (up to ${fmt(kg)} kg per tyre)` : String(p.loadIndex),
      });
    }
    if (p.speed) {
      const kmh = SPEED_KMH[p.speed];
      specs.push({
        label: "Speed rating",
        value: kmh ? `${p.speed} (up to ${kmh} km/h)` : p.speed,
      });
    }
    specs.push(
      { label: "Reinforced (XL)", value: p.xl ? "Yes, extra load" : "No, standard load" },
      { label: "Run-flat", value: p.runFlat ? "Yes" : "No" },
    );
    if (p.prefix === "LT") specs.push({ label: "Usage", value: "Light truck (LT) construction" });
    if (p.prefix === "HL") specs.push({ label: "Usage", value: "High Load (HL), for heavy EVs and SUVs" });
  }

  if (/seal inside/i.test(row.modelName)) {
    specs.push({ label: "Puncture protection", value: "Seal Inside (self-sealing)" });
  }

  const car = row.manufacturerName?.trim();
  if (car && car !== "Standard") {
    specs.push({ label: "Developed for", value: car });
    if (OE_MARKING[car]) specs.push({ label: "OE marking", value: OE_MARKING[car] });
  } else {
    specs.push({ label: "Fitment", value: "Standard fitment (no car-maker marking)" });
  }

  return specs;
};

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

// ─── Public API ──────────────────────────────────────────────────────────────

export const buildTyreContent = (row: TyreRowInput): TyreContent => {
  const info = findModelInfo(row.modelName);
  const p = parseSize(row.size);
  const brand = titleCase(row.brandName || "Pirelli");
  const car = row.manufacturerName?.trim();
  const forCar = car && car !== "Standard" ? car : null;

  const highlights = [...info.highlights];
  if (p?.runFlat) {
    highlights.unshift(
      "Run-flat: after a puncture you can keep driving at reduced speed (typically up to 80 km at 80 km/h) to reach a garage",
    );
  }
  if (/seal inside/i.test(row.modelName)) highlights.unshift(SEAL_INSIDE_HIGHLIGHT);
  if (forCar) {
    const marking = OE_MARKING[forCar];
    highlights.unshift(
      marking
        ? `Developed and approved for ${forCar}, with the ${marking} marking on the sidewall`
        : `Developed for ${forCar}`,
    );
  }
  if (p?.xl) highlights.push("Reinforced (XL) construction for heavier cars and higher load");

  const sizeSentence = p
    ? `This ${p.width}/${p.aspect} R${p.rim} size${
        p.loadIndex !== undefined && p.speed ? ` carries load index ${p.loadIndex} and speed rating ${p.speed}` : ""
      }${p.runFlat ? ", and it is a run-flat tyre" : ""}.`
    : "";

  const description = [
    `${brand} ${row.modelName} ${row.size}${forCar ? ` for ${forCar}` : ""}.`,
    info.summary,
    sizeSentence,
    "Available at CELITE Tyre with professional fitting, wheel balancing and alignment. Call or WhatsApp us for today's best price and stock.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    description,
    highlights,
    specs: buildSpecs(row, info, p),
  };
};
