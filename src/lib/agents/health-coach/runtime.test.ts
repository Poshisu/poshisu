import { beforeEach, describe, expect, it, vi } from "vitest";
import { runHealthCoachAgent } from "./runtime";

const createAnthropicTextMessageMock = vi.fn();
const createOpenAITextResponseMock = vi.fn();

vi.mock("@/lib/claude/client", () => ({
  createAnthropicTextMessage: (...args: unknown[]) => createAnthropicTextMessageMock(...args),
}));

vi.mock("@/lib/openai/client", () => ({
  createOpenAITextResponse: (...args: unknown[]) => createOpenAITextResponseMock(...args),
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

function llmJson(text: string, mealEstimatePresentation: Record<string, unknown> | null = null) {
  return {
    text: JSON.stringify({
      assistantText: text,
      inferredFacts: [
        { category: "preference", fact: "Prefers lighter dinners.", stability: "stable", source: "assistant_inference" },
      ],
      userVisibleMemoryNotes: ["I’ll remember your lighter-dinner preference."],
      mealEstimatePresentation,
    }),
    usage: { inputTokens: 100, outputTokens: 40 },
  };
}

describe("runHealthCoachAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_HEALTH_COACH_MODEL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_HEALTH_COACH_MODEL;
    delete process.env.NOURISH_LLM_PROVIDER;
  });

  it("fails closed when the selected LLM provider is not configured", async () => {
    await expect(runHealthCoachAgent({ userId: "user-1", message: { text: "I had dal rice for lunch" } })).rejects.toThrow(
      "Health coach LLM provider unavailable: openai_api_key_not_configured",
    );
    expect(createOpenAITextResponseMock).not.toHaveBeenCalled();
    expect(createAnthropicTextMessageMock).not.toHaveBeenCalled();
  });

  it("uses OpenAI by default and writes safe inferred preferences to markdown memory", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    createOpenAITextResponseMock.mockResolvedValueOnce(llmJson("Got it — I can log this and I’ll remember that you prefer lighter dinners.", {
      conciseSummary: "dal rice dinner",
      itemPortions: [
        { name: "dal", quantityG: 180, quantityMl: null, householdDescription: "1 bowl (~180 g)", prepStyle: "home-style dal with light tadka" },
        { name: "rice", quantityG: 150, quantityMl: null, householdDescription: "1 cooked katori (~150 g)", prepStyle: "steamed rice" },
      ],
      assumptions: [
        { label: "Portion", detail: "Dal 1 bowl and rice 1 cooked katori." },
        { label: "Preparation", detail: "Home-style dal with light tadka; no extra ghee assumed." },
      ],
      clarificationQuestions: ["Was there extra ghee or oil?"],
    }));
    const supabase = createSupabaseStub();

    const response = await runHealthCoachAgent({
      userId: "user-1",
      message: { text: "I usually have dal rice for dinner and prefer lighter dinners" },
      supabase,
    });

    expect(response.metadata.provider).toBe("openai");
    expect(response.metadata.usedDeterministicFallback).toBe(false);
    expect(createOpenAITextResponseMock).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5.2" }));
    expect(response.blocks.find((block) => block.type === "text")).toMatchObject({
      text: expect.stringContaining("dal"),
    });
    expect(response.metadata.inferredFacts.map((fact) => fact.fact)).toContain("Prefers lighter dinners.");
    const candidate = response.blocks.find((block) => block.type === "meal_log_candidate");
    expect(candidate).toMatchObject({
      summary: "dal rice dinner",
      displayAssumptions: expect.arrayContaining([{ label: "Portion", detail: "Dal 1 bowl and rice 1 cooked katori." }]),
      clarificationQuestions: ["Was there extra ghee or oil?"],
    });
    if (candidate?.type === "meal_log_candidate") {
      expect(candidate.confirmPayload?.items).toEqual(expect.arrayContaining([expect.objectContaining({ name: "dal", household_unit: "1 bowl (~180 g)", quantity_g: 180 })]));
    }
    expect(supabase.upserts.some((row) => row.layer === "patterns" && String(row.content).includes("Prefers lighter dinners"))).toBe(true);
  });

  it("tolerates Vercel env values pasted as KEY=value", async () => {
    process.env.NOURISH_LLM_PROVIDER = "NOURISH_LLM_PROVIDER=openai";
    process.env.OPENAI_API_KEY = "OPENAI_API_KEY=test-openai-key";
    process.env.OPENAI_HEALTH_COACH_MODEL = "OPENAI_HEALTH_COACH_MODEL=gpt-5.2";
    createOpenAITextResponseMock.mockResolvedValueOnce(llmJson("Got it — I can log this meal."));

    const response = await runHealthCoachAgent({
      userId: "user-1",
      message: { text: "I had dal rice for lunch" },
    });

    expect(response.metadata.provider).toBe("openai");
    expect(createOpenAITextResponseMock).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5.2" }));
    expect(createAnthropicTextMessageMock).not.toHaveBeenCalled();
  });

  it("uses Anthropic when selected by NOURISH_LLM_PROVIDER", async () => {
    process.env.NOURISH_LLM_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    createAnthropicTextMessageMock.mockResolvedValueOnce(llmJson("Got it — this looks like a dal rice dinner."));

    const response = await runHealthCoachAgent({
      userId: "user-1",
      message: { text: "I had dal rice for dinner" },
    });

    expect(response.metadata.provider).toBe("anthropic");
    expect(createAnthropicTextMessageMock).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-3-5-haiku-latest" }));
    expect(createOpenAITextResponseMock).not.toHaveBeenCalled();
  });

  it("blocks unsafe medical requests before LLM execution", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const response = await runHealthCoachAgent({ userId: "user-1", message: { text: "Can you prescribe a dose of metformin?" } });

    expect(response.intent).toBe("safety_concern");
    expect(response.metadata.safety.blocked).toBe(true);
    expect(response.metadata.usedDeterministicFallback).toBe(false);
    expect(response.blocks[0]).toMatchObject({ type: "text", text: expect.stringContaining("can't diagnose") });
    expect(createOpenAITextResponseMock).not.toHaveBeenCalled();
    expect(createAnthropicTextMessageMock).not.toHaveBeenCalled();
  });
});
