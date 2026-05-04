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
        insert: vi.fn(async (row: Record<string, unknown>) => {
          state.meals.push({ id: `meal-${state.meals.length + 1}`, logged_at: new Date().toISOString(), ...row });
          return { error: null };
        }),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(async () => ({ data: state.meals, error: null })),
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
});
