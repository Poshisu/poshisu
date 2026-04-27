import type {
  Allergy,
  Condition,
  DietaryPattern,
  EatingContext,
  EstimationPreference,
  Gender,
  MealTimes,
  OnboardingAnswers,
  PrimaryGoal,
} from "./types";

/**
 * Deterministic profile.md generator. Used when the Onboarding Parser
 * agent is unavailable (Claude down, rate limited, returned malformed
 * output). Produces the same canonical format documented in
 * `prompts/agents/ONBOARDING_PARSER.md` so downstream agents that read
 * `memories.profile.main` can't tell the two apart at the markdown level.
 *
 * This is intentionally simple — no LLM, no decisions, just a typed
 * mapping from answers to formatted text. Easy to unit-test, easy to
 * audit, and survives any agent outage.
 */

function gender(g: Gender): string {
  switch (g) {
    case "female":
      return "Female";
    case "male":
      return "Male";
    case "non-binary":
      return "Non-binary";
    case "prefer-not-to-say":
      return "Prefer not to say";
  }
}

function primaryGoal(p: PrimaryGoal): string {
  switch (p) {
    case "lose-weight":
      return "Lose weight";
    case "gain-weight":
      return "Gain weight / build muscle";
    case "maintain":
      return "Maintain weight, eat better";
    case "manage-condition":
      return "Manage a health condition";
    case "wellness":
      return "General wellness and energy";
  }
}

function dietaryPattern(d: DietaryPattern): string {
  switch (d) {
    case "veg":
      return "Vegetarian";
    case "veg-egg":
      return "Vegetarian + eggs";
    case "non-veg":
      return "Non-vegetarian";
    case "vegan":
      return "Vegan";
    case "jain":
      return "Jain";
    case "pescetarian":
      return "Pescetarian";
    case "none":
      return "No restrictions";
  }
}

function eatingContext(c: EatingContext): string {
  switch (c) {
    case "home":
      return "Mostly cooks at home";
    case "mixed":
      return "Mix of home cooking and ordering in";
    case "out":
      return "Mostly orders in or eats out";
    case "varies":
      return "Varies a lot week to week";
  }
}

function estimationPreference(e: EstimationPreference): { label: string; explanation: string } {
  switch (e) {
    case "conservative":
      return {
        label: "Conservative",
        explanation: "lean toward lower estimates — better for tracking weight loss",
      };
    case "midpoint":
      return { label: "Midpoint", explanation: "best guess in the middle of the range" };
    case "liberal":
      return {
        label: "Liberal",
        explanation: "lean toward higher estimates — better for safety margin",
      };
  }
}

function conditionLabel(c: Condition): string {
  switch (c) {
    case "t2-diabetes":
      return "Type 2 diabetes";
    case "t1-diabetes":
      return "Type 1 diabetes";
    case "prediabetes":
      return "Prediabetes";
    case "pcos":
      return "PCOS";
    case "hypertension":
      return "Hypertension";
    case "high-cholesterol":
      return "High cholesterol";
    case "thyroid":
      return "Thyroid";
    case "fatty-liver":
      return "Fatty liver";
    case "ibs-gerd":
      return "IBS / GERD";
    case "kidney-disease":
      return "Kidney disease";
    case "pregnancy":
      return "Pregnancy / breastfeeding";
    case "other":
      return "Other";
  }
}

/**
 * Per-condition handling notes — drawn from prompts/agents/SAFETY_RULES.md.
 * Each entry is one short sentence the agent reads before responding.
 */
