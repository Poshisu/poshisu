import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1" } as { id: string } | null,
  meals: [] as Array<Record<string, unknown>>,
  nextUpdateError: null as { code: string; message: string } | null,
  nextDeleteError: null as { code: string; message: string } | null,
};

const filterRows = (filters: Array<{ column: string; value: unknown }>) => {
  return state.meals.filter((meal) => filters.every((filter) => meal[filter.column] === filter.value));
};

const createSingleResponse = (rows: Array<Record<string, unknown>>) => {
  if (rows.length === 0) return { data: null, error: { code: "PGRST116", message: "No rows" } };
  return { data: rows[0], error: null };
};

const createBaseQuery = () => {
  const filters: Array<{ column: string; value: unknown }> = [];
  const query = {
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ column, value });
      return query;
    }),
    select: vi.fn(() => ({
      single: vi.fn(async () => createSingleResponse(filterRows(filters))),
    })),
    single: vi.fn(async () => createSingleResponse(filterRows(filters))),
    then: undefined,
  };
  return query;
};

const createUpdateQuery = (patch: Record<string, unknown>) => {
  const filters: Array<{ column: string; value: unknown }> = [];
  const query = {
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ column, value });
      return query;
    }),
    select: vi.fn(() => ({
      single: vi.fn(async () => {
        if (state.nextUpdateError) {
          const error = state.nextUpdateError;
          state.nextUpdateError = null;
          return { data: null, error };
        }
        const match = filterRows(filters)[0];
        if (!match) return { data: null, error: { code: "PGRST116", message: "No rows" } };
        Object.assign(match, patch, { updated_at: "2026-05-12T10:00:00.000Z" });
        return { data: match, error: null };
      }),
    })),
  };
  return query;
};

const createDeleteQuery = () => {
  const filters: Array<{ column: string; value: unknown }> = [];
  const query = {
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ column, value });
      return query;
    }),
    select: vi.fn(() => ({
      single: vi.fn(async () => {
        if (state.nextDeleteError) {
          const error = state.nextDeleteError;
          state.nextDeleteError = null;
          return { data: null, error };
        }
        const match = filterRows(filters)[0];
        if (!match) return { data: null, error: { code: "PGRST116", message: "No rows" } };
        state.meals = state.meals.filter((meal) => meal !== match);
        return { data: match, error: null };
      }),
    })),
  };
  return query;
};

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: state.user }, error: null })),
  },
  from: vi.fn((table: string) => {
    if (table !== "meals") throw new Error(`unexpected table: ${table}`);
    return {
      select: vi.fn(() => createBaseQuery()),
      update: vi.fn((patch: Record<string, unknown>) => createUpdateQuery(patch)),
      delete: vi.fn(() => createDeleteQuery()),
    };
  }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

describe("/api/meals/[id] item route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.user = { id: "user-1" };
    state.nextUpdateError = null;
    state.nextDeleteError = null;
    state.meals = [
      {
        id: "11111111-1111-4111-8111-111111111111",
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
        id: "22222222-2222-4222-8222-222222222222",
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
  });

  it("PATCH updates only the authenticated user's meal", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(new Request("http://localhost/api/meals/11111111-1111-4111-8111-111111111111", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-request-id": "req-patch" },
      body: JSON.stringify({ kcalLead: 430, sourceText: "dal rice corrected", userCorrected: true }),
    }), { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.requestId).toBe("req-patch");
    expect(json.data.meal.kcal_lead).toBe(430);
    expect(json.data.meal.source_text).toBe("dal rice corrected");
    expect(json.data.meal.user_corrected).toBe(true);
  });

  it("PATCH returns 404 instead of exposing another user's meal", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(new Request("http://localhost/api/meals/22222222-2222-4222-8222-222222222222", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceText: "try to change" }),
    }), { params: Promise.resolve({ id: "22222222-2222-4222-8222-222222222222" }) });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error.code).toBe("MEAL_NOT_FOUND");
  });

  it("PATCH rejects partial kcal updates that would corrupt the stored range", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(new Request("http://localhost/api/meals/11111111-1111-4111-8111-111111111111", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kcalLead: 999 }),
    }), { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(state.meals.find((meal) => meal.id === "11111111-1111-4111-8111-111111111111")?.kcal_lead).toBe(400);
  });

  it("PATCH rejects malformed meal ids before querying storage", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(new Request("http://localhost/api/meals/not-a-uuid", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceText: "dal rice corrected" }),
    }), { params: Promise.resolve({ id: "not-a-uuid" }) });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("PATCH returns 500 for non-not-found database failures", async () => {
    state.nextUpdateError = { code: "XX000", message: "database unavailable" };
    const { PATCH } = await import("./route");

    const response = await PATCH(new Request("http://localhost/api/meals/11111111-1111-4111-8111-111111111111", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceText: "dal rice corrected" }),
    }), { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) });

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error.code).toBe("MEAL_UPDATE_FAILED");
  });

  it("DELETE removes only the authenticated user's meal", async () => {
    const { DELETE } = await import("./route");

    const response = await DELETE(new Request("http://localhost/api/meals/11111111-1111-4111-8111-111111111111", {
      method: "DELETE",
      headers: { "x-request-id": "req-delete" },
    }), { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.deletedMealId).toBe("11111111-1111-4111-8111-111111111111");
    expect(state.meals.map((meal) => meal.id)).toEqual(["22222222-2222-4222-8222-222222222222"]);
  });

  it("DELETE returns 404 instead of deleting another user's meal", async () => {
    const { DELETE } = await import("./route");

    const response = await DELETE(new Request("http://localhost/api/meals/22222222-2222-4222-8222-222222222222", { method: "DELETE" }), {
      params: Promise.resolve({ id: "22222222-2222-4222-8222-222222222222" }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error.code).toBe("MEAL_NOT_FOUND");
    expect(state.meals.find((meal) => meal.id === "22222222-2222-4222-8222-222222222222")).toBeTruthy();
  });

  it("DELETE rejects malformed meal ids before querying storage", async () => {
    const { DELETE } = await import("./route");

    const response = await DELETE(new Request("http://localhost/api/meals/not-a-uuid", { method: "DELETE" }), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("DELETE returns 500 for non-not-found database failures", async () => {
    state.nextDeleteError = { code: "XX000", message: "database unavailable" };
    const { DELETE } = await import("./route");

    const response = await DELETE(new Request("http://localhost/api/meals/11111111-1111-4111-8111-111111111111", { method: "DELETE" }), {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    });

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error.code).toBe("MEAL_DELETE_FAILED");
    expect(state.meals.find((meal) => meal.id === "11111111-1111-4111-8111-111111111111")).toBeTruthy();
  });

  it("rejects unauthenticated item mutations", async () => {
    state.user = null;
    const { DELETE } = await import("./route");

    const response = await DELETE(new Request("http://localhost/api/meals/11111111-1111-4111-8111-111111111111", { method: "DELETE" }), {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });
});
