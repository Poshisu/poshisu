import { createAnthropicTextMessage } from "@/lib/claude/client";
import { createOpenAITextResponse } from "@/lib/openai/client";
import { AI_CHAT_01_PROMPT_VERSION, buildHealthCoachPrompt } from "./promptRegistry";
import { parseLlmCoachDraft } from "./responseQuality";
import type { CoachContext, CoachMessage, CoachResponse, LlmCallResult, LlmProviderId } from "./types";

const DEFAULT_OPENAI_MODEL = "gpt-5.2";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-latest";

const providerIds = new Set<LlmProviderId>(["openai", "anthropic"]);

export type HealthCoachProviderConfig = {
  provider: LlmProviderId;
  model: string;
};

export function resolveHealthCoachProviderConfig(): HealthCoachProviderConfig {
  const requestedProvider = process.env.NOURISH_LLM_PROVIDER?.trim().toLowerCase() || "openai";
  if (!providerIds.has(requestedProvider as LlmProviderId)) {
    throw new Error(`Unsupported NOURISH_LLM_PROVIDER: ${requestedProvider}. Expected openai or anthropic.`);
  }

  const provider = requestedProvider as LlmProviderId;
  const model = provider === "openai"
    ? process.env.OPENAI_HEALTH_COACH_MODEL?.trim() || DEFAULT_OPENAI_MODEL
    : process.env.ANTHROPIC_HEALTH_COACH_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;

  return { provider, model };
}

export function isLlmConfigured(provider: LlmProviderId = resolveHealthCoachProviderConfig().provider) {
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY?.trim());
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

async function callProvider(args: {
  provider: LlmProviderId;
  model: string;
  system: string;
  prompt: string;
}) {
  if (args.provider === "openai") {
    return createOpenAITextResponse({
      model: args.model,
      system: args.system,
      prompt: args.prompt,
      maxOutputTokens: 900,
    });
  }

  return createAnthropicTextMessage({
    model: args.model,
    system: args.system,
    prompt: args.prompt,
    maxTokens: 900,
    temperature: 0.2,
  });
}

export async function callHealthCoachLlm(args: {
  message: CoachMessage;
  context: CoachContext;
  deterministicResponse: CoachResponse;
}): Promise<LlmCallResult> {
  const started = Date.now();
  const { provider, model } = resolveHealthCoachProviderConfig();

  if (!isLlmConfigured(provider)) {
    return {
      ok: false,
      provider,
      model,
      promptVersion: AI_CHAT_01_PROMPT_VERSION,
      error: `${provider}_api_key_not_configured`,
      latencyMs: Date.now() - started,
    };
  }

  try {
    const prompt = buildHealthCoachPrompt(args);
    const result = await callProvider({
      provider,
      model,
      system: "You are Nourish's safety-bound health-coach runtime. Return only valid JSON matching the requested schema.",
      prompt,
    });
    const draft = parseLlmCoachDraft(result.text);

    return {
      ok: true,
      provider,
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
      provider,
      model,
      promptVersion: AI_CHAT_01_PROMPT_VERSION,
      error: error instanceof Error ? error.message : "unknown_llm_error",
      latencyMs: Date.now() - started,
    };
  }
}