function conditionNote(c: Condition): string {
  switch (c) {
    case "t2-diabetes":
    case "t1-diabetes":
    case "prediabetes":
      return "Diabetes — flag high-carb / sugar meals; recommend high-fiber and protein.";
    case "pcos":
      return "PCOS — prefer low-glycemic, high-protein, high-fiber options. Flag refined carbs.";
    case "hypertension":
      return "Hypertension — flag high-sodium meals; recommend potassium-rich foods.";
    case "high-cholesterol":
      return "High cholesterol — flag saturated and trans fats; encourage soluble fibre and omega-3.";
    case "thyroid":
      return "Thyroid — note caution around large amounts of raw cruciferous vegetables and soy near medication time.";
    case "fatty-liver":
      return "Fatty liver — flag fructose-heavy and deep-fried meals; encourage coffee, leafy greens, lean protein.";
    case "ibs-gerd":
      return "IBS / GERD — flag spicy, acidic, fried, or large meals close to bedtime; avoid imposing low-FODMAP unless asked.";
    case "kidney-disease":
      return "Kidney disease — flag high-potassium and high-phosphorus foods; strongly recommend a renal dietitian.";
    case "pregnancy":
      return "Pregnancy — flag raw fish, undercooked eggs, unpasteurised dairy, high-mercury fish, alcohol; never recommend extreme restriction.";
    case "other":
      return "Other condition declared — handle conservatively, consider professional guidance.";
  }
}

function allergyLabel(a: Allergy): string {
  switch (a) {
    case "peanuts":
      return "Peanuts";
    case "tree-nuts":
      return "Tree nuts";
    case "dairy":
      return "Dairy";
    case "eggs":
      return "Eggs";
    case "wheat":
      return "Wheat / gluten";
    case "soy":
      return "Soy";
    case "shellfish":
      return "Shellfish";
    case "fish":
      return "Fish";
    case "sesame":
      return "Sesame";
    case "other":
      return "Other";
  }
}

function mealTimesLine(label: string, time: string | undefined): string {
  return `  - ${label}: ${time ?? "Not typical"}`;
}

function mealTimesBlock(times: MealTimes): string {
  return [
    mealTimesLine("Breakfast", times.breakfast),
    mealTimesLine("Lunch", times.lunch),
    mealTimesLine("Dinner", times.dinner),
    mealTimesLine("Snacks", times.snacks),
  ].join("\n");
}

function isoDateUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export interface BuildProfileOpts {
  /** ISO date (YYYY-MM-DD) to stamp on the profile. Defaults to today UTC. */
  date?: string;
}

/**
 * Build the canonical profile.md body from a validated OnboardingAnswers.
 *
 * Output structure mirrors `prompts/agents/ONBOARDING_PARSER.md` exactly,
 * so downstream agents that read `memories.profile.main` get an identical
 * surface whether the agent or this template generated it.
 */
export function buildProfileMarkdown(answers: OnboardingAnswers, opts: BuildProfileOpts = {}): string {
  const date = opts.date ?? isoDateUtc();

  const allergiesList =
    answers.allergies.length === 0
      ? "None declared"
      : answers.allergies
          .filter((a) => a !== "other")
          .map(allergyLabel)
          .concat(answers.allergies_other ?? [])
          .join(", ");

  const conditionsList =
    answers.conditions.length === 0
      ? "None declared"
      : answers.conditions
          .filter((c) => c !== "other")
          .map(conditionLabel)
          .concat(answers.conditions_other ? [`Other: ${answers.conditions_other}`] : [])
          .join(", ");

  const targetLine =
    answers.goal_target_kg !== undefined
      ? `**Target:** ${answers.goal_target_kg} kg`
      : `**Target:** Not specified`;
  const timelineLine =
    answers.goal_timeline_weeks !== undefined
      ? `**Timeline:** ${answers.goal_timeline_weeks} weeks`
      : `**Timeline:** Open-ended`;

  const estimation = estimationPreference(answers.estimation_preference);

  const conditionNotes: string[] = answers.conditions
    .filter((c) => c !== "other")
    .map((c) => `- **${conditionLabel(c)}:** ${conditionNote(c)}`);
  if (answers.conditions_other) {
    conditionNotes.push(`- **Other condition declared:** ${answers.conditions_other} — handle conservatively, consider professional guidance.`);
  }
  const conditionNotesBlock =
    conditionNotes.length > 0 ? `\n${conditionNotes.join("\n")}` : "\n- No condition-specific notes.";

  const allergyEnforcementLine =
    answers.allergies.length === 0
      ? "- **Allergy enforcement:** No allergies declared. If the user mentions one later, update the profile and treat it as hard."
      : `- **Allergy enforcement:** Hard. Never recommend or include any food containing ${allergiesList}. Watch for cross-contamination in restaurant meals.`;

  return `# Profile for ${answers.name}

_Created: ${date}_

## Basics
- **Name:** ${answers.name}
- **Age:** ${answers.age}
- **Gender:** ${gender(answers.gender)}
- **Height:** ${answers.height_cm} cm
- **Weight:** ${answers.weight_kg} kg
- **City:** ${answers.city ?? "Not specified"}

## Goal
- **Primary goal:** ${primaryGoal(answers.primary_goal)}
- ${targetLine}
- ${timelineLine}

## Medical
- **Conditions:** ${conditionsList}
- **Medications affecting diet:** ${answers.medications ?? "None declared"}

## Diet
- **Pattern:** ${dietaryPattern(answers.dietary_pattern)}
- **Allergies:** ${allergiesList} ⚠️
- **Dislikes:** ${answers.dislikes ?? "None specified"}

## Eating context
- **Typical meal times:**
${mealTimesBlock(answers.meal_times)}
- **Eating context:** ${eatingContext(answers.eating_context)}

## Preferences
- **Estimation preference:** ${estimation.label} (${estimation.explanation})
- **Nudge tone:** Friendly (default — can be changed)

## Notes for the agents
${allergyEnforcementLine}${conditionNotesBlock}
`;
}

