import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1", email: "aarti@example.com" } as { id: string; email?: string } | null,
  authError: null as Error | null,
  tableErrors: {} as Record<string, Error>,
  requested: [] as Array<{ table: string; method: string; args: unknown[] }>,
  rows: {
    users: [{ id: "user-1", display_name: "Aarti", timezone: "Asia/Kolkata" }],
    user_profiles: [{ user_id: "user-1", primary_goal: "maintain" }],
    meals: [{ id: "meal-1", user_id: "user-1", source_text: "dal rice", kcal_lead: 420 }],
    messages: [{ id: "msg-1", user_id: "user-1", role: "user", content: "dal rice" }],
    memories: [{ id: "mem-1", user_id: "user-1", layer: "profile", key: "main", content: "# Profile" }],
    memories_history: [{ id: "hist-1", user_id: "user-1", layer: "profile", key: "main", content: "old" }],
    water_logs: [{ id: "water-1", user_id: "user-1", amount_ml: 300 }],
    nudge_schedules: [{ user_id: "user-1", enabled: true }],
    nudge_queue: [{ id: "nudge-1", user_id: "user-1", kind: "meal_check_in" }],
    push_subscriptions: [{ id: "push-1", user_id: "user-1", endpoint: "https://push.example/secret", p256dh: "secret-key", auth: "secret-auth", user_agent: "Test browser", created_at: "2026-05-12T00:00:00.000Z", last_used_at: null }],
  } as Record<string, Array<Record<string, unknown>>>,
};

function createQuery(table: string) {
  const query = {
    select: vi.fn((...args: unknown[]) => {
      state.requested.push({ table, method: "select", args });
      return query;
    }),
    eq: vi.fn((...args: unknown[]) => {
      state.requested.push({ table, method: "eq", args });
      return query;
    }),
    order: vi.fn((...args: unknown[]) => {
      state.requested.push({ table, method: "order", args });
      return query;
    }),
    then: (resolve: (value: { data: unknown[] | null; error: Error | null }) => unknown) => resolve({ data: state.rows[table] ?? [], error: state.tableErrors[table] ?? null }),
  };
  return query;
}

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: state.user }, error: state.authError })),
  },
  from: vi.fn((table: string) => createQuery(table)),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

describe("/api/privacy/export route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.user = { id: "user-1", email: "aarti@example.com" };
    state.authError = null;
    state.tableErrors = {};
    state.requested = [];
  });

  it("exports only authenticated user data and redacts push subscription secrets", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/privacy/export", { headers: { "x-request-id": "req-export" } }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain("nourish-data-export-user-1.json");
    const json = await response.json();
    expect(json).toMatchObject({
      ok: true,
      requestId: "req-export",
      export: {
        subject: { userId: "user-1", email: "aarti@example.com" },
        data: {
          users: [{ id: "user-1" }],
          meals: [{ id: "meal-1", source_text: "dal rice" }],
        },
      },
    });
    expect(json.export.data.push_subscriptions[0]).toEqual({
      id: "push-1",
      user_id: "user-1",
      endpoint_redacted: true,
      p256dh_redacted: true,
      auth_redacted: true,
      user_agent: "Test browser",
      created_at: "2026-05-12T00:00:00.000Z",
      last_used_at: null,
    });
    expect(JSON.stringify(json)).not.toContain("secret-key");
    expect(JSON.stringify(json)).not.toContain("secret-auth");
    expect(state.requested).toContainEqual({ table: "meals", method: "eq", args: ["user_id", "user-1"] });
    expect(state.requested).toContainEqual({ table: "users", method: "eq", args: ["id", "user-1"] });
    expect(state.requested).toContainEqual({ table: "memories_history", method: "order", args: ["changed_at", { ascending: true }] });
    expect(state.requested).toContainEqual({ table: "meals", method: "order", args: ["logged_at", { ascending: true }] });
  });

  it("rejects unauthenticated export requests", async () => {
    state.user = null;
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/privacy/export"));

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("returns a safe envelope when any export table read fails", async () => {
    state.tableErrors.meals = new Error("raw database failure");
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/privacy/export"));

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error.code).toBe("EXPORT_FAILED");
    expect(JSON.stringify(json)).not.toContain("raw database failure");
  });
});
