import Anthropic from "@anthropic-ai/sdk";
import { getAdminClient } from "@/lib/supabase/admin";
import { computeCost } from "./pricing";
import { redactPii } from "./redact";
import {
  AgentError,
  type AgentErrorCode,
  type CallAgentArgs,
  type CallAgentResult,
  type NormalisedUsage,
  type ToolUseBlock,
} from "./types";

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export function _resetAnthropicClientForTests(): void {
  _client = null;
}

const DEFAULT_MAX_TOKENS = 1024;
const RETRY_DELAY_MS_ON_OVERLOAD = 1000;

/**
 * Make one Claude API call.
 *
 * Single source of truth for talking to Anthropic from anywhere in the app:
 *
 *   - Sets `cache_control: { type: "ephemeral" }` on the system prompt by
 *     default. System prompts in this codebase are >1k tokens and re-used
 *     across many calls; caching cuts input cost by ~90%.
 *   - Retries once on a 529 ("overloaded") with a fixed 1s backoff. We do
 *     NOT retry on 4xx (those are bugs in our request) or on 5xx other
 *     than 529 (those are transient and a single retry won't help much).
 *   - Logs a row to `agent_traces` with PII-redacted request/response,
 *     token usage, latency, and estimated cost. Failures to log don't
 *     fail the call — they're surfaced as warnings only.
 *   - Throws typed `AgentError` subclasses for orchestrator-level handling.
 */
export async function callAgent(args: CallAgentArgs): Promise<CallAgentResult> {
  const {
    agent,
    model,
    system,
    messages,
    tools,
    toolChoice,
    maxTokens = DEFAULT_MAX_TOKENS,
    cacheSystem = true,
    promptVersion,
    userId,
    intent,
  } = args;

  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: system,
      ...(cacheSystem ? { cache_control: { type: "ephemeral" } } : {}),
    },
  ];

  const requestParams: Anthropic.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: maxTokens,
    system: systemBlocks,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    ...(tools ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
  };

  const startedAt = Date.now();
  let response: Anthropic.Message;
  try {
    response = await sendWithOverloadRetry(requestParams);
  } catch (err) {
    const wrapped = wrapSdkError(err);
    void writeTrace({
      agent,
      model,
      promptVersion,
      userId,
      intent,
      latencyMs: Date.now() - startedAt,
      requestParams,
      response: null,
      error: wrapped.message,
    });
    throw wrapped;
  }

  const latencyMs = Date.now() - startedAt;
  const usage = normaliseUsage(response.usage);
  const estimatedCostUsd = computeCost(model, usage);
  const result = parseResponse(response, latencyMs, usage, estimatedCostUsd);

  void writeTrace({
    agent,
    model,
    promptVersion,
    userId,
    intent,
    latencyMs,
    usage,
    estimatedCostUsd,
    requestParams,
    response,
    error: null,
  });

  return result;
}

async function sendWithOverloadRetry(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  const client = getAnthropicClient();
  try {
    return (await client.messages.create(params)) as Anthropic.Message;
  } catch (err) {
    if (isOverloadedError(err)) {
      await sleep(RETRY_DELAY_MS_ON_OVERLOAD);
      return (await client.messages.create(params)) as Anthropic.Message;
    }
    throw err;
  }
}

function isOverloadedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: unknown }).status;
  return status === 529;
}

function wrapSdkError(err: unknown): AgentError {
  if (err instanceof AgentError) return err;
  const status = err && typeof err === "object" ? (err as { status?: unknown }).status : undefined;
  const message = err instanceof Error ? err.message : String(err);

  let code: AgentErrorCode = "internal";
  if (status === 401 || status === 403) code = "auth_failed";
  else if (status === 400 || status === 404 || status === 422) code = "invalid_request";
  else if (status === 429) code = "rate_limited";
  else if (status === 529) code = "overloaded";

  return new AgentError(code, message, err);
}

function normaliseUsage(raw: Anthropic.Message["usage"] | undefined): NormalisedUsage {
  return {
    inputTokens: raw?.input_tokens ?? 0,
    outputTokens: raw?.output_tokens ?? 0,
    cacheReadTokens: raw?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: raw?.cache_creation_input_tokens ?? 0,
  };
}

function parseResponse(
  response: Anthropic.Message,
  latencyMs: number,
  usage: NormalisedUsage,
  estimatedCostUsd: number | null,
): CallAgentResult {
  let textContent = "";
  let toolUse: ToolUseBlock | null = null;

  for (const block of response.content) {
    if (block.type === "text") {
      textContent += block.text;
    } else if (block.type === "tool_use" && !toolUse) {
      toolUse = {
        id: block.id,
        name: block.name,
        input: (block.input ?? {}) as Record<string, unknown>,
      };
    }
  }

  if (!textContent && !toolUse) {
    throw new AgentError("no_response", "Anthropic returned no text or tool_use content");
  }

  return {
    content: textContent,
    toolUse,
    stopReason: response.stop_reason ?? null,
    usage,
    latencyMs,
    estimatedCostUsd,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface WriteTraceArgs {
  agent: string;
  model: string;
  promptVersion?: string;
  userId?: string;
  intent?: string;
  latencyMs: number;
  usage?: NormalisedUsage;
  estimatedCostUsd?: number | null;
  requestParams: Anthropic.MessageCreateParamsNonStreaming;
  response: Anthropic.Message | null;
  error: string | null;
}

/**
 * Insert an `agent_traces` row. Best-effort: any failure is logged as a
 * warning and swallowed, since blowing up here would break the user-facing
 * agent call for an observability-only concern.
 *
 * Bypasses RLS via the service-role admin client. The agent_traces table
 * deliberately has no INSERT policy on the public role — only this code
 * path may write traces.
 */
async function writeTrace(args: WriteTraceArgs): Promise<void> {
  const admin = getAdminClient();
  if (!admin) {
    // Service role key not configured (local dev without it, or PR preview).
    // Silently skip — there's no recoverable action here.
    return;
  }

  try {
    await admin.from("agent_traces").insert({
      user_id: args.userId ?? null,
      agent: args.agent,
      model: args.model,
      prompt_version: args.promptVersion ?? null,
      intent: args.intent ?? null,
      input_tokens: args.usage?.inputTokens ?? null,
      output_tokens: args.usage?.outputTokens ?? null,
      cache_read_tokens: args.usage?.cacheReadTokens ?? 0,
      cache_write_tokens: args.usage?.cacheWriteTokens ?? 0,
      latency_ms: args.latencyMs,
      estimated_cost_usd: args.estimatedCostUsd ?? null,
      request_redacted: redactPii({
        model: args.requestParams.model,
        max_tokens: args.requestParams.max_tokens,
        messages: args.requestParams.messages,
        tools: args.requestParams.tools,
        tool_choice: args.requestParams.tool_choice,
        // System prompt body is intentionally NOT logged — it's static and
        // already on disk under `prompts/agents/`. Logging it bloats traces.
      }),
      response_redacted: args.response ? redactPii({ content: args.response.content, stop_reason: args.response.stop_reason }) : null,
      error: args.error,
    } as never);
  } catch (err) {
    console.warn("[agent_traces] failed to write trace", {
      agent: args.agent,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
