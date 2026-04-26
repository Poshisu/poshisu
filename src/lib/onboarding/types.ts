/**
 * Canonical types for the Nourish onboarding flow.
 *
 * Mirrors the `OnboardingAnswers` shape defined in `docs/ONBOARDING_FLOW.md`.
 * The Onboarding Parser agent (`prompts/agents/ONBOARDING_PARSER.md`) takes
 * an `OnboardingAnswers` JSON object and produces a markdown profile.
 */

export type Gender = "female" | "male" | "non-binary" | "prefer-not-to-say";

export type PrimaryGoal =
  | "lose-weight"
  | "gain-weight"
  | "maintain"
  | "manage-condition"
  | "wellness";

export type Condition =
  | "t2-diabetes"
  | "t1-diabetes"
  | "prediabetes"
  | "pcos"
  | "hypertension"
  | "high-cholesterol"
  | "thyroid"
  | "fatty-liver"
  | "ibs-gerd"
  | "kidney-disease"
  | "pregnancy"
  | "other";

export type DietaryPattern =
  | "veg"
  | "veg-egg"
  | "non-veg"
  | "vegan"
  | "jain"
  | "pescetarian"
  | "none";

export type Allergy =
  | "peanuts"
  | "tree-nuts"
  | "dairy"
  | "eggs"
  | "wheat"
  | "soy"
  | "shellfish"
  | "fish"
  | "sesame"
  | "other";

export type EatingContext = "home" | "mixed" | "out" | "varies";

export type EstimationPreference = "conservative" | "midpoint" | "liberal";

/**
 * Times in 24-hour `HH:MM` format. All keys optional — a user might not
 * eat lunch, snack, etc.
 */
export interface MealTimes {
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  snacks?: string;
}

export interface OnboardingAnswers {
  // Step 1 — Basics
  name: string;
  age: number;
  gender: Gender;

  // Step 2 — Body
  height_cm: number;
  weight_kg: number;
  city?: string;

  // Step 3 — Goal
  primary_goal: PrimaryGoal;
  goal_target_kg?: number;
  goal_timeline_weeks?: number;

  // Step 4 — Medical
  conditions: Condition[];
  conditions_other?: string;
  medications?: string;

  // Step 5 — Diet
  dietary_pattern: DietaryPattern;
  allergies: Allergy[];
  allergies_other?: string[];
  dislikes?: string;

  // Step 6 — How you eat
  meal_times: MealTimes;
  eating_context: EatingContext;
  estimation_preference: EstimationPreference;
}

/**
 * Partial answers state during the wizard. Each question fills in one or
 * more fields. The final submitted state must validate as a full
 * `OnboardingAnswers`.
 */
export type OnboardingDraft = Partial<OnboardingAnswers>;
