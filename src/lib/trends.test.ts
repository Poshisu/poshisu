import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1" } as { id: string } | null,
  requested: [] as Array<{ method: string; args: unknown[] }>,
  meals: [] as Array<Record<string, unknown>>,
};

const query = {
  select: vi.fn(() => query),
  eq: vi.fn((...args: unknown[]) => {
    state.requested.push({ method: "eq", args });
    return query;
  }),
  gte: vi.fn((...args: unknown[]) => {
    state.requested.push({ method: "gte", args });
    return query;
  }),
  lte: vi.fn((...args: unknown[]) => {
    state.requested.push({ method: "lte", args });
    return query;
  }),
  order: vi.fn(async (...args: unknown[]) => {
    state.requested.push({ method: "order", args });
    return { data: state.meals, error: null };
  }),
};

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: state.user } })),
  },
  from: vi.fn(() => query),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

describe("trends data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.user = { id: "user-1" };
    state.requested = [];
    state.meals = [];
  });

  it("loads authenticated meal rows for the selected IST period and aggregates daily trends", async () => {
    const { loadTrendsData } = await import("./trends");

    state.meals = [
      {
        logged_at: "2026-05-14T04:30:00.000Z",
        kcal_lead: 900,
        protein_g_low: 35,
        protein_g_high: 45,
        carbs_g_low: 120,
        carbs_g_high: 140,
        fat_g_low: 20,
        fat_g_high: 30,
        fiber_g_low: 10,
        fiber_g_high: 14,
      },
      {
        logged_at: "2026-05-14T13:00:00.000Z",
        kcal_lead: 600,
        protein_g_low: 20,
        protein_g_high: 24,
        carbs_g_low: 80,
        carbs_g_high: 90,
        fat_g_low: 12,
        fat_g_high: 16,
        fiber_g_low: 8,
        fiber_g_high: 10,
      },
      {
        logged_at: "2026-05-09T07:00:00.000Z",
        kcal_lead: 1200,
        protein_g_low: 40,
        protein_g_high: 50,
        carbs_g_low: 150,
        carbs_g_high: 170,
        fat_g_low: 35,
        fat_g_high: 45,
        fiber_g_low: 16,
        fiber_g_high: 20,
      },
    ];

    const result = await loadTrendsData({ period: "week", selectedDate: "2026-05-14" });

    expect(result.user).toEqual({ id: "user-1" });
    expect(supabaseMock.from).toHaveBeenCalledWith("meals");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.eq).toHaveBeenCalledWith("user_confirmed", true);
    expect(state.requested).toContainEqual({ method: "gte", args: ["logged_at", "2026-05-07T18:30:00.000Z"] });
    expect(state.requested).toContainEqual({ method: "lte", args: ["logged_at", "2026-05-14T18:29:59.999Z"] });
    expect(result.data.summary).toMatchObject({ daysLogged: 2, totalDays: 7, consistencyPct: 29, currentStreak: 1, longestStreak: 1 });
    expect(result.data.days.at(-1)).toMatchObject({ date: "2026-05-14", mealCount: 2, kcal: 1500, protein: 62 });
    expect(result.data.insights.length).toBeGreaterThan(0);
  });

  it("falls back to the current IST calendar date for invalid date params", async () => {
    const { getTrendsParams } = await import("./trends");

    const params = getTrendsParams({ period: "bad", date: "2026-02-31" }, new Date("2026-05-13T19:15:00.000Z"));

    expect(params).toEqual({ period: "week", selectedDate: "2026-05-14" });
  });
});
