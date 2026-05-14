export interface ConditionConflict {
  condition: string;
  reason: string;
  trigger: string;
  food: string;
}

const CONDITION_MAP: Record<string, { avoid: string[]; reason: string }> = {
  "type-2-diabetes": {
    avoid: ["sugar", "dessert", "sweet", "jaggery", "honey", "juice", "lassi", "soda"],
    reason: "high glycemic load",
  },
  "type-1-diabetes": {
    avoid: ["sugar", "dessert", "sweet", "jaggery", "honey", "juice", "lassi", "soda"],
    reason: "high glycemic load",
  },
  prediabetes: {
    avoid: ["sugar", "dessert", "sweet", "jaggery", "honey", "juice", "lassi", "soda"],
    reason: "high glycemic load",
  },
  hypertension: {
    avoid: ["pickle", "chips", "processed", "papad", "salted", "namkeen", "bhujiya", "instant noodles"],
    reason: "high sodium",
  },
  "high-cholesterol": {
    avoid: ["fried", "butter", "ghee", "cream", "processed meat"],
    reason: "high saturated fat",
  },
  "fatty-liver": {
    avoid: ["alcohol", "sugar", "dessert", "sweet", "juice"],
    reason: "fatty liver risk",
  },
  "kidney-disease": {
    avoid: ["pickle", "papad", "processed", "salted", "banana", "fruit juice", "juice"],
    reason: "renal diet risk",
  },
  "pregnancy-breastfeeding": {
    avoid: ["alcohol", "raw fish", "unpasteurized", "undercooked"],
    reason: "pregnancy food safety risk",
  },
  "ibs-gerd": {
    avoid: ["spicy", "chilli", "fried", "coffee", "carbonated"],
    reason: "reflux or gut trigger",
  },
  "pcos-pcod": { avoid: ["sugar", "dessert", "sweet", "juice"], reason: "high added sugar" },
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function findConditionConflicts(conditions: string[], foods: string[]): ConditionConflict[] {
  const lowerFoods = foods.map((food) => ({ raw: food, normalized: normalize(food) }));
  const conflicts: ConditionConflict[] = [];

  for (const condition of conditions.map(normalize).filter(Boolean)) {
    const rule = CONDITION_MAP[condition];
    if (!rule) continue;
    const matchedTrigger = rule.avoid.find((needle) => lowerFoods.some((food) => food.normalized.includes(needle)));
    if (!matchedTrigger) continue;
    const matchedFood = lowerFoods.find((food) => food.normalized.includes(matchedTrigger));
    conflicts.push({ condition, reason: rule.reason, trigger: matchedTrigger, food: matchedFood?.raw ?? matchedTrigger });
  }

  return conflicts;
}

export function checkConditionConflicts(conditions: string[], foods: string[]): string[] {
  return findConditionConflicts(conditions, foods).map(
    (conflict) => `condition:${conflict.condition}:${conflict.reason}`,
  );
}