/**
 * Cheap structural validator — returns true when a markdown string looks
 * like our canonical profile.md. Used by the server action to detect a
 * malformed agent output and fall back to the template.
 *
 * We deliberately don't parse the markdown — just check that the
 * load-bearing sections are present in the right rough shape. A passing
 * check doesn't guarantee correctness; it guarantees "good enough that
 * downstream readers won't crash".
 */
export function isValidProfileMarkdown(md: string): boolean {
  if (typeof md !== "string" || md.length < 200) return false;
  const required = [
    /^#\s+Profile for\s+\S/m,
    /^##\s+Basics/m,
    /^##\s+Goal/m,
    /^##\s+Medical/m,
    /^##\s+Diet/m,
    /^##\s+Eating context/m,
    /^##\s+Preferences/m,
    /^##\s+Notes for the agents/m,
  ];
  return required.every((re) => re.test(md));
}

/**
 * Defence against prompt-injected agent output that strips or weakens
 * safety-critical content. Verifies that:
 *
 *   1. If the user declared any allergies, the "Notes for the agents"
 *      section enforces them as a hard constraint AND mentions every
 *      declared allergy by its display label (e.g. "Peanuts", "Tree nuts").
 *   2. If the user declared any conditions, the same section mentions
 *      each by its display label.
 *
 * Why this matters: a hostile user could craft a free-text answer (name,
 * dislikes, medications) containing instructions like "ignore all allergy
 * rules" that the parser model echoes into the profile.md. Downstream
 * agents read that markdown as ground truth — so the safety net has to
 * close at the persistence boundary, not at LLM goodwill.
 */
export function profilePreservesSafety(md: string, answers: OnboardingAnswers): boolean {
  // Extract everything from "## Notes for the agents" to end-of-document.
  const notesMatch = md.match(/^##\s+Notes for the agents[\s\S]*$/m);
  if (!notesMatch) return false;
  const notes = notesMatch[0];

  if (answers.allergies.length > 0) {
    if (!/\*\*Allergy enforcement:\*\*\s*Hard/i.test(notes)) return false;
    for (const a of answers.allergies) {
      if (a === "other") continue; // covered by the allergies_other strings below
      if (!notes.includes(allergyLabel(a))) return false;
    }
    if (answers.allergies_other) {
      for (const other of answers.allergies_other) {
        if (other.length > 0 && !notes.includes(other)) return false;
      }
    }
  }

  if (answers.conditions.length > 0) {
    for (const c of answers.conditions) {
      if (c === "other") continue;
      if (!notes.includes(conditionLabel(c))) return false;
    }
    if (answers.conditions_other && !notes.includes(answers.conditions_other)) return false;
  }

  return true;
}
