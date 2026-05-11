const ALLERGEN_MAP: Record<string, string[]> = {
  dairy: ["paneer", "curd", "milk", "butter", "ghee"],
  egg: ["egg", "omelette"],
  peanut: ["peanut", "groundnut"],
  gluten: ["roti", "naan", "bread"],
  fish: ["fish"],
};

export function checkAllergens(allergens: string[], foods: string[]): string[] {
  const lowerFoods = foods.map((f) => f.toLowerCase());
  const flags: string[] = [];

  for (const allergen of allergens.map((a) => a.toLowerCase())) {
    const triggers = ALLERGEN_MAP[allergen] ?? [allergen];
    if (triggers.some((t) => lowerFoods.some((food) => food.includes(t)))) {
      flags.push(`allergen:${allergen}`);
    }
  }

  return flags;
}
