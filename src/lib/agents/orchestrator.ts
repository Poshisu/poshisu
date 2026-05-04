import { z } from "zod";

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
    };

export interface OrchestratorResponse {
  intent: OrchestratorIntent;
  blocks: AssistantResponseBlock[];
}

const messageSchema = z
  .object({
    text: z.string().trim().min(1),
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

  const text = parsedMessage.data.text;

  if (mealLogPattern.test(text)) {
    return {
      intent: "meal_log_candidate",
      blocks: [
        {
          type: "meal_log_candidate",
          summary: summarizeMealCandidate(text),
          needsConfirmation: true,
        },
        {
          type: "text",
          text: "I can log this meal. Please confirm if the summary looks right.",
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
