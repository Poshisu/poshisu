export type ParsedNutritionItem = {
  key: string;
  name: string;
  quantityG: number;
  householdUnit: string;
  matchedAlias?: string;
};

type FoodEntry = {
  name: string;
  aliases: string[];
  defaultQuantityG: number;
  householdUnit: string;
  nutrientsPer100g: { kcal: number; protein: number; carbs: number; fat: number; fiber: number };
};

const FOOD_DB: Record<string, FoodEntry> = {
  roti: { name: "roti", aliases: ["roti", "rotis", "chapati", "phulka"], defaultQuantityG: 35, householdUnit: "1 medium roti (~35 g)", nutrientsPer100g: { kcal: 300, protein: 9, carbs: 51, fat: 7.5, fiber: 7 } },
  rice: { name: "rice", aliases: ["rice", "chawal"], defaultQuantityG: 150, householdUnit: "1 cooked katori (~150 g)", nutrientsPer100g: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 } },
  dal: { name: "dal", aliases: ["dal", "dhal"], defaultQuantityG: 180, householdUnit: "1 bowl dal (~180 g)", nutrientsPer100g: { kcal: 90, protein: 5, carbs: 13, fat: 1.7, fiber: 3.9 } },
  paneer: { name: "paneer", aliases: ["paneer"], defaultQuantityG: 100, householdUnit: "~100 g paneer portion", nutrientsPer100g: { kcal: 265, protein: 18, carbs: 6, fat: 20, fiber: 0 } },
  curd: { name: "curd", aliases: ["curd", "dahi", "yogurt", "yoghurt"], defaultQuantityG: 100, householdUnit: "~100 g curd/yogurt", nutrientsPer100g: { kcal: 95, protein: 5, carbs: 7, fat: 5, fiber: 0 } },
  idli: { name: "idli", aliases: ["idli", "idlis"], defaultQuantityG: 50, householdUnit: "1 medium idli (~50 g)", nutrientsPer100g: { kcal: 116, protein: 4, carbs: 24, fat: 0.8, fiber: 1.2 } },
  dosa: { name: "dosa", aliases: ["dosa", "dosai"], defaultQuantityG: 100, householdUnit: "1 medium dosa (~100 g)", nutrientsPer100g: { kcal: 168, protein: 3.5, carbs: 28, fat: 4.8, fiber: 1.8 } },
  egg: { name: "egg", aliases: ["egg", "eggs"], defaultQuantityG: 50, householdUnit: "1 egg (~50 g)", nutrientsPer100g: { kcal: 144, protein: 12.6, carbs: 0.8, fat: 9.6, fiber: 0 } },
  chicken: { name: "chicken", aliases: ["chicken"], defaultQuantityG: 100, householdUnit: "~100 g cooked chicken", nutrientsPer100g: { kcal: 239, protein: 27, carbs: 0, fat: 14, fiber: 0 } },
  fish: { name: "fish", aliases: ["fish"], defaultQuantityG: 100, householdUnit: "~100 g cooked fish", nutrientsPer100g: { kcal: 206, protein: 22, carbs: 0, fat: 12, fiber: 0 } },
  banana: { name: "banana", aliases: ["banana", "bananas"], defaultQuantityG: 118, householdUnit: "1 medium banana (~118 g)", nutrientsPer100g: { kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 } },
  "whey isolate": { name: "whey isolate", aliases: ["whey isolate", "whey protein", "protein powder"], defaultQuantityG: 35, householdUnit: "35 g scoop whey isolate", nutrientsPer100g: { kcal: 370, protein: 82, carbs: 5, fat: 2, fiber: 0 } },
  oats: { name: "rolled oats", aliases: ["rolled oats", "oats", "oatmeal"], defaultQuantityG: 60, householdUnit: "60 g dry rolled oats", nutrientsPer100g: { kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6 } },
  skyr: { name: "skyr yogurt", aliases: ["skyr", "skyr yogurt", "skyr yoghurt"], defaultQuantityG: 50, householdUnit: "50 g skyr yogurt", nutrientsPer100g: { kcal: 63, protein: 11, carbs: 3.6, fat: 0.2, fiber: 0 } },
  chia: { name: "chia seeds", aliases: ["chia", "chia seeds"], defaultQuantityG: 4, householdUnit: "1 tsp chia seeds (~4 g)", nutrientsPer100g: { kcal: 486, protein: 16.5, carbs: 42.1, fat: 30.7, fiber: 34.4 } },
  flax: { name: "flax seeds", aliases: ["flax", "flax seeds", "flaxseed"], defaultQuantityG: 4, householdUnit: "1 tsp flax seeds (~4 g)", nutrientsPer100g: { kcal: 534, protein: 18.3, carbs: 28.9, fat: 42.2, fiber: 27.3 } },
  dates: { name: "dates", aliases: ["dates", "date"], defaultQuantityG: 16, householdUnit: "1 date (~16 g)", nutrientsPer100g: { kcal: 282, protein: 2.5, carbs: 75, fat: 0.4, fiber: 8 } },
  honey: { name: "honey", aliases: ["honey"], defaultQuantityG: 7, householdUnit: "1 tsp honey (~7 g)", nutrientsPer100g: { kcal: 304, protein: 0.3, carbs: 82.4, fat: 0, fiber: 0.2 } },
  "almond milk": { name: "almond milk", aliases: ["almond milk"], defaultQuantityG: 100, householdUnit: "100 ml almond milk", nutrientsPer100g: { kcal: 15, protein: 0.6, carbs: 0.3, fat: 1.2, fiber: 0.2 } },
  dragonfruit: { name: "dragon fruit", aliases: ["dragonfruit", "dragon fruit"], defaultQuantityG: 100, householdUnit: "100 g dragon fruit", nutrientsPer100g: { kcal: 57, protein: 0.4, carbs: 13, fat: 0.1, fiber: 3 } },
  mango: { name: "mango", aliases: ["mango", "mangoes"], defaultQuantityG: 60, householdUnit: "60 g mango", nutrientsPer100g: { kcal: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6 } },
  kimchi: { name: "radish kimchi", aliases: ["radish kimchi", "kimchi"], defaultQuantityG: 30, householdUnit: "30 g radish kimchi", nutrientsPer100g: { kcal: 20, protein: 1.1, carbs: 3.6, fat: 0.4, fiber: 1.6 } },
};

