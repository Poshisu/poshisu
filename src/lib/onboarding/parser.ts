import { z } from "zod";
import type { OnboardingQuestionId } from "./questions";
import type {
  Allergy,
  Condition,
  DietaryPattern,
  EatingContext,
  EstimationPreference,
  Gender,
  MealTimes,
  OnboardingAnswers,
  OnboardingDraft,
  PrimaryGoal,
} from "./types";

/**
 * Result of attempting to parse one user answer for one question.
 *
 * `ok: true` — fields to merge into the draft; the wizard advances.
 * `ok: false` — clarification message to show as a follow-up agent bubble;
 *   the same question stays active.
 */
export type ParseResult =
  | { ok: true; fields: Partial<OnboardingAnswers> }
  | { ok: false; ask: string };

const SKIP_TOKENS = new Set(["skip", "none", "no", "nope", "n/a", "na"]);

/**
 * General-purpose normaliser for matchEnum and isSkip. Strips sentence
 * punctuation and replaces compound separators (slash) with spaces so
 * "she/her" matches "she her". Does NOT strip colons or apostrophes — those
 * have semantic meaning in time and height parsing, which should use the
 * raw input directly anyway.
 */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.!?;,]/g, "")
    .replace(/\//g, " ")
    .replace(/\s+/g, " ");
}

function isSkip(raw: string): boolean {
  return SKIP_TOKENS.has(normalise(raw));
}

/**
 * Extract the first integer from a string. Returns null when no digits.
 * Tolerates contexts like "I'm 34", "34 yrs old", "34kg".
 */
