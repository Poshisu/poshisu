import type { OnboardingDraft } from "./types";

/**
 * One question in the chat-based onboarding script. Rendered as an agent
 * message bubble with optional pre-filled answer chips and a free-text /
 * voice input below.
 *
 * `parser` lives in `./parser.ts` — it's keyed on `id` so the script and
 * the parsing logic stay together but in separate files.
 */
export interface OnboardingQuestion {
  /** Stable id used by the parser and analytics. */
  id: OnboardingQuestionId;
  /** The agent's prompt to the user — rendered as a message bubble. */
  prompt: string;
  /** 0–6 suggested answers shown as chips above the input. Tapping one fills the input but doesn't auto-send. */
  chips: ReadonlyArray<string>;
  /** Default chip to pre-select (visually highlighted). Useful for things like estimation_preference where we want a sensible default. */
  defaultChip?: string;
  /**
   * Whether this question should be skipped given the current draft. Used
   * for conditional questions like `goal_target_kg` (only when goal is
   * lose-weight / gain-weight).
   */
  skipIf?: (draft: OnboardingDraft) => boolean;
  /** Whether the user can skip this question (true → show a "Skip" chip, parser accepts empty). */
  optional?: boolean;
}

export type OnboardingQuestionId =
  | "name"
  | "age"
  | "gender"
  | "height_cm"
  | "weight_kg"
  | "city"
  | "primary_goal"
  | "goal_target_and_timeline"
  | "conditions"
  | "medications"
  | "dietary_pattern"
  | "allergies"
  | "dislikes"
  | "meal_times"
  | "eating_context"
  | "estimation_preference";

const isWeightGoal = (draft: OnboardingDraft): boolean =>
  draft.primary_goal === "lose-weight" || draft.primary_goal === "gain-weight";

/**
 * The 16-question chat-based onboarding script. Order matters — earlier
 * answers can gate later ones via `skipIf`. Conditional questions
 * (`goal_target_and_timeline`) are skipped silently when their condition
 * isn't met.
 */
export const QUESTIONS: ReadonlyArray<OnboardingQuestion> = [
  {
    id: "name",
    prompt: "Hey! What should I call you?",
    chips: [],
  },
  {
    id: "age",
    prompt: "How old are you?",
    chips: [],
  },
  {
    id: "gender",
    prompt: "And gender? Helps me set realistic targets.",
    chips: ["Female", "Male", "Non-binary", "Prefer not to say"],
  },
  {
    id: "height_cm",
    prompt: "Roughly how tall are you, in cm?",
    chips: [],
  },
  {
    id: "weight_kg",
    prompt: "And weight in kg? You can update this anytime.",
    chips: [],
  },
  {
    id: "city",
    prompt: "Which city are you in? Optional — helps with timezones and local food.",
    chips: ["Skip"],
    optional: true,
  },
  {
    id: "primary_goal",
    prompt: "What's the main thing you're hoping for?",
    chips: ["Lose weight", "Build muscle", "Eat better", "Manage a condition", "More energy"],
  },
  {
    id: "goal_target_and_timeline",
    prompt: "What weight are you aiming for, in kg? And roughly by when, in weeks?",
    chips: [],
    skipIf: (draft) => !isWeightGoal(draft),
  },
  {
    id: "conditions",
    prompt: "Any health conditions I should know about? You can pick a few, or say none.",
    chips: ["None", "PCOS", "Diabetes", "Hypertension", "High cholesterol", "Thyroid"],
  },
  {
    id: "medications",
    prompt: "Any medications affecting your diet? Skip if not.",
    chips: ["None", "Skip"],
    optional: true,
  },
  {
    id: "dietary_pattern",
    prompt: "What's your usual eating pattern?",
    chips: ["Vegetarian", "Veg + eggs", "Non-veg", "Vegan", "Jain"],
  },
  {
    id: "allergies",
    prompt: "Any food allergies?",
    chips: ["None", "Peanuts", "Dairy", "Gluten", "Tree nuts"],
  },
  {
    id: "dislikes",
    prompt: "Anything you'd rather not see suggested? Optional.",
    chips: ["Skip"],
    optional: true,
  },
  {
    id: "meal_times",
    prompt: "When do you usually eat? Pick a pattern or tell me your usual times.",
    chips: ["Standard (8 / 1 / 8)", "Early riser (7 / 12 / 7)", "Late riser (10 / 2 / 9)", "Custom"],
  },
  {
    id: "eating_context",
    prompt: "Mostly cook, order in, or a mix?",
    chips: ["Mostly cook", "Mix", "Mostly order", "Varies a lot"],
  },
  {
    id: "estimation_preference",
    prompt: "For calorie estimates, how should I lean?",
    chips: ["Conservative", "Midpoint", "Liberal"],
    defaultChip: "Midpoint",
  },
];

/**
 * Look up a question by id. Throws if the id isn't in the script — that's
 * a programmer error, not a user-facing one.
 */
export function getQuestion(id: OnboardingQuestionId): OnboardingQuestion {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`Unknown onboarding question id: ${id}`);
  return q;
}

/**
 * Compute the next question to ask given the current draft, skipping any
 * conditional ones whose `skipIf` returns true. Returns null when all
 * questions are answered.
 */
export function nextQuestion(
  draft: OnboardingDraft,
  answeredIds: ReadonlySet<OnboardingQuestionId>,
): OnboardingQuestion | null {
  for (const q of QUESTIONS) {
    if (answeredIds.has(q.id)) continue;
    if (q.skipIf?.(draft)) continue;
    return q;
  }
  return null;
}
