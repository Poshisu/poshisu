import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1" } as { id: string } | null,
  authError: null as Error | null,
  meals: [
    {
      id: "meal-1",
      user_id: "user-1",
      meal_slot: "lunch",
      source_text: "dal rice",
      items: [{ name: "dal", quantity_g: 150 }],
      kcal_low: 350,
      kcal_high: 450,
      kcal_lead: 400,
      confidence: 0.82,
      user_confirmed: true,
      logged_at: "2026-05-12T07:00:00.000Z",
      created_at: "2026-05-12T07:01:00.000Z",
      updated_at: "2026-05-12T07:01:00.000Z",
    },
    {
      id: "meal-2",
      user_id: "user-2",
      meal_slot: "dinner",
      source_text: "private meal",
      items: [{ name: "paneer", quantity_g: 100 }],
      kcal_low: 500,
      kcal_high: 650,
      kcal_lead: 575,
      confidence: 0.7,
      user_confirmed: true,
      logged_at: "2026-05-12T14:00:00.000Z",
      created_at: "2026-05-12T14:01:00.000Z",
      updated_at: "2026-05-12T14:01:00.000Z",
    },
  ] as Array<Record<string, unknown>>,
  inserts: [] as Array<Record<string, unknown>>,
};

const filterRows = (rows: Array<Record<string, unknown>>, filters: Array<{ op: string; column: string; value: unknown }>) => {
  return rows.filter((row) => filters.every((filter) => {
    if (filter.op === "eq") return row[filter.column] === filter.value;
    if (filter.op === "gte") return String(row[filter.column]) >= String(filter.value);
    if (filter.op === "lte") return String(row[filter.column]) <= String(filter.value);
    return true;
  }));
};

const createMealsQuery = () => {
  const filters: Array<{ op: string; column: string; value: unknown }> = [];
  const query = {
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ op: "eq", column, value });
      return query;
    }),
    gte: vi.fn((column: string, value: unknown) => {
      filters.push({ op: "gte", column, value });
      return query;
    }),
    lte: vi.fn((column: string, value: unknown) => {
      filters.push({ op: "lte", column, value });
      return query;
    }),
    order: vi.fn(async () => ({ data: filterRows(state.meals, filters), error: null })),
  };
  return query;
};

const createInsertQuery = (row: Record<string, unknown>) => ({
  select: vi.fn(() => ({
    single: vi.fn(async () => {
      const inserted = {
        id: "meal-created",
        logged_at: row.logged_at ?? "2026-05-12T08:00:00.000Z",
        created_at: "2026-05-12T08:00:01.000Z",
        updated_at: "2026-05-12T08:00:01.000Z",
        ...row,
      };
      state.meals.push(inserted);
      state.inserts.push(row);
      return { data: inserted, error: null };
    }),
  })),
});

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: state.user }, error: state.authError })),
  },
  from: vi.fn((table: string) => {
    if (table !== "meals") throw new Error(`unexpected table: ${table}`);
    return {
      select: vi.fn(() => createMealsQuery()),
      insert: vi.fn((row: Record<string, unknown>) => createInsertQuery(row)),
    };
  }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

describe("/api/meals collection route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.user = { id: "user-1" };
    state.authError = null;
    state.meals = [
      {
        id: "meal-1",
        user_id: "user-1",
        meal_slot: "lunch",
        source_text: "dal rice",
        items: [{ name: "dal", quantity_g: 150 }],
        kcal_low: 350,
        kcal_high: 450,
        kcal_lead: 400,
        confidence: 0.82,
        user_confirmed: true,
        logged_at: "2026-05-12T07:00:00.000Z",
        created_at: "2026-05-12T07:01:00.000Z",
        updated_at: "2026-05-12T07:01:00.000Z",
      },
      {
        id: "meal-2",
        user_id: "user-2",
        meal_slot: "dinner",
        source_text: "private meal",
        items: [{ name: "paneer", quantity_g: 100 }],
        kcal_low: 500,
        kcal_high: 650,
        kcal_lead: 575,
        confidence: 0.7,
        user_confirmed: true,
        logged_at: "2026-05-12T14:00:00.000Z",
        created_at: "2026-05-12T14:01:00.000Z",
        updated_at: "2026-05-12T14:01:00.000Z",
      },
    ];
    state.inserts = [];
  });

  it("GET returns only authenticated user's meals in safe envelope", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/meals?from=2026-05-12T00:00:00.000Z&to=2026-05-12T23:59:59.999Z", {
      headers: { "x-request-id": "req-meals-list" },
    }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.requestId).toBe("req-meals-list");
    expect(json.data.meals).toHaveLength(1);
    expect(json.data.meals[0].id).toBe("meal-1");
    expect(json.data.meals[0].source_text).toBe("dal rice");
  });

  it("POST creates a user-scoped confirmed meal after validation", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/meals", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "req-create" },
      body: JSON.stringify({
        mealSlot: "snack",
        sourceText: "banana and curd",
        items: [{ name: "banana", quantity_g: 120, household_unit: "1 medium" }],
        kcalLow: 180,
        kcalHigh: 260,
        kcalLead: 220,
        confidence: 0.76,
        loggedAt: "2026-05-12T09:00:00.000Z",
      }),
    }));

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.meal.id).toBe("meal-created");
    expect(state.inserts[0]).toMatchObject({
      user_id: "user-1",
      meal_slot: "snack",
      source_text: "banana and curd",
      kcal_low: 180,
      kcal_high: 260,
      kcal_lead: 220,
      user_confirmed: true,
      logged_at: "2026-05-12T09:00:00.000Z",
    });
  });

  it("returns 400 when kcal range is inconsistent", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/meals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mealSlot: "lunch",
        sourceText: "invalid meal",
        items: [{ name: "rice", quantity_g: 100 }],
        kcalLow: 500,
        kcalHigh: 300,
        kcalLead: 450,
        confidence: 0.5,
      }),
    }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(state.inserts).toHaveLength(0);
  });

  it("rejects unauthenticated collection requests", async () => {
    state.user = null;
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/meals"));

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });
});