function extractFirstNumber(s: string): number | null {
  const match = s.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

/** Extract every number in a string, in order. */
function extractAllNumbers(s: string): number[] {
  return Array.from(s.matchAll(/-?\d+(?:\.\d+)?/g)).map((m) => Number(m[0]));
}

/**
 * Match a normalised user input against a {canonical: synonyms} map.
 * Returns the canonical key on first hit, null when nothing matches.
 *
 * Strategy: longer, more specific phrases first (so "veg + eggs" beats
 * "veg" when both are listed). We rely on the synonym lists being
 * curated in that order — no automatic length sort, because some short
 * synonyms (like "f" for female) would lose otherwise.
 */
function matchEnum<T extends string>(
  input: string,
  synonyms: ReadonlyArray<readonly [T, ReadonlyArray<string>]>,
): T | null {
  const n = normalise(input);
  for (const [canonical, syns] of synonyms) {
    for (const syn of syns) {
      if (n === syn) return canonical;
    }
  }
  // Second pass: substring match for verbose answers like "I'd say female".
  for (const [canonical, syns] of synonyms) {
    for (const syn of syns) {
      if (n.includes(syn)) return canonical;
    }
  }
  return null;
}

const GENDER_SYNONYMS: ReadonlyArray<readonly [Gender, ReadonlyArray<string>]> = [
  ["prefer-not-to-say", ["prefer not to say", "rather not say", "skip", "decline"]],
  ["non-binary", ["non binary", "non-binary", "nonbinary", "nb", "enby", "they them"]],
  ["female", ["female", "woman", "girl", "she her", "f"]],
  ["male", ["male", "man", "boy", "he him", "m"]],
];

const PRIMARY_GOAL_SYNONYMS: ReadonlyArray<readonly [PrimaryGoal, ReadonlyArray<string>]> = [
  ["lose-weight", ["lose weight", "weight loss", "slim down", "reduce weight", "lose"]],
  ["gain-weight", ["gain weight", "build muscle", "bulk", "weight gain", "muscle"]],
  ["manage-condition", ["manage a condition", "manage condition", "manage", "health condition"]],
  ["wellness", ["wellness", "general wellness", "more energy", "feel better", "energy", "vitality"]],
  ["maintain", ["maintain", "eat better", "balance", "balanced", "improve diet", "improve eating"]],
];

const DIETARY_SYNONYMS: ReadonlyArray<readonly [DietaryPattern, ReadonlyArray<string>]> = [
  ["veg-egg", ["veg + eggs", "veg with eggs", "veg + egg", "veg with egg", "ovo veg", "ovo vegetarian", "eggetarian"]],
  ["pescetarian", ["pescetarian", "pescatarian", "fish only", "veg + fish"]],
  ["vegan", ["vegan", "plant based", "plant-based"]],
  ["jain", ["jain"]],
  ["non-veg", ["non veg", "non-veg", "nonveg", "non-vegetarian", "non vegetarian", "meat eater", "meat", "carnivore"]],
  ["veg", ["vegetarian", "veg", "veggie"]],
  ["none", ["no restrictions", "anything", "everything", "all", "no preference"]],
];

const EATING_CONTEXT_SYNONYMS: ReadonlyArray<readonly [EatingContext, ReadonlyArray<string>]> = [
  ["home", ["mostly cook", "cook at home", "home", "cooking", "homemade"]],
  ["out", ["mostly order", "order in", "eat out", "delivery", "swiggy", "zomato", "restaurants"]],
  ["mixed", ["mix", "mixed", "both", "sometimes", "in between"]],
  ["varies", ["varies", "varies a lot", "depends", "no pattern", "all over"]],
];

const ESTIMATION_SYNONYMS: ReadonlyArray<readonly [EstimationPreference, ReadonlyArray<string>]> = [
  ["conservative", ["conservative", "lower", "low", "lower side"]],
  ["liberal", ["liberal", "higher", "high", "higher side", "safety margin"]],
  ["midpoint", ["midpoint", "middle", "default", "best guess", "in the middle"]],
];

const CONDITION_SYNONYMS: ReadonlyArray<readonly [Condition, ReadonlyArray<string>]> = [
  ["t2-diabetes", ["type 2 diabetes", "type 2", "t2 diabetes", "t2d", "t2", "diabetes type 2", "diabetes"]],
  ["t1-diabetes", ["type 1 diabetes", "type 1", "t1 diabetes", "t1d", "t1"]],
  ["prediabetes", ["prediabetes", "pre diabetes", "pre-diabetes", "borderline diabetes", "borderline"]],
  ["pcos", ["pcos", "pcod"]],
  ["hypertension", ["hypertension", "high bp", "high blood pressure", "blood pressure", "bp"]],
  ["high-cholesterol", ["high cholesterol", "cholesterol"]],
  ["thyroid", ["thyroid", "hypothyroid", "hyperthyroid", "hashimoto", "hashimotos"]],
  ["fatty-liver", ["fatty liver", "nafld"]],
  ["ibs-gerd", ["ibs", "gerd", "ibs/gerd", "ibs gerd", "acidity", "acid reflux", "reflux"]],
  ["kidney-disease", ["kidney disease", "kidney", "ckd", "renal disease", "renal"]],
  ["pregnancy", ["pregnant", "pregnancy", "expecting", "breastfeeding", "nursing"]],
];

const ALLERGY_SYNONYMS: ReadonlyArray<readonly [Allergy, ReadonlyArray<string>]> = [
  ["tree-nuts", ["tree nuts", "tree-nuts", "almond", "cashew", "walnut", "pistachio"]],
  ["peanuts", ["peanut", "peanuts", "groundnut", "groundnuts"]],
  ["shellfish", ["shellfish", "shrimp", "prawn", "prawns", "crab", "lobster"]],
  ["dairy", ["dairy", "milk", "lactose", "cheese"]],
  ["wheat", ["wheat", "gluten"]],
  ["sesame", ["sesame", "til"]],
  ["eggs", ["egg", "eggs"]],
  ["soy", ["soy", "soya"]],
  ["fish", ["fish"]],
];

/** Split a user reply into multi-select tokens. */
function splitMulti(s: string): string[] {
  return s
    .split(/,|\band\b|\bor\b|\+|\//gi)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function parseConditionsList(raw: string): { conditions: Condition[]; conditions_other?: string } {
  const tokens = splitMulti(raw);
  const matched: Condition[] = [];
  const unmatched: string[] = [];
  for (const t of tokens) {
    const m = matchEnum(t, CONDITION_SYNONYMS);
    if (m) {
      if (!matched.includes(m)) matched.push(m);
    } else if (!isSkip(t)) {
      unmatched.push(t.trim());
    }
  }
  if (unmatched.length > 0) {
    return { conditions: [...matched, "other"], conditions_other: unmatched.join(", ") };
  }
  return { conditions: matched };
}

function parseAllergiesList(raw: string): { allergies: Allergy[]; allergies_other?: string[] } {
  const tokens = splitMulti(raw);
  const matched: Allergy[] = [];
  const unmatched: string[] = [];
  for (const t of tokens) {
    const m = matchEnum(t, ALLERGY_SYNONYMS);
    if (m) {
      if (!matched.includes(m)) matched.push(m);
    } else if (!isSkip(t)) {
      unmatched.push(t.trim());
    }
  }
  if (unmatched.length > 0) {
    return { allergies: [...matched, "other"], allergies_other: unmatched };
  }
  return { allergies: matched };
}

/**
 * Parse a time expression into 24h "HH:MM". Accepts:
 *   "8", "8am", "8 am", "8:30", "8:30am", "8pm", "20:00", "20", "8.30 pm"
 * Returns null when nothing parseable is found.
 */
function parseTime(raw: string): string | null {
  // Don't run through `normalise` — it would strip the `:` and merge
  // "08:00" into "0800", which breaks minute extraction.
  const n = raw.toLowerCase().trim();
  const m = n.match(/(\d{1,2})(?:[:.](\d{1,2}))?\s*(am|pm)?/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  const meridiem = m[3];
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const MEAL_TIME_PRESETS: Record<string, MealTimes> = {
  standard: { breakfast: "08:00", lunch: "13:00", dinner: "20:00" },
  "early riser": { breakfast: "07:00", lunch: "12:00", dinner: "19:00" },
  "late riser": { breakfast: "10:00", lunch: "14:00", dinner: "21:00" },
};

function parseMealTimes(raw: string): MealTimes | null {
  const n = normalise(raw);
  for (const [key, preset] of Object.entries(MEAL_TIME_PRESETS)) {
    if (n.startsWith(key) || n.includes(key)) return preset;
  }
  if (n.includes("custom")) return null; // user wants to specify, prompt them again
  // Try to extract three times in order: breakfast, lunch, dinner.
  // Split on commas / "and" / slash.
  const tokens = splitMulti(raw);
  const times = tokens.map((t) => parseTime(t)).filter((t): t is string => t !== null);
  if (times.length >= 3) {
    return { breakfast: times[0], lunch: times[1], dinner: times[2], snacks: times[3] };
  }
  return null;
}

/**
 * Parse one answer for a specific question.
 *
 * Returns either successful field merges (caller advances the wizard) or
 * a clarification message (caller keeps the question active).
 */
export function parseAnswer(
  questionId: OnboardingQuestionId,
  raw: string,
  draft: OnboardingDraft,
): ParseResult {
  const trimmed = raw.trim();

  switch (questionId) {
    case "name": {
      const n = trimmed.replace(/^(my name is|i'?m|i am|call me)\s+/i, "").trim();
      if (!n) return { ok: false, ask: "What should I call you?" };
      if (n.length > 60) return { ok: false, ask: "Maybe shorter? Up to 60 characters." };
      return { ok: true, fields: { name: n } };
    }

    case "age": {
      const num = extractFirstNumber(trimmed);
      if (num === null) return { ok: false, ask: "Just a number works — how old are you?" };
      if (num < 13 || num > 100) return { ok: false, ask: "I can only support ages 13–100." };
      return { ok: true, fields: { age: Math.round(num) } };
    }

    case "gender": {
      const g = matchEnum(trimmed, GENDER_SYNONYMS);
      if (!g) return { ok: false, ask: "Female, male, non-binary, or prefer not to say?" };
      return { ok: true, fields: { gender: g } };
    }

    case "height_cm": {
      // Use the raw lowercased input — `normalise` strips slashes which is
      // fine, but we also need to keep the `'` literal here for the
      // feet-and-inches pattern below.
      const n = trimmed.toLowerCase();
      const ftIn = n.match(/(\d+)\s*(?:'|ft|feet|foot)\s*(\d+)?/);
      if (ftIn) {
        const ft = Number(ftIn[1]);
        const inch = ftIn[2] ? Number(ftIn[2]) : 0;
        const cm = Math.round((ft * 12 + inch) * 2.54);
        if (cm < 100 || cm > 250) return { ok: false, ask: "That height doesn't look right — try again in cm?" };
        return { ok: true, fields: { height_cm: cm } };
      }
      const num = extractFirstNumber(trimmed);
      if (num === null) return { ok: false, ask: "Just a number in centimetres works — how tall?" };
      if (num < 100 || num > 250) return { ok: false, ask: "Height should be between 100 and 250 cm." };
      return { ok: true, fields: { height_cm: Math.round(num) } };
    }

    case "weight_kg": {
      const n = normalise(trimmed);
      // Pounds: "150 lb", "150 pounds"
      const lbsMatch = n.match(/(\d+(?:\.\d+)?)\s*(lb|lbs|pound|pounds)/);
      if (lbsMatch) {
        const kg = Math.round(Number(lbsMatch[1]) * 0.453592 * 10) / 10;
        if (kg < 25 || kg > 250) return { ok: false, ask: "That weight doesn't look right — try again in kg?" };
        return { ok: true, fields: { weight_kg: kg } };
      }
      const num = extractFirstNumber(trimmed);
      if (num === null) return { ok: false, ask: "Just a number in kg works — current weight?" };
      if (num < 25 || num > 250) return { ok: false, ask: "Weight should be between 25 and 250 kg." };
      return { ok: true, fields: { weight_kg: Math.round(num * 10) / 10 } };
    }

    case "city": {
      if (isSkip(trimmed)) return { ok: true, fields: {} };
      const c = trimmed.replace(/^(i'?m in|in)\s+/i, "").trim();
      if (c.length > 100) return { ok: false, ask: "Just the city name is enough." };
      return { ok: true, fields: { city: c } };
    }

    case "primary_goal": {
      const g = matchEnum(trimmed, PRIMARY_GOAL_SYNONYMS);
      if (!g) return { ok: false, ask: "Lose weight, build muscle, eat better, manage a condition, or more energy?" };
      return { ok: true, fields: { primary_goal: g } };
    }

    case "goal_target_and_timeline": {
      const nums = extractAllNumbers(trimmed);
      const n = normalise(trimmed);
      // Heuristic: first number with kg context = target; first with weeks/months/year = timeline.
      let target: number | undefined;
      let weeks: number | undefined;

      if (n.includes("kg")) {
        const kgMatch = n.match(/(-?\d+(?:\.\d+)?)\s*kg/);
        if (kgMatch) target = Number(kgMatch[1]);
      }
      if (n.includes("month")) {
        const m = n.match(/(\d+)\s*month/);
        if (m) weeks = Number(m[1]) * 4;
      } else if (n.includes("year")) {
        const y = n.match(/(\d+)\s*year/);
        if (y) weeks = Number(y[1]) * 52;
      } else if (n.includes("week")) {
        const w = n.match(/(\d+)\s*week/);
        if (w) weeks = Number(w[1]);
      }

      if (target === undefined && nums.length >= 1 && nums[0] >= 25 && nums[0] <= 250) {
        target = nums[0];
      }
      if (weeks === undefined && nums.length >= 2) {
        weeks = nums[1];
      }

      if (target === undefined) {
        return { ok: false, ask: "What weight in kg are you aiming for?" };
      }
      if (target < 25 || target > 250) {
        return { ok: false, ask: "That target weight doesn't look right — between 25 and 250 kg?" };
      }
      if (weeks === undefined) {
        return { ok: false, ask: `Got the ${target} kg target. Roughly how many weeks?` };
      }
      if (weeks < 1 || weeks > 104) {
        return { ok: false, ask: "Anywhere from 1 week up to 2 years (104 weeks) works." };
      }

      return { ok: true, fields: { goal_target_kg: target, goal_timeline_weeks: weeks } };
    }

    case "conditions": {
      if (isSkip(trimmed) || /^no(ne|thing)?$/i.test(trimmed)) {
        return { ok: true, fields: { conditions: [] } };
      }
      const result = parseConditionsList(trimmed);
      // Catch a sole "other" with an unmatched single-word answer that's
      // probably a typo — invite a re-try.
      if (result.conditions.length === 1 && result.conditions[0] === "other") {
        return {
          ok: false,
          ask: "I didn't recognise that — say 'none', or pick from PCOS, diabetes, hypertension, high cholesterol, thyroid.",
        };
      }
      return { ok: true, fields: result };
    }

    case "medications": {
      if (isSkip(trimmed)) return { ok: true, fields: {} };
      if (trimmed.length > 200) return { ok: false, ask: "Keep it brief — what's the main medication?" };
      return { ok: true, fields: { medications: trimmed } };
    }

    case "dietary_pattern": {
      const d = matchEnum(trimmed, DIETARY_SYNONYMS);
      if (!d) {
        return {
          ok: false,
          ask: "Vegetarian, veg + eggs, non-veg, vegan, jain, or no restrictions?",
        };
      }
      return { ok: true, fields: { dietary_pattern: d } };
    }

    case "allergies": {
      if (isSkip(trimmed) || /^no(ne|thing)?$/i.test(trimmed)) {
        return { ok: true, fields: { allergies: [] } };
      }
      const result = parseAllergiesList(trimmed);
      if (result.allergies.length === 1 && result.allergies[0] === "other") {
        return {
          ok: false,
          ask: "I didn't catch that — say 'none', or list any of peanuts, dairy, gluten, tree nuts, eggs, soy, shellfish, fish, sesame.",
        };
      }
      return { ok: true, fields: result };
    }

    case "dislikes": {
      if (isSkip(trimmed)) return { ok: true, fields: {} };
      if (trimmed.length > 300) return { ok: false, ask: "Keep it short — a few key dislikes." };
      return { ok: true, fields: { dislikes: trimmed } };
    }

    case "meal_times": {
      const times = parseMealTimes(trimmed);
      if (!times) {
        return {
          ok: false,
          ask: "Pick a pattern (Standard / Early riser / Late riser) or tell me your usual breakfast, lunch, and dinner times.",
        };
      }
      return { ok: true, fields: { meal_times: times } };
    }

    case "eating_context": {
      const c = matchEnum(trimmed, EATING_CONTEXT_SYNONYMS);
      if (!c) {
        return { ok: false, ask: "Mostly cook, mostly order, a mix, or it varies a lot?" };
      }
      return { ok: true, fields: { eating_context: c } };
    }

    case "estimation_preference": {
      const e = matchEnum(trimmed, ESTIMATION_SYNONYMS);
      if (!e) return { ok: false, ask: "Conservative, midpoint, or liberal?" };
      return { ok: true, fields: { estimation_preference: e } };
    }
  }

  // Should be unreachable — exhaustive switch above.
  // Type narrowing in TS proves we hit every case, but at runtime an
  // unknown id should fail loudly during dev.
  void draft;
  throw new Error(`Unhandled question id: ${questionId}`);
}

/**
 * Final validator for a complete `OnboardingAnswers` object — used by
 * the server action before calling the parser agent. Mirrors the
 * per-question parser ranges so a draft passing both validators is
 * trivially safe to send onward.
 */
export const onboardingAnswersSchema = z.object({
  name: z.string().trim().min(1).max(60),
  age: z.number().int().min(13).max(100),
  gender: z.enum(["female", "male", "non-binary", "prefer-not-to-say"]),
  height_cm: z.number().min(100).max(250),
  weight_kg: z.number().min(25).max(250),
  city: z.string().trim().max(100).optional(),
  primary_goal: z.enum(["lose-weight", "gain-weight", "maintain", "manage-condition", "wellness"]),
  goal_target_kg: z.number().min(25).max(250).optional(),
  goal_timeline_weeks: z.number().min(1).max(104).optional(),
  conditions: z.array(
    z.enum([
      "t2-diabetes",
      "t1-diabetes",
      "prediabetes",
      "pcos",
      "hypertension",
      "high-cholesterol",
      "thyroid",
      "fatty-liver",
      "ibs-gerd",
      "kidney-disease",
      "pregnancy",
      "other",
    ]),
  ),
  conditions_other: z.string().max(300).optional(),
  medications: z.string().max(200).optional(),
  dietary_pattern: z.enum(["veg", "veg-egg", "non-veg", "vegan", "jain", "pescetarian", "none"]),
  allergies: z.array(
    z.enum(["peanuts", "tree-nuts", "dairy", "eggs", "wheat", "soy", "shellfish", "fish", "sesame", "other"]),
  ),
  allergies_other: z.array(z.string()).optional(),
  dislikes: z.string().max(300).optional(),
  meal_times: z.object({
    breakfast: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    lunch: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    dinner: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    snacks: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }),
  eating_context: z.enum(["home", "mixed", "out", "varies"]),
  estimation_preference: z.enum(["conservative", "midpoint", "liberal"]),
}) satisfies z.ZodType<OnboardingAnswers>;

export type ValidatedOnboardingAnswers = z.infer<typeof onboardingAnswersSchema>;
