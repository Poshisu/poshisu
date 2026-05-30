import { createAnthropicTextMessage } from "@/lib/claude/client";
import { readServerEnv } from "@/lib/env/server";
import { createOpenAITextResponse, OpenAIResponseError } from "@/lib/openai/client";
import { AI_CHAT_01_PROMPT_VERSION, buildHealthCoachPrompt } from "./promptRegistry";
import { parseLlmCoachDraft } from "./responseQuality";
import type { CoachContext, CoachMessage, CoachResponse, LlmCallResult, LlmProviderId, LlmFailureCode } from "./types";

const DEFAULT_OPENAI_MODEL = "gpt-5.2";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-latest";

const providerIds = new Set<LlmProviderId>(["openai", "anthropic"]);

function classifyLlmError(error: unknown): LlmFailureCode {
  if (error instanceof OpenAIResponseError) {
    if (error.status === 401 || error.status === 403) return "auth_failed";
    if (error.status === 404 || error.code === "model_not_found" || error.message.toLowerCase().includes("model")) {
      return "model_unavailable";
    }
    if (error.status === 429) return "rate_limited";
    return "provider_rejected";
  }

  if (error instanceof SyntaxError) return "invalid_response";
  if (error instanceof Error && error.message.toLowerCase().includes("json")) return "invalid_response";
  return "provider_request_failed";
}

export type HealthCoachProviderConfig = {
  provider: LlmProviderId;
  model: string;
};

export function resolveHealthCoachProviderConfig(): HealthCoachProviderConfig {
  const requestedProvider = readServerEnv("NOURISH_LLM_PROVIDER")?.toLowerCase() || "openai";
  if (!providerIds.has(requestedProvider as LlmProviderId)) {
    throw new Error(`Unsupported NOURISH_LLM_PROVIDER: ${requestedProvider}. Expected openai or anthropic.`);
  }

  const provider = requestedProvider as LlmProviderId;
  const model = provider === "openai"
    ? readServerEnv("OPENAI_HEALTH_COACH_MODEL") || DEFAULT_OPENAI_MODEL
    : readServerEnv("ANTHROPIC_HEALTH_COACH_MODEL") || DEFAULT_ANTHROPIC_MODEL;

  return { provider, model };
}

export function isLlmConfigured(provider: LlmProviderId = resolveHealthCoachProviderConfig().provider) {
  if (provider === "openai") return Boolean(readServerEnv("OPENAI_API_KEY"));
  return Boolean(readServerEnv("ANTHROPIC_API_KEY"));
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
      maxOutputTokens: 1400,
      responseFormat: "health_coach_draft_json",
    });
  }

  return createAnthropicTextMessage({
    model: args.model,
    system: args.system,
    prompt: args.prompt,
    maxTokens: 1400,
    temperature: 0.2,
  });
}

export type HealthCoachProviderSmokeResult = {
  ok: true;
  provider: LlmProviderId;
  model: string;
  promptVersion: string;
  latencyMs: number;
  outputTextPresent: true;
} | {
  ok: false;
  provider: LlmProviderId;
  model: string;
  promptVersion: string;
  latencyMs: number;
  error: string;
  errorCode: LlmFailureCode;
};

export async function smokeTestHealthCoachProvider(): Promise<HealthCoachProviderSmokeResult> {
  const started = Date.now();
  const { provider, model } = resolveHealthCoachProviderConfig();

  if (!isLlmConfigured(provider)) {
    return {
      ok: false,
      provider,
      model,
      promptVersion: AI_CHAT_01_PROMPT_VERSION,
      latencyMs: Date.now() - started,
      error: `${provider}_api_key_not_configured`,
      errorCode: "missing_api_key",
    };
  }

  try {
    const result = await callProvider({
      provider,
      model,
      system: "You are a health-coach provider smoke test. Return only valid JSON for the requested schema.",
      prompt: 'Return exactly this JSON object: {"assistantText":"ok","inferredFacts":[],"userVisibleMemoryNotes":[],"mealEstimatePresentation":null}',
    });
    parseLlmCoachDraft(result.text);

    return {
      ok: true,
      provider,
      model,
      promptVersion: AI_CHAT_01_PROMPT_VERSION,
      latencyMs: Date.now() - started,
      outputTextPresent: true,
    };
  } catch (error) {
    return {
      ok: false,
      provider,
      model,
      promptVersion: AI_CHAT_01_PROMPT_VERSION,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "unknown_llm_error",
      errorCode: classifyLlmError(error),
    };
  }
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
      errorCode: "missing_api_key",
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
      errorCode: classifyLlmError(error),
      latencyMs: Date.now() - started,
    };
  }
}
