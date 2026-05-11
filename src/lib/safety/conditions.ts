const CONDITION_MAP: Record<string, { avoid: string[]; reason: string }> = {
  "type-2-diabetes": { avoid: ["sugar", "dessert", "sweet"], reason: "high glycemic load" },
  hypertension: { avoid: ["pickle", "chips", "processed"], reason: "high sodium" },
  "pcos-pcod": { avoid: ["sugar", "dessert"], reason: "high added sugar" },
};

export function checkConditionConflicts(conditions: string[], foods: string[]): string[] {
  const lowerFoods = foods.map((f) => f.toLowerCase());
  const flags: string[] = [];

  for (const condition of conditions.map((c) => c.toLowerCase())) {
    const rule = CONDITION_MAP[condition];
    if (!rule) continue;
    if (rule.avoid.some((needle) => lowerFoods.some((food) => food.includes(needle)))) {
      flags.push(`condition:${condition}:${rule.reason}`);
    }
  }

  return flags;
}
