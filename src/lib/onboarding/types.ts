export type Gender = "female" | "male" | "non-binary" | "prefer-not-to-say";

export type PrimaryGoal = "lose-weight" | "gain-weight" | "maintain" | "manage-condition" | "wellness";

export type Condition =
  | "type-2-diabetes"
  | "type-1-diabetes"
  | "prediabetes"
  | "pcos-pcod"
  | "hypertension"
  | "high-cholesterol"
  | "thyroid"
  | "fatty-liver"
  | "ibs-gerd"
  | "kidney-disease"
  | "pregnancy-breastfeeding"
  | "other";

export type DietaryPattern = "veg" | "veg-egg" | "non-veg" | "vegan" | "jain" | "pescetarian" | "none";

export type EatingContext = "home" | "mixed" | "out" | "varies";

export type EstimationPreference = "conservative" | "midpoint" | "liberal";

export type MealTimes = {
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  snacks?: string;
};

export type OnboardingAnswers = {
  name: string;
  age: number;
  gender: Gender;
  height_cm: number;
  weight_kg: number;
  city?: string;
  primary_goal: PrimaryGoal;
  goal_target_kg?: number;
  goal_timeline_weeks?: number;
  conditions: Condition[];
  conditions_other?: string;
  medications_affecting_diet?: string;
  dietary_pattern: DietaryPattern;
  allergies: string[];
  dislikes?: string;
  meal_times: MealTimes;
  eating_context: EatingContext;
  estimation_preference: EstimationPreference;
};
