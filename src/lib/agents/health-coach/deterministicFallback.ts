import type { ConfirmableMealEstimate } from "@/lib/meals/confirm";
import { parseItemsFromText, runPipeline } from "@/lib/nutrition/pipeline";
import { evaluateMealSafety } from "@/lib/safety/check";
import type { CoachMessage, CoachResponse, CoachResponseBlock } from "./types";

type PortionAssumption = { quantityG: number; householdUnit: string; prepStyle: string };

const PORTION_ASSUMPTIONS: Record<string, PortionAssumption> = {
  roti: { quantityG: 35, householdUnit: "1 medium roti (~35 g)", prepStyle: "plain whole-wheat roti; little/no ghee unless stated" },
  rice: { quantityG: 150, householdUnit: "1 cooked katori (~150 g)", prepStyle: "steamed cooked rice" },
  dal: { quantityG: 180, householdUnit: "1 bowl (~180 g)", prepStyle: "home-style dal with light tadka" },
  paneer: { quantityG: 100, householdUnit: "~100 g paneer portion", prepStyle: "medium-spice curry or sauté; moderate oil" },
  curd: { quantityG: 120, householdUnit: "1 small bowl (~120 g)", prepStyle: "plain curd" },
  idli: { quantityG: 100, householdUnit: "2 medium idlis (~100 g)", prepStyle: "steamed idli" },
  dosa: { quantityG: 120, householdUnit: "1 medium dosa (~120 g)", prepStyle: "tawa dosa with light oil" },
  egg: { quantityG: 50, householdUnit: "1 large egg (~50 g)", prepStyle: "boiled or lightly cooked unless stated" },
  chicken: { quantityG: 100, householdUnit: "~100 g cooked chicken", prepStyle: "grilled/curry-style cooked chicken; moderate oil" },
  fish: { quantityG: 100, householdUnit: "~100 g cooked fish", prepStyle: "grilled/tikka/curry-style fish; moderate oil" },
  banana: { quantityG: 118, householdUnit: "1 medium banana (~118 g)", prepStyle: "raw banana fruit" },
};

function portionForItem(name: string): PortionAssumption {
  return PORTION_ASSUMPTIONS[name.toLowerCase()] ?? {
    quantityG: 100,
    householdUnit: "~100 g estimated portion",
    prepStyle: "typical home-style preparation; moderate oil if cooked",
  };
}

function buildPreparationAssumptions(items: string[]) {
  const uniquePrepStyles = Array.from(new Set(items.map((item) => portionForItem(item).prepStyle)));
  return [
    { label: "Portion basis", detail: items.map((item) => `${item}: ${portionForItem(item).householdUnit}`).join("; ") },
    { label: "Preparation", detail: uniquePrepStyles.join("; ") },
    { label: "Oil / add-ons", detail: "Assumes moderate oil and no extra ghee, butter, cream, cheese, or sugar unless you mention it." },
  ].slice(0, 3);
}

const mealLogPattern = /\b(ate|had|drank|breakfast|lunch|dinner|snack|meal|calories|protein|carbs|fat|kcal)\b/i;

function summarizeMealCandidate(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= 160 ? normalized : `${normalized.slice(0, 157)}...`;
}

function inferMealSlot(text: string): ConfirmableMealEstimate["mealSlot"] {
  const lower = text.toLowerCase();
  if (/\bbreakfast\b/.test(lower)) return "breakfast";
  if (/\blunch\b/.test(lower)) return "lunch";
  if (/\bdinner\b/.test(lower)) return "dinner";
  if (/\bsnack\b/.test(lower)) return "snack";
  if (/\b(drink|drank|tea|coffee|juice|beverage)\b/.test(lower)) return "beverage";
  return "other";
}

function confidenceScore(confidence: "high" | "medium" | "low") {
  if (confidence === "high") return 0.9;
  if (confidence === "medium") return 0.65;
  return 0.35;
}

