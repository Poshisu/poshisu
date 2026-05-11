import { z } from "zod";
import { parseItemsFromText, runPipeline } from "@/lib/nutrition/pipeline";
import { evaluateMealSafety } from "@/lib/safety/check";

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
      safetyFlags: { allergenFlags: string[]; conditionFlags: string[] };
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
    const safetyFlags = evaluateMealSafety({ foods: parsed.items, allergies, conditions });

    const clarificationQuestions = parsed.isAmbiguous
      ? nutrition.clarificationQuestions.slice(0, 2)
      : nutrition.clarificationQuestions;

    return {
      intent: "meal_log_candidate",
      blocks: [
        {
          type: "meal_log_candidate",
          summary: summarizeMealCandidate(text),
          needsConfirmation: true,
          confidence: parsed.isAmbiguous ? "low" : nutrition.confidence,
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
        },
        {
          type: "text",
          text:
            clarificationQuestions.length > 0
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
