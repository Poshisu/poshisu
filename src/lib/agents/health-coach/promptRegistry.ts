import { loadPrompt } from "@/lib/claude/prompts";
import type { CoachContext, CoachMessage, CoachResponse } from "./types";
import { renderCoachContextMarkdown } from "./contextBuilder";

export const AI_CHAT_01_PROMPT_VERSION = "ai-chat-01-health-coach-v1";

export function buildHealthCoachPrompt(args: {
  message: CoachMessage;
  context: CoachContext;
  deterministicResponse: CoachResponse;
}): string {
  const healthCoach = loadPrompt("HEALTH_COACH");
  const safetyRules = loadPrompt("SAFETY_RULES");
  const coach = loadPrompt("COACH");

  return [
    healthCoach,
    "\n---\n# Shared safety rules\n",
    safetyRules,
    "\n---\n# Existing coach contract\n",
    coach,
    "\n---\n# Retrieved user context\n",
    renderCoachContextMarkdown(args.context),
    "\n---\n# Deterministic nutrition/tool baseline\n",
    JSON.stringify({ intent: args.deterministicResponse.intent, blocks: args.deterministicResponse.blocks }, null, 2),
    "\n---\n# User message\n",
    args.message.text,
    "\n---\nReturn only the JSON object described in the Health Coach Agent prompt. Do not include markdown fences.",
  ].join("\n");
}
