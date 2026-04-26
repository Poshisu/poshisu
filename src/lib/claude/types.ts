import type Anthropic from "@anthropic-ai/sdk";

export type AgentIntent =
  | "log_meal"
  | "log_water"
  | "ask_recommendation"
  | "ask_question_history"
  | "ask_question_nutrition"
  | "set_context"
  | "update_profile"
  | "correct_meal"
  | "request_summary"
  | "general_chat"
  | "safety_concern"
  | "unknown";

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentContext {
  userId: string;
  messages: AgentMessage[];
  intent?: AgentIntent;
}

export interface AgentResponse {
  content: string;
  intent: AgentIntent;
  metadata?: Record<string, unknown>;
}

/**
 * Arguments for `callAgent`. One call = one Claude turn (request → response,
 * possibly with tool_use). The caller is responsible for the loop when
 * tool_use → tool_result → next turn is needed.
 */
export interface CallAgentArgs {
  /** Logical agent name. Goes into `agent_traces.agent`. */
  agent: string;
  /** Anthropic model id, e.g. `claude-haiku-4-5` or `claude-sonnet-4-6`. */
  model: string;
  /** System prompt. Cached when `cacheSystem` is true (default). */
  system: string;
  /** Conversation turns. */
  messages: AgentMessage[];
  /** Optional tool definitions to expose to the model. */
  tools?: Anthropic.Tool[];
  /** Optional tool_choice — forces a specific tool when the agent must use one. */
  toolChoice?: Anthropic.MessageCreateParams["tool_choice"];
  /** Cap on output tokens. Defaults to 1024. */
  maxTokens?: number;
  /** Whether to set `cache_control: { type: "ephemeral" }` on the system message. Default true. */
  cacheSystem?: boolean;
  /** Prompt version tag (e.g. git sha or semver). Stored on the trace for prompt-change correlation. */
  promptVersion?: string;
  /** Authenticated user id — required to write a usable `agent_traces` row. */
  userId?: string;
  /** Optional intent — populated by orchestrators after routing. */
  intent?: AgentIntent;
}

/**
 * Token usage as returned by the SDK, normalised to camelCase and
 * defaulted to 0 for any field the SDK omits.
 */
export interface NormalisedUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/** Parsed tool_use block — one per response (we don't yet support multi-tool calls per turn). */
export interface ToolUseBlock {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface CallAgentResult {
  /** Concatenated text from all `text` content blocks. Empty if model only emitted tool_use. */
  content: string;
  /** First tool_use block, if any. */
  toolUse: ToolUseBlock | null;
  /** Stop reason from the SDK (`end_turn`, `tool_use`, `max_tokens`, `stop_sequence`). */
  stopReason: string | null;
  /** Usage summary, normalised. */
  usage: NormalisedUsage;
  /** Latency from request → response, in milliseconds. */
  latencyMs: number;
  /** Estimated USD cost. Null if model pricing isn't known. */
  estimatedCostUsd: number | null;
}

export type AgentErrorCode =
  | "rate_limited"
  | "overloaded"
  | "invalid_request"
  | "auth_failed"
  | "no_response"
  | "internal";

export class AgentError extends Error {
  constructor(
    public readonly code: AgentErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AgentError";
  }
}
