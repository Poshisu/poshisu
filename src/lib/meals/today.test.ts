import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1" } as { id: string } | null,
  requested: [] as Array<{ column: string; value: string }>,
  meals: [] as Array<Record<string, unknown>>,
};

const query = {
  select: vi.fn(() => query),
  eq: vi.fn((_column: string, _value: string) => query),
  gte: vi.fn((column: string, value: string) => {
    state.requested.push({ column, value });
    return query;
  }),
  lte: vi.fn((column: string, value: string) => {
    state.requested.push({ column, value });
    return query;
  }),
  order: vi.fn(async () => ({ data: state.meals, error: null })),
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

describe("loadTodayMeals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.user = { id: "user-1" };
    state.requested = [];
    state.meals = [];
  });

  it("loads all production Today fields for the selected calendar date", async () => {
    const { loadTodayMeals } = await import("./today");

    state.meals = [{
      id: "meal-1",
      meal_slot: "breakfast",
      source_text: "Akki roti",
      kcal_low: 850,
      kcal_high: 950,
      kcal_lead: 900,
      protein_g_low: 35,
      protein_g_high: 45,
      carbs_g_low: 125,
      carbs_g_high: 145,
      fat_g_low: 20,
      fat_g_high: 28,
      fiber_g_low: 12,
      fiber_g_high: 16,
      confidence: 0.82,
      preparation_assumptions: "Dark chocolate estimated at 5g.",
      safety_flags: [],
      logged_at: "2026-05-14T04:30:00.000Z",
    }];

    const result = await loadTodayMeals("2026-05-14");

    expect(supabaseMock.from).toHaveBeenCalledWith("meals");
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("kcal_lead"));
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("protein_g_low"));
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("safety_flags"));
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.order).toHaveBeenCalledWith("logged_at", { ascending: false });
    expect(state.requested).toEqual([
      { column: "logged_at", value: "2026-05-13T18:30:00.000Z" },
      { column: "logged_at", value: "2026-05-14T18:29:59.999Z" },
    ]);
    expect(result.meals[0]).toMatchObject({
      kcal_lead: 900,
      protein_g_low: 35,
      safety_flags: [],
    });
  });

  it("keeps IST calendar date selection stable across UTC midnight boundaries", async () => {
    const { formatIstDateLabel, getIstCalendarDate, getSelectedIstCalendarDate } = await import("./today");

    const earlyIstMorning = new Date("2026-05-13T19:15:00.000Z");

    expect(getIstCalendarDate(earlyIstMorning)).toBe("2026-05-14");
    expect(getSelectedIstCalendarDate(undefined, earlyIstMorning)).toBe("2026-05-14");
    expect(getSelectedIstCalendarDate("2026-02-31", earlyIstMorning)).toBe("2026-05-14");
    expect(formatIstDateLabel("2026-05-14")).toBe("14 May 2026");
  });
});
