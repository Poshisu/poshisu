import { checkAllergens, findAllergenConflicts } from "@/lib/safety/allergens";
import { checkConditionConflicts, findConditionConflicts } from "@/lib/safety/conditions";

export interface SafetyFlags {
  allergenFlags: string[];
  conditionFlags: string[];
  blocked: boolean;
  blockingReasons: string[];
  safeAlternatives: string[];
}

const DEFAULT_SAFE_ALTERNATIVES = ["plain dal", "grilled chicken", "tofu bhurji", "cucumber salad", "plain rice"];
const DAIRY_PATTERN = /paneer|curd|milk|butter|ghee|cheese|yogurt|yoghurt|lassi|cream/i;
const SUGAR_OR_SODIUM_PATTERN = /pickle|sweet|sugar|jaggery|honey|juice|papad|chips|processed|salted|namkeen|bhujiya/i;

function buildSafeAlternatives(input: { allergies: string[]; conditions: string[] }): string[] {
  const avoidDairy = input.allergies.some((allergy) => allergy.toLowerCase().trim() === "dairy");
  const avoidSoy = input.allergies.some((allergy) => ["soy", "soya"].includes(allergy.toLowerCase().trim()));
  const avoidChicken = input.conditions.some((condition) => condition.toLowerCase().trim() === "pregnancy-breastfeeding");
  const avoidSugarOrSodium = input.conditions.some((condition) =>
    ["type-1-diabetes", "type-2-diabetes", "prediabetes", "pcos-pcod", "hypertension", "kidney-disease"].includes(
      condition.toLowerCase().trim(),
    ),
  );

  return DEFAULT_SAFE_ALTERNATIVES.filter((alternative) => {
    if (avoidDairy && DAIRY_PATTERN.test(alternative)) return false;
    if (avoidSoy && /tofu|soy|soya|tempeh/i.test(alternative)) return false;
    if (avoidChicken && /chicken/i.test(alternative)) return false;
    if (avoidSugarOrSodium && SUGAR_OR_SODIUM_PATTERN.test(alternative)) return false;
    return (
      findAllergenConflicts(input.allergies, [alternative]).length === 0 &&
      findConditionConflicts(input.conditions, [alternative]).length === 0
    );
  });
}

export function evaluateMealSafety(input: {
  foods: string[];
  allergies: string[];
  conditions: string[];
}): SafetyFlags {
  const allergenFlags = checkAllergens(input.allergies, input.foods);
  const conditionFlags = checkConditionConflicts(input.conditions, input.foods);
  const allergenConflicts = findAllergenConflicts(input.allergies, input.foods);
  const conditionConflicts = findConditionConflicts(input.conditions, input.foods);
  const blockingReasons = [
    ...allergenConflicts.map(
      (conflict) => `${conflict.food} conflicts with declared ${conflict.allergen} allergy via ${conflict.trigger}.`,
    ),
    ...conditionConflicts.map(
      (conflict) => `${conflict.food} conflicts with ${conflict.condition} guidance: ${conflict.reason}.`,
    ),
  ];

  return {
    allergenFlags,
    conditionFlags,
    blocked: blockingReasons.length > 0,
    blockingReasons,
    safeAlternatives: blockingReasons.length > 0 ? buildSafeAlternatives(input) : [],
  };
}
