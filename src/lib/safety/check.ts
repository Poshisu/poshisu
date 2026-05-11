import { checkAllergens } from "@/lib/safety/allergens";
import { checkConditionConflicts } from "@/lib/safety/conditions";

export interface SafetyFlags {
  allergenFlags: string[];
  conditionFlags: string[];
}

export function evaluateMealSafety(input: {
  foods: string[];
  allergies: string[];
  conditions: string[];
}): SafetyFlags {
  return {
    allergenFlags: checkAllergens(input.allergies, input.foods),
    conditionFlags: checkConditionConflicts(input.conditions, input.foods),
  };
}
