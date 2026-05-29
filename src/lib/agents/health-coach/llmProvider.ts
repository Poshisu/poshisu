import { createAnthropicTextMessage } from "@/lib/claude/client";
import { AI_CHAT_01_PROMPT_VERSION, buildHealthCoachPrompt } from "./promptRegistry";
import { parseLlmCoachDraft } from "./responseQuality";
import type { CoachContext, CoachMessage, CoachResponse, LlmCallResult } from "./types";

export function isLlmConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim()) && process.env.NOURISH_LLM_DISABLED !== "1";
}

export async function callHealthCoachLlm(args: {
  message: CoachMessage;
  context: CoachContext;
  deterministicResponse: CoachResponse;
}): Promise<LlmCallResult> {
  const started = Date.now();
  const model = process.env.ANTHROPIC_HEALTH_COACH_MODEL?.trim() || "claude-3-5-haiku-latest";

  if (!isLlmConfigured()) {
    return {
      ok: false,
      provider: "deterministic",
      model: "deterministic-fallback",
      promptVersion: AI_CHAT_01_PROMPT_VERSION,
      error: "llm_not_configured",
      latencyMs: Date.now() - started,
    };
  }

  try {
    const prompt = buildHealthCoachPrompt(args);
    const result = await createAnthropicTextMessage({
      model,
      system: "You are Nourish's safety-bound health-coach runtime. Return only valid JSON matching the requested schema.",
      prompt,
      maxTokens: 900,
      temperature: 0.2,
    });
    const draft = parseLlmCoachDraft(result.text);

    return {
      ok: true,
      provider: "anthropic",
      model,
      promptVersion: AI_CHAT_01_PROMPT_VERSION,
      draft,
      rawText: result.text,
      usage: result.usage,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "anthropic",
      model,
      promptVersion: AI_CHAT_01_PROMPT_VERSION,
      error: error instanceof Error ? error.message : "unknown_llm_error",
      latencyMs: Date.now() - started,
    };
  }
}
