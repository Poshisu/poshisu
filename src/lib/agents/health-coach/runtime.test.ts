import { beforeEach, describe, expect, it, vi } from "vitest";
import { runHealthCoachAgent } from "./runtime";

const createAnthropicTextMessageMock = vi.fn();

vi.mock("@/lib/claude/client", () => ({
  createAnthropicTextMessage: (...args: unknown[]) => createAnthropicTextMessageMock(...args),
}));

function queryResult<T>(data: T | null) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
    then: (resolve: (value: { data: T | null; error: null }) => unknown) => Promise.resolve(resolve({ data, error: null })),
  };
  return builder;
}

function createSupabaseStub() {
  const upserts: Array<Record<string, unknown>> = [];
  return {
    upserts,
    from: vi.fn((table: string) => {
      if (table === "users") return queryResult({ display_name: "Atu", timezone: "Asia/Kolkata", estimation_preference: "midpoint", nudge_tone: "friendly" });
      if (table === "user_profiles") return queryResult({ conditions: ["pcos"], allergies: ["peanut"], dietary_pattern: "veg", primary_goal: "wellness", city: "Bengaluru", daily_kcal_target: 1900, daily_protein_target: 90, daily_fiber_target: 30 });
      if (table === "meals") return queryResult([]);
      if (table === "memories") {
        const builder = queryResult([]);
        return {
          ...builder,
          upsert: vi.fn(async (value: Record<string, unknown>) => {
            upserts.push(value);
            return { error: null };
          }),
        };
      }
      return queryResult(null);
    }),
  };
}

describe("runHealthCoachAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.NOURISH_LLM_DISABLED;
  });

  it("uses deterministic fallback without an LLM key while still returning a confirmable meal candidate", async () => {
    const response = await runHealthCoachAgent({ userId: "user-1", message: { text: "I had dal rice for lunch" } });

    expect(response.intent).toBe("meal_log_candidate");
    expect(response.metadata.provider).toBe("deterministic");
    expect(response.metadata.usedDeterministicFallback).toBe(true);
    expect(response.blocks[0]).toMatchObject({ type: "meal_log_candidate", needsConfirmation: true });
    expect(createAnthropicTextMessageMock).not.toHaveBeenCalled();
  });

  it("uses Claude when configured and writes safe inferred preferences to markdown memory", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createAnthropicTextMessageMock.mockResolvedValueOnce({
      text: JSON.stringify({
        assistantText: "Got it — I can log this and I’ll remember that you prefer lighter dinners.",
        inferredFacts: [
          { category: "preference", fact: "Prefers lighter dinners.", stability: "stable", source: "assistant_inference" },
        ],
        userVisibleMemoryNotes: ["I’ll remember your lighter-dinner preference."],
      }),
      usage: { inputTokens: 100, outputTokens: 40 },
    });
    const supabase = createSupabaseStub();

    const response = await runHealthCoachAgent({
      userId: "user-1",
      message: { text: "I usually have dal rice for dinner and prefer lighter dinners" },
      supabase,
    });

    expect(response.metadata.provider).toBe("anthropic");
    expect(response.metadata.usedDeterministicFallback).toBe(false);
    expect(response.blocks.find((block) => block.type === "text")).toMatchObject({
      text: expect.stringContaining("lighter dinners"),
    });
    expect(response.metadata.inferredFacts.map((fact) => fact.fact)).toContain("Prefers lighter dinners.");
    expect(supabase.upserts.some((row) => row.layer === "patterns" && String(row.content).includes("Prefers lighter dinners"))).toBe(true);
  });

  it("blocks unsafe medical requests before LLM execution", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const response = await runHealthCoachAgent({ userId: "user-1", message: { text: "Can you prescribe a dose of metformin?" } });

    expect(response.intent).toBe("safety_concern");
    expect(response.metadata.safety.blocked).toBe(true);
    expect(response.blocks[0]).toMatchObject({ type: "text", text: expect.stringContaining("can't diagnose") });
    expect(createAnthropicTextMessageMock).not.toHaveBeenCalled();
  });
});
