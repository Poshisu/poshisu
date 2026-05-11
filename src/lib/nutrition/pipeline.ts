const FOOD_DB: Record<string, { kcal: number; protein: number; carbs: number; fat: number; fiber: number }> = {
  roti: { kcal: 120, protein: 3.5, carbs: 18, fat: 3, fiber: 2.5 },
  rice: { kcal: 180, protein: 3.5, carbs: 39, fat: 0.4, fiber: 0.6 },
  dal: { kcal: 160, protein: 9, carbs: 23, fat: 3, fiber: 7 },
  paneer: { kcal: 265, protein: 18, carbs: 6, fat: 20, fiber: 0 },
  curd: { kcal: 95, protein: 5, carbs: 7, fat: 5, fiber: 0 },
  idli: { kcal: 58, protein: 2, carbs: 12, fat: 0.4, fiber: 0.6 },
  dosa: { kcal: 168, protein: 3.5, carbs: 28, fat: 4.8, fiber: 1.8 },
  egg: { kcal: 72, protein: 6.3, carbs: 0.4, fat: 4.8, fiber: 0 },
  chicken: { kcal: 239, protein: 27, carbs: 0, fat: 14, fiber: 0 },
  fish: { kcal: 206, protein: 22, carbs: 0, fat: 12, fiber: 0 },
  banana: { kcal: 105, protein: 1.3, carbs: 27, fat: 0.3, fiber: 3.1 },
};

const AMBIGUOUS_PATTERN = /\b(some|few|bit|little|maybe|depends|random|snack|food)\b/i;

export interface NutritionResult {
  kcalMin: number;
  kcalMax: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: "high" | "medium" | "low";
  items: string[];
  rationale: string;
  clarificationQuestions: string[];
}

export async function runPipeline(items: string[]): Promise<NutritionResult> {
  const known = items.map((i) => i.toLowerCase()).filter((i) => FOOD_DB[i]);
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
      rationale: "Estimate uses a broad mixed-meal baseline due to low detail.",
      clarificationQuestions: [
        "What were the main items in the meal?",
        "Roughly how many portions (small/medium/large)?",
      ],
    };
  }

  const totals = known.reduce(
    (acc, key) => {
      const n = FOOD_DB[key];
      acc.kcal += n.kcal;
      acc.protein += n.protein;
      acc.carbs += n.carbs;
      acc.fat += n.fat;
      acc.fiber += n.fiber;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  const buffer = known.length === 1 ? 0.2 : 0.15;
  const kcalMin = Math.round(totals.kcal * (1 - buffer));
  const kcalMax = Math.round(totals.kcal * (1 + buffer));

  return {
    kcalMin,
    kcalMax,
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
    fiber: Math.round(totals.fiber),
    confidence: known.length >= 2 ? "high" : "medium",
    items: known,
    rationale: `Assumed typical Indian home-style prep (${known.join(", ")}) with medium portions.`,
    clarificationQuestions: [],
  };
}

export function parseItemsFromText(text: string): { items: string[]; isAmbiguous: boolean } {
  const lower = text.toLowerCase();
  const items = Object.keys(FOOD_DB).filter((food) => lower.includes(food));
  return { items, isAmbiguous: AMBIGUOUS_PATTERN.test(lower) || items.length === 0 };
}
