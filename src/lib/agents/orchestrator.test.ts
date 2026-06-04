import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleMessage } from "./orchestrator";

const createOpenAITextResponseMock = vi.fn();

vi.mock("@/lib/openai/client", () => ({
  createOpenAITextResponse: (...args: unknown[]) => createOpenAITextResponseMock(...args),
}));

function mockCoachReply(text = "Got it — I can help with that.") {
  createOpenAITextResponseMock.mockResolvedValue({
    text: JSON.stringify({ assistantText: text, inferredFacts: [], userVisibleMemoryNotes: [] }),
    usage: { inputTokens: 50, outputTokens: 20 },
  });
}

describe("handleMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-openai-key";
    delete process.env.NOURISH_LLM_PROVIDER;
    mockCoachReply("Got it — I can log this meal.");
  });

  it("routes meal logging candidate messages with estimate + confidence", async () => {
    const response = await handleMessage("user-123", {
      text: "I had paneer and roti for dinner",
      allergies: ["dairy"],
    });

    expect(response.intent).toBe("meal_log_candidate");
    expect(response.metadata?.provider).toBe("openai");
    const candidate = response.blocks[0];
    expect(candidate).toMatchObject({
      type: "meal_log_candidate",
      needsConfirmation: true,
      confidence: "high",
    });

    if (candidate.type === "meal_log_candidate") {
      expect(candidate.estimate.kcalMax).toBeGreaterThan(candidate.estimate.kcalMin);
      expect(candidate.confirmPayload).toBeDefined();
      expect(candidate.confirmPayload).toMatchObject({
        mealSlot: "dinner",
        sourceText: "I had paneer and roti for dinner",
        confidence: 0.9,
      });
      expect(candidate.confirmPayload?.items).toEqual([
        { name: "roti", quantity_g: 35, household_unit: "1 medium roti (~35 g)" },
        { name: "paneer", quantity_g: 100, household_unit: "~100 g paneer portion" },
      ]);
      expect(candidate.safetyFlags.allergenFlags).toContain("allergen:dairy");
    }
  });


  it("keeps the screenshot breakfast estimate and confirmation card on the same structured items", async () => {
    mockCoachReply("Got it—this looks like a high-protein breakfast bowl.");
    const text =
      "Breakfast the whole truth unflavoured whey isolate protien 35g True Elements rolled oats 60g. 1 cup is 115g Skyr yogurt 50g Chia and flax 1 tsp each 2 dates / 1 tsp honey 100ml almond milk from So Good 100gm dragonfruit and 60gm mango And 30gm radish kimchi";

    const response = await handleMessage("user-123", { text });
    const candidate = response.blocks.find((block) => block.type === "meal_log_candidate");

    expect(candidate?.type).toBe("meal_log_candidate");
    if (candidate?.type === "meal_log_candidate") {
      const itemNames = candidate.confirmPayload?.items.map((item) => item.name) ?? [];
      expect(candidate.summary).toContain("whey isolate");
      expect(itemNames).not.toContain("roti");
      expect(itemNames).toEqual(
        expect.arrayContaining([
          "whey isolate",
          "rolled oats",
          "skyr yogurt",
          "chia seeds",
          "flax seeds",
          "dates",
          "honey",
          "almond milk",
          "dragon fruit",
          "mango",
          "radish kimchi",
        ]),
      );
      expect(candidate.estimate.kcalMin).toBeGreaterThanOrEqual(500);
      expect(candidate.estimate.kcalMax).toBeLessThanOrEqual(760);
      expect(candidate.confirmPayload).toMatchObject({
        kcalLow: candidate.estimate.kcalMin,
        kcalHigh: candidate.estimate.kcalMax,
        protein: candidate.estimate.protein,
        carbs: candidate.estimate.carbs,
        fat: candidate.estimate.fat,
        fiber: candidate.estimate.fiber,
      });
    }
  });

  it("preserves raw meal text for safety checks when parser misses unsafe allergen synonyms", async () => {
    const response = await handleMessage("user-123", {
      text: "I had peanut chutney for dinner",
      allergies: ["groundnut"],
    });

    const candidate = response.blocks[0];
    expect(candidate.type).toBe("meal_log_candidate");
    if (candidate.type === "meal_log_candidate") {
      expect(candidate.safetyFlags.blocked).toBe(true);
      expect(candidate.safetyFlags.allergenFlags).toContain("allergen:groundnut");
      expect(candidate.safetyFlags.blockingReasons[0]).toContain("groundnut");
      expect(candidate.clarificationQuestions.length).toBeLessThanOrEqual(2);
    }

    expect(response.blocks[1]).toEqual({
      type: "text",
      text: expect.stringContaining("Got it"),
    });
  });

  it("preserves full source text in the confirm payload while truncating only the UI summary", async () => {
    const longText = "I had roti and dal for dinner with a long note about quantities, cooking style, second serving, chutney, curd, salad, and extra ghee that should remain intact in the saved source text.";

    const response = await handleMessage("user-123", { text: longText });
    const candidate = response.blocks[0];

    expect(candidate.type).toBe("meal_log_candidate");
    if (candidate.type === "meal_log_candidate") {
      expect(candidate.summary.length).toBeLessThanOrEqual(160);
      expect(candidate.confirmPayload?.sourceText).toBe(longText);
    }
  });

  it("returns up to two clarifying questions for ambiguous meals", async () => {
    const response = await handleMessage("user-123", {
      text: "I had some random food",
    });

    const candidate = response.blocks[0];
    expect(candidate.type).toBe("meal_log_candidate");
    if (candidate.type === "meal_log_candidate") {
      expect(candidate.confidence).toBe("low");
      expect(candidate.clarificationQuestions.length).toBeLessThanOrEqual(2);
    }
  });

  it("routes non-meal messages to LLM coach responses instead of template fallback guidance", async () => {
    mockCoachReply("Small win: take a 10-minute walk after dinner and log your next meal when ready.");
    const response = await handleMessage("user-123", {
      text: "Can you motivate me today?",
    });

    expect(response.intent).toBe("coach_response");
    expect(response.metadata?.provider).toBe("openai");
    expect(response.blocks).toEqual([
      {
        type: "text",
        text: expect.stringContaining("10-minute walk"),
      },
    ]);
  });


  it("does not turn daily macro or micro total questions into meal candidates", async () => {
    mockCoachReply("Here is today&apos;s macro summary from confirmed meals.");

    const response = await handleMessage("user-123", {
      text: "What are my totals on macros and micros for the day vs DVA?",
      pendingCandidate: {
        summary: "chicken krapow, rice, egg",
        mealSlot: "dinner",
        estimate: { kcalMin: 430, kcalMax: 582, protein: 37, carbs: 42, fat: 19, fiber: 1 },
        items: [
          { name: "chicken", quantityG: 150 },
          { name: "rice", quantityG: 100 },
          { name: "egg", quantityG: 50 },
        ],
      },
    });

    expect(response.intent).toBe("coach_response");
    expect(response.blocks.some((block) => block.type === "meal_log_candidate")).toBe(false);
  });


  it("keeps pending estimate confirmation requests on the current card without more questions", async () => {
    mockCoachReply("Yes — I’ll keep this best guess ready to confirm.");

    const response = await handleMessage("user-123", {
      text: "cool please log this meal",
      pendingCandidate: {
        summary: "paneer tikka and rice",
        mealSlot: "lunch",
        estimate: { kcalMin: 420, kcalMax: 560, protein: 24, carbs: 58, fat: 18, fiber: 4 },
        items: [
          { name: "paneer", quantityG: 100 },
          { name: "rice", quantityG: 150 },
        ],
      },
    });

    const candidate = response.blocks.find((block) => block.type === "meal_log_candidate");
    expect(candidate?.type).toBe("meal_log_candidate");
    if (candidate?.type === "meal_log_candidate") {
      expect(candidate.confidence).not.toBe("low");
      expect(candidate.clarificationQuestions).toHaveLength(0);
      expect(candidate.confirmPayload?.mealSlot).toBe("lunch");
      expect(candidate.confirmPayload?.items.map((item) => item.name)).toEqual(expect.arrayContaining(["paneer", "rice"]));
    }
  });

  it("keeps oily corrections directionally higher than the previous pending estimate", async () => {
    mockCoachReply("Noted — I nudged the estimate upward for oil.");

    const response = await handleMessage("user-123", {
      text: "slightly oily",
      pendingCandidate: {
        summary: "chicken krapow, rice, egg",
        mealSlot: "dinner",
        estimate: { kcalMin: 430, kcalMax: 582, protein: 37, carbs: 42, fat: 19, fiber: 1 },
        items: [
          { name: "chicken", quantityG: 150 },
          { name: "rice", quantityG: 100 },
          { name: "egg", quantityG: 50 },
        ],
      },
    });

    const candidate = response.blocks.find((block) => block.type === "meal_log_candidate");
    expect(candidate?.type).toBe("meal_log_candidate");
    if (candidate?.type === "meal_log_candidate") {
      expect(candidate.estimate.kcalMin).toBeGreaterThan(430);
      expect(candidate.estimate.kcalMax).toBeGreaterThan(582);
      expect(candidate.estimate.fat).toBeGreaterThan(19);
      expect(candidate.estimate.protein).toBeGreaterThanOrEqual(37);
      expect(candidate.confirmPayload?.kcalLow).toBe(candidate.estimate.kcalMin);
    }
  });

  it("throws for malformed payload", async () => {
    await expect(handleMessage("user-123", { foo: "bar" })).rejects.toThrow(
      "Invalid message payload",
    );
  });

  it("throws for blank userId", async () => {
    await expect(handleMessage("   ", { text: "I had idli" })).rejects.toThrow("Invalid userId");
  });
});
