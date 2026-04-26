/**
 * Token pricing per Anthropic model, in USD per million tokens.
 *
 * Source: https://www.anthropic.com/pricing (cross-checked against
 * api.anthropic.com responses). Update when Anthropic publishes new prices.
 *
 * Cache-read tokens are billed at ~10% of input rate; cache-write tokens
 * at ~125% of input rate (5-minute ephemeral cache).
 */

export interface ModelPricing {
  /** USD per 1M input tokens. */
  inputPerM: number;
  /** USD per 1M output tokens. */
  outputPerM: number;
  /** USD per 1M cache-read tokens (90% discount on input rate). */
  cacheReadPerM: number;
  /** USD per 1M cache-write tokens (25% premium on input rate). */
  cacheWritePerM: number;
}

const PRICING: Record<string, ModelPricing> = {
  // Haiku 4.5
  "claude-haiku-4-5": { inputPerM: 1.0, outputPerM: 5.0, cacheReadPerM: 0.1, cacheWritePerM: 1.25 },
  // Sonnet 4.6
  "claude-sonnet-4-6": { inputPerM: 3.0, outputPerM: 15.0, cacheReadPerM: 0.3, cacheWritePerM: 3.75 },
  // Opus 4.7
  "claude-opus-4-7": { inputPerM: 15.0, outputPerM: 75.0, cacheReadPerM: 1.5, cacheWritePerM: 18.75 },
  // Opus 4.6 — kept for backwards-compat with CLAUDE.md routing table.
  "claude-opus-4-6": { inputPerM: 15.0, outputPerM: 75.0, cacheReadPerM: 1.5, cacheWritePerM: 18.75 },
};

/**
 * Resolve pricing for a model id. Anthropic accepts both "alias" forms
 * (`claude-haiku-4-5`) and date-pinned forms (`claude-haiku-4-5-20251001`),
 * so we strip a trailing `-YYYYMMDD` before lookup.
 *
 * Returns null when the model is unknown — callers should treat that as
 * "skip cost computation, log a warning" rather than crashing.
 */
export function getPricing(model: string): ModelPricing | null {
  const direct = PRICING[model];
  if (direct) return direct;

  const stripped = model.replace(/-\d{8}$/, "");
  return PRICING[stripped] ?? null;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/**
 * Compute the USD cost of a single API call given the model and token
 * usage. Returns null when the model is unknown.
 */
export function computeCost(model: string, usage: TokenUsage): number | null {
  const p = getPricing(model);
  if (!p) return null;
  const cost =
    (usage.inputTokens * p.inputPerM +
      usage.outputTokens * p.outputPerM +
      usage.cacheReadTokens * p.cacheReadPerM +
      usage.cacheWriteTokens * p.cacheWritePerM) /
    1_000_000;
  // Round to 6 decimal places (matches the agent_traces.estimated_cost_usd
  // numeric(10,6) column).
  return Math.round(cost * 1_000_000) / 1_000_000;
}
