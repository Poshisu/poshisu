import { describe, expect, it } from "vitest";
import { computeCost, getPricing } from "./pricing";

describe("getPricing", () => {
  it("returns pricing for known aliases", () => {
    expect(getPricing("claude-haiku-4-5")?.inputPerM).toBe(1.0);
    expect(getPricing("claude-sonnet-4-6")?.outputPerM).toBe(15.0);
    expect(getPricing("claude-opus-4-7")?.outputPerM).toBe(75.0);
  });

  it("strips a date suffix from pinned model ids", () => {
    expect(getPricing("claude-haiku-4-5-20251001")).toEqual(getPricing("claude-haiku-4-5"));
  });

  it("returns null for unknown models", () => {
    expect(getPricing("claude-mystery-9-9")).toBeNull();
    expect(getPricing("")).toBeNull();
  });

  it("returns null when only the date suffix is recognised but the alias isn't", () => {
    expect(getPricing("does-not-exist-20251001")).toBeNull();
  });
});

describe("computeCost", () => {
  it("computes Haiku 4.5 cost for a typical small call", () => {
    const cost = computeCost("claude-haiku-4-5", {
      inputTokens: 1_000,
      outputTokens: 500,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    // 1000 * $1/M + 500 * $5/M = $0.001 + $0.0025 = $0.0035
    expect(cost).toBeCloseTo(0.0035, 6);
  });

  it("applies cache discount on cache_read tokens", () => {
    const noCache = computeCost("claude-sonnet-4-6", {
      inputTokens: 10_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })!;
    const withCache = computeCost("claude-sonnet-4-6", {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 10_000,
      cacheWriteTokens: 0,
    })!;
    // Cache read is 10% of input rate; full input on Sonnet is 10x cache.
    expect(withCache).toBeLessThan(noCache);
    expect(withCache * 10).toBeCloseTo(noCache, 6);
  });

  it("rounds to 6 decimal places (matches numeric(10,6) DB column)", () => {
    const cost = computeCost("claude-sonnet-4-6", {
      inputTokens: 1,
      outputTokens: 1,
      cacheReadTokens: 1,
      cacheWriteTokens: 1,
    });
    // Sum of fractional cents — should never have more than 6 decimal places.
    expect(cost).not.toBeNull();
    const decimals = cost!.toString().split(".")[1] ?? "";
    expect(decimals.length).toBeLessThanOrEqual(6);
  });

  it("returns null for unknown models", () => {
    expect(
      computeCost("claude-mystery-9-9", {
        inputTokens: 1,
        outputTokens: 1,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }),
    ).toBeNull();
  });

  it("returns 0 for an all-zero usage call (still priced)", () => {
    expect(
      computeCost("claude-haiku-4-5", {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }),
    ).toBe(0);
  });
});
