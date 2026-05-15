import { z } from "zod";
import type { ConfirmableMealEstimate } from "@/lib/meals/confirm";
import { parseItemsFromText, runPipeline } from "@/lib/nutrition/pipeline";
import { evaluateMealSafety, type SafetyFlags } from "@/lib/safety/check";

export type OrchestratorIntent = "meal_log_candidate" | "general_fallback_guidance";

export type AssistantResponseBlock =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "meal_log_candidate";
      summary: string;
      needsConfirmation: true;
      confidence: "high" | "medium" | "low";
      estimate: { kcalMin: number; kcalMax: number; protein: number; carbs: number; fat: number; fiber: number };
      rationale: string;
      clarificationQuestions: string[];
      safetyFlags: SafetyFlags;
      confirmPayload?: ConfirmableMealEstimate;
    };

export interface OrchestratorResponse {
  intent: OrchestratorIntent;
  blocks: AssistantResponseBlock[];
}

const messageSchema = z
  .object({
    text: z.string().trim().min(1),
    allergies: z.array(z.string()).optional(),
    conditions: z.array(z.string()).optional(),
  })
  .strict();

const mealLogPattern =
  /\b(ate|had|drank|breakfast|lunch|dinner|snack|meal|calories|protein|carbs|fat|kcal)\b/i;

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
    items: args.items.map((name) => ({ name, quantity_g: 100, household_unit: "estimated serving" })),
    kcalLow: args.nutrition.kcalMin,
    kcalHigh: args.nutrition.kcalMax,
    kcalLead: Math.round((args.nutrition.kcalMin + args.nutrition.kcalMax) / 2),
    confidence: confidenceScore(args.confidence),
  };
}

export async function handleMessage(userId: string, message: unknown): Promise<OrchestratorResponse> {
  const safeUserId = userId.trim();

  if (!safeUserId) {
    throw new Error("Invalid userId: expected a non-empty string.");
  }

  const parsedMessage = messageSchema.safeParse(message);

  if (!parsedMessage.success) {
    throw new Error("Invalid message payload: expected { text: string }.");
  }

  const { text, allergies = [], conditions = [] } = parsedMessage.data;

  if (mealLogPattern.test(text)) {
    const parsed = parseItemsFromText(text);
    const nutrition = await runPipeline(parsed.items);
    const safetyFoods = Array.from(new Set([...parsed.items, text]));
    const safetyFlags = evaluateMealSafety({ foods: safetyFoods, allergies, conditions });

    const clarificationQuestions = parsed.isAmbiguous
      ? nutrition.clarificationQuestions.slice(0, 2)
      : nutrition.clarificationQuestions;

    const candidateConfidence = parsed.isAmbiguous ? "low" : nutrition.confidence;
    const confirmPayload = buildConfirmPayload({
      text,
      items: parsed.items,
      nutrition,
      confidence: candidateConfidence,
    });

    return {
      intent: "meal_log_candidate",
      blocks: [
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
          clarificationQuestions,
          safetyFlags,
          confirmPayload,
        },
        {
          type: "text",
          text:
            safetyFlags.blocked
              ? "I found a safety conflict with your declared allergies or health conditions. Please review the warning before logging this meal."
              : clarificationQuestions.length > 0
                ? "I can estimate this, but I need up to two quick clarifications first."
                : "I can log this meal. Please confirm if the estimate looks right.",
        },
      ],
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
  };
}
