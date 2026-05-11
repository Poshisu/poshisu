import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  meals: [] as Array<Record<string, unknown>>,
};

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } } })),
  },
  from: vi.fn((table: string) => {
    if (table === "meals") {
      return {
        insert: vi.fn((row: Record<string, unknown>) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              const inserted = { id: `meal-${state.meals.length + 1}`, logged_at: new Date().toISOString(), ...row };
              state.meals.push(inserted);
              return { data: { id: inserted.id }, error: null };
            }),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(async () => ({ data: state.meals, error: null })),
              })),
              order: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: state.meals, error: null })),
              })),
            })),
          })),
        })),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

describe("confirm-save meal flow integration", () => {
  beforeEach(() => {
    state.meals = [];
    supabaseMock.from.mockClear();
  });

  it("persists a confirmed chat estimate and makes it available to Today view loader", async () => {
    const { confirmMealEstimate } = await import("./confirm");
    const { loadTodayMeals } = await import("./today");

    await confirmMealEstimate({
      mealSlot: "lunch",
      sourceText: "2 rotis and dal",
      items: [{ name: "roti", quantity_g: 120 }],
      kcalLow: 400,
      kcalHigh: 500,
      kcalLead: 450,
      confidence: 0.9,
    });

    const result = await loadTodayMeals();

    expect(result.meals).toHaveLength(1);
    expect(result.meals[0]?.source_text).toBe("2 rotis and dal");
    expect(result.meals[0]?.kcal_low).toBe(400);
  });

  it("ignores duplicate confirmations within dedupe window", async () => {
    const { confirmMealEstimate } = await import("./confirm");

    const payload = {
      mealSlot: "lunch" as const,
      sourceText: "2 rotis and dal",
      items: [{ name: "roti", quantity_g: 120 }],
      kcalLow: 400,
      kcalHigh: 500,
      kcalLead: 450,
      confidence: 0.9,
    };

    const first = await confirmMealEstimate(payload);
    const second = await confirmMealEstimate(payload);

    expect(first.status).toBe("saved");
    expect(second.status).toBe("duplicate_ignored");
    expect(state.meals).toHaveLength(1);
  });

  it("rejects invalid kcal ranges", async () => {
    const { confirmMealEstimate } = await import("./confirm");

    await expect(
      confirmMealEstimate({
        mealSlot: "lunch",
        sourceText: "2 rotis and dal",
        items: [{ name: "roti", quantity_g: 120 }],
        kcalLow: 500,
        kcalHigh: 400,
        kcalLead: 450,
        confidence: 0.9,
      }),
    ).rejects.toThrow("Invalid meal confirmation payload");
  });
});