const AMBIGUOUS_PATTERN = /\b(some|few|bit|little|maybe|depends|random|snack|food|or|\/|either)\b/i;

export interface NutritionResult {
  kcalMin: number;
  kcalMax: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: "high" | "medium" | "low";
  items: string[];
  itemDetails: ParsedNutritionItem[];
  rationale: string;
  clarificationQuestions: string[];
}

function round(value: number, fractionDigits = 0) {
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasPattern(alias: string) {
  return new RegExp(`(^|[^a-z0-9])(${escapeRegex(alias)})(?=$|[^a-z0-9])`, "i");
}

function nearbyQuantity(text: string, matchIndex: number, matchEnd: number, fallback: number) {
  const before = text.slice(Math.max(0, matchIndex - 36), matchIndex);
  const after = text.slice(matchEnd, Math.min(text.length, matchEnd + 40));
  const directBefore = before.match(/(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|ml|mL)\s*$/i);
  const directAfter = after.match(/^\s*(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|ml|mL)\b/i);
  const phraseAfter = after.match(/^\s+(?:[a-z]+\s+){0,3}(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|ml|mL)\b(?=\s*[,.;]|\s+(?:and|with|for)\b)/i);
  const tspBefore = before.match(/(\d+(?:\.\d+)?)\s*(tsp|teaspoon|teaspoons)\s*$/i);
  const tspAfter = after.match(/^\s*(\d+(?:\.\d+)?)\s*(tsp|teaspoon|teaspoons)\b/i);
  const tspEachAfter = after.match(/^(?:\s+(?:and|&)?\s*[a-z]+){0,3}\s+(\d+(?:\.\d+)?)\s*(tsp|teaspoon|teaspoons)\s+each\b/i);
  const countBefore = before.match(/(\d+(?:\.\d+)?)\s*$/i);

  if (tspBefore) return Number(tspBefore[1]) * 4;
  if (tspAfter) return Number(tspAfter[1]) * 4;
  if (tspEachAfter) return Number(tspEachAfter[1]) * 4;
  if (directAfter) return Number(directAfter[1]);
  if (phraseAfter) return Number(phraseAfter[1]);
  if (directBefore) return Number(directBefore[1]);
  if (countBefore && fallback <= 40) return Number(countBefore[1]) * fallback;
  return fallback;
}

function householdUnit(entry: FoodEntry, quantityG: number) {
  if (Math.abs(quantityG - entry.defaultQuantityG) <= 1) return entry.householdUnit;
  const rounded = round(quantityG);
  if (entry.name.includes("milk")) return `${rounded} ml ${entry.name}`;
  return `~${rounded} g ${entry.name}`;
}

function parseDetails(text: string): ParsedNutritionItem[] {
  const lower = text.toLowerCase();
  const parsed: ParsedNutritionItem[] = [];
  const occupied = new Set<string>();
  const spans: Array<{ start: number; end: number }> = [];

  const entries = Object.entries(FOOD_DB).sort(([, a], [, b]) => Math.max(...b.aliases.map((alias) => alias.length)) - Math.max(...a.aliases.map((alias) => alias.length)));

  for (const [key, entry] of entries) {
    const aliases = [...entry.aliases].sort((a, b) => b.length - a.length);
    for (const alias of aliases) {
      const match = aliasPattern(alias).exec(lower);
      if (!match) continue;
      const aliasStart = match.index + match[1].length;
      const aliasEnd = aliasStart + alias.length;
      if (occupied.has(key) || spans.some((span) => aliasStart < span.end && aliasEnd > span.start)) continue;
      const quantityG = nearbyQuantity(lower, aliasStart, aliasEnd, entry.defaultQuantityG);
      parsed.push({ key, name: entry.name, quantityG, householdUnit: householdUnit(entry, quantityG), matchedAlias: alias });
      occupied.add(key);
      spans.push({ start: aliasStart, end: aliasEnd });
      break;
    }
  }

  return parsed;
}

function normalizeItems(items: Array<string | ParsedNutritionItem>): ParsedNutritionItem[] {
  return items.flatMap((item) => {
    if (typeof item !== "string") return [item];
    const normalized = item.toLowerCase().trim();
    const entry = FOOD_DB[normalized];
    if (!entry) return parseDetails(normalized);
    return [{ key: normalized, name: entry.name, quantityG: entry.defaultQuantityG, householdUnit: entry.householdUnit }];
  });
}

export async function runPipeline(items: Array<string | ParsedNutritionItem>): Promise<NutritionResult> {
  const known = normalizeItems(items);
  if (known.length === 0) {
    return {
      kcalMin: 250,
      kcalMax: 550,
      protein: 10,
      carbs: 45,
      fat: 15,
      fiber: 6,
      confidence: "low",
      items: [],
      itemDetails: [],
      rationale: "Estimate uses a broad mixed-meal baseline due to low detail.",
      clarificationQuestions: [
        "What were the main items in the meal?",
        "Roughly how many portions (small/medium/large)?",
      ],
    };
  }

  const totals = known.reduce(
    (acc, item) => {
      const entry = FOOD_DB[item.key];
      const multiplier = item.quantityG / 100;
      acc.kcal += entry.nutrientsPer100g.kcal * multiplier;
      acc.protein += entry.nutrientsPer100g.protein * multiplier;
      acc.carbs += entry.nutrientsPer100g.carbs * multiplier;
      acc.fat += entry.nutrientsPer100g.fat * multiplier;
      acc.fiber += entry.nutrientsPer100g.fiber * multiplier;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  const hasExplicitPortions = known.some((item) => Math.abs(item.quantityG - FOOD_DB[item.key].defaultQuantityG) > 1);
  const buffer = known.length >= 4 && hasExplicitPortions ? 0.12 : known.length === 1 ? 0.25 : 0.15;
  const kcalMin = Math.round(totals.kcal * (1 - buffer));
  const kcalMax = Math.round(totals.kcal * (1 + buffer));

  return {
    kcalMin,
    kcalMax,
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
    fiber: Math.round(totals.fiber),
    confidence: known.length >= 4 ? "high" : known.length >= 2 ? "high" : "medium",
    items: known.map((item) => item.key),
    itemDetails: known,
    rationale: `Estimated from recognized items and stated portions (${known.map((item) => item.name).join(", ")}).`,
    clarificationQuestions: [],
  };
}

export function parseItemsFromText(text: string): { items: ParsedNutritionItem[]; isAmbiguous: boolean } {
  const lower = text.toLowerCase();
  const items = parseDetails(lower);
  return { items, isAmbiguous: AMBIGUOUS_PATTERN.test(lower) || items.length === 0 };
}