function normalizedSourceText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function buildConfirmPayload(args: {
  text: string;
  items: string[];
  nutrition: Awaited<ReturnType<typeof runPipeline>>;
  confidence: "high" | "medium" | "low";
}): ConfirmableMealEstimate | undefined {
  if (args.items.length === 0) return undefined;
  return {
    mealSlot: inferMealSlot(args.text),
    sourceText: normalizedSourceText(args.text),
    items: args.items.map((name) => {
      const portion = portionForItem(name);
      return { name, quantity_g: portion.quantityG, household_unit: portion.householdUnit };
    }),
    kcalLow: args.nutrition.kcalMin,
    kcalHigh: args.nutrition.kcalMax,
    kcalLead: Math.round((args.nutrition.kcalMin + args.nutrition.kcalMax) / 2),
    confidence: confidenceScore(args.confidence),
  };
}

export async function buildDeterministicCoachResponse(userId: string, message: CoachMessage): Promise<CoachResponse> {
  const safeUserId = userId.trim();

  if (!safeUserId) {
    throw new Error("Invalid userId: expected a non-empty string.");
  }

  const text = message.text.trim();

  if (mealLogPattern.test(text)) {
    const parsed = parseItemsFromText(text);
    const nutrition = await runPipeline(parsed.items);
    const safetyFoods = Array.from(new Set([...parsed.items, text]));
    const safetyFlags = evaluateMealSafety({ foods: safetyFoods, allergies: message.allergies ?? [], conditions: message.conditions ?? [] });
    const clarificationQuestions = parsed.isAmbiguous ? nutrition.clarificationQuestions.slice(0, 2) : nutrition.clarificationQuestions;
    const candidateConfidence = parsed.isAmbiguous ? "low" : nutrition.confidence;
    const confirmPayload = buildConfirmPayload({ text, items: parsed.items, nutrition, confidence: candidateConfidence });

    const blocks: CoachResponseBlock[] = [
      {
        type: "meal_log_candidate",
        summary: summarizeMealCandidate(text),
        needsConfirmation: true,
        confidence: candidateConfidence,
        estimate: {
          kcalMin: nutrition.kcalMin,
          kcalMax: nutrition.kcalMax,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
          fiber: nutrition.fiber,
        },
        rationale: nutrition.rationale,
        displayAssumptions: parsed.items.length > 0 ? buildPreparationAssumptions(parsed.items) : undefined,
        clarificationQuestions,
        safetyFlags,
        confirmPayload,
      },
      {
        type: "text",
        text: safetyFlags.blocked
          ? "I found a safety conflict with your declared allergies or health conditions. Please review the warning before logging this meal."
          : clarificationQuestions.length > 0
            ? "I can estimate this, but I need up to two quick clarifications first."
            : "I can log this meal. Please confirm if the estimate looks right.",
      },
    ];

    return {
      intent: "meal_log_candidate",
      blocks,
      metadata: {
        provider: "baseline",
        model: "deterministic-nutrition-pipeline",
        promptVersion: "ai-chat-01-deterministic-v1",
        usedDeterministicFallback: false,
        fallbackReason: "deterministic_baseline",
        contextLoaded: false,
        memoryWriteStatus: "skipped",
        inferredFacts: [],
        safety: { blocked: safetyFlags.blocked, reasons: safetyFlags.blockingReasons },
      },
    };
  }

  return {
    intent: "general_fallback_guidance",
    blocks: [
      {
        type: "text",
        text: "I can help with meal logging right now. Share what you ate (for example: 'I had rajma chawal and curd for lunch').",
      },
    ],
    metadata: {
      provider: "baseline",
      model: "deterministic-coach-fallback",
      promptVersion: "ai-chat-01-deterministic-v1",
      usedDeterministicFallback: false,
      fallbackReason: "baseline_non_meal_intent",
      contextLoaded: false,
      memoryWriteStatus: "skipped",
      inferredFacts: [],
      safety: { blocked: false, reasons: [] },
    },
  };
}
