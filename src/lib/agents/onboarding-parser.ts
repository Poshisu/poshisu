import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { getAnthropicClient } from "@/lib/claude/client";
import { loadPrompt } from "@/lib/claude/prompts";
import type { OnboardingAnswers } from "@/lib/onboarding/types";

export type OnboardingParseDecision =
  | { mode: "extract"; promptInput: string }
  | { mode: "clarify"; question: string };

const MODEL = "claude-3-5-haiku-latest";


export function decideOnboardingParseMode(input: { text?: string; transcript?: string }): OnboardingParseDecision {
  const combined = [input.text?.trim(), input.transcript?.trim()].filter(Boolean).join("\n\n").trim();

  if (!combined) {
    return {
      mode: "clarify",
      question: "Could you share a quick summary of your onboarding details so I can continue?",
    };
  }

  return {
    mode: "extract",
    promptInput: combined,
  };
}

export async function generateOnboardingProfile(answers: OnboardingAnswers): Promise<string> {
  const client = getAnthropicClient();
  const systemPrompt = loadPrompt("ONBOARDING_PARSER");

  const messages: MessageParam[] = [
    {
      role: "user",
      content: `Create a profile markdown from this onboarding JSON:\n\n${JSON.stringify(answers, null, 2)}`,
    },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: systemPrompt,
    messages,
    temperature: 0.2,
  });

  return extractTextFromMessage(response.content) || fallbackProfile(answers);
}

export function extractTextFromMessage(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");
}

function fallbackProfile(answers: OnboardingAnswers): string {
  return `# Profile\n\n- Name: ${answers.name}\n- Goal: ${answers.primary_goal}\n- Dietary pattern: ${answers.dietary_pattern}\n- Meal check-ins: ${answers.meal_times.breakfast}, ${answers.meal_times.lunch}, ${answers.meal_times.dinner}`;
}
