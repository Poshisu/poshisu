export interface AllergenConflict {
  allergen: string;
  trigger: string;
  food: string;
}

const ALLERGEN_MAP: Record<string, string[]> = {
  dairy: ["paneer", "curd", "milk", "butter", "ghee", "cheese", "yogurt", "yoghurt", "lassi", "cream"],
  egg: ["egg", "eggs", "omelette", "mayonnaise"],
  peanut: ["peanut", "peanuts", "groundnut", "groundnuts"],
  groundnut: ["peanut", "peanuts", "groundnut", "groundnuts"],
  "tree-nut": ["almond", "almonds", "cashew", "cashews", "walnut", "walnuts", "pistachio", "hazelnut"],
  gluten: ["roti", "naan", "bread", "wheat", "atta", "chapati", "paratha", "pasta", "noodles"],
  fish: ["fish", "salmon", "tuna", "pomfret", "raw fish"],
  shellfish: ["prawn", "prawns", "shrimp", "crab", "lobster"],
  soy: ["soy", "soya", "tofu", "tempeh", "edamame"],
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isFalsePositive(allergen: string, trigger: string, food: string): boolean {
  if (allergen === "dairy" && trigger === "milk" && /\b(almond|coconut|oat|soy|soya) milk\b/.test(food)) {
    return true;
  }
  if (allergen === "egg" && trigger === "egg" && /\beggplant\b/.test(food)) {
    return true;
  }
  return false;
}

export function findAllergenConflicts(allergens: string[], foods: string[]): AllergenConflict[] {
  const lowerFoods = foods.map((food) => ({ raw: food, normalized: normalize(food) }));
  const conflicts: AllergenConflict[] = [];

  for (const allergen of allergens.map(normalize).filter(Boolean)) {
    const triggers = ALLERGEN_MAP[allergen] ?? [allergen];
    for (const trigger of triggers) {
      const matchedFood = lowerFoods.find(
        (food) => food.normalized.includes(trigger) && !isFalsePositive(allergen, trigger, food.normalized),
      );
      if (matchedFood) {
        conflicts.push({ allergen, trigger, food: matchedFood.raw });
        break;
      }
    }
  }

  return conflicts;
}

export function checkAllergens(allergens: string[], foods: string[]): string[] {
  return findAllergenConflicts(allergens, foods).map((conflict) => `allergen:${conflict.allergen}`);
}
