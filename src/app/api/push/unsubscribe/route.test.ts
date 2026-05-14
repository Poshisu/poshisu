import { beforeEach, describe, expect, it, vi } from "vitest";

const endpoint = "https://push.example.com/send/token-1";

const state = {
  user: { id: "user-1" } as { id: string } | null,
  subscriptions: [] as Array<Record<string, unknown>>,
  deleteError: null as Error | null,
};

const createDeleteQuery = () => {
  const filters: Array<{ column: string; value: unknown }> = [];
  const query = {
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ column, value });
      return query;
    }),
    select: vi.fn(async () => {
      if (state.deleteError) return { data: null, error: state.deleteError };
      const deleted = state.subscriptions.filter((row) => filters.every((filter) => row[filter.column] === filter.value));
      state.subscriptions = state.subscriptions.filter((row) => !filters.every((filter) => row[filter.column] === filter.value));
      return { data: deleted.map((row) => ({ id: row.id, endpoint: row.endpoint })), error: null };
    }),
  };
  return query;
};

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: state.user }, error: null })),
  },
  from: vi.fn((table: string) => {
    if (table !== "push_subscriptions") throw new Error(`unexpected table: ${table}`);
    return { delete: vi.fn(() => createDeleteQuery()) };
  }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

describe("POST /api/push/unsubscribe", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.user = { id: "user-1" };
    state.deleteError = null;
    state.subscriptions = [
      { id: "push-1", user_id: "user-1", endpoint },
      { id: "push-private", user_id: "user-2", endpoint },
    ];
  });

  it("deletes only the authenticated user's matching endpoint", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "req-push-unsub" },
      body: JSON.stringify({ endpoint }),
    }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.requestId).toBe("req-push-unsub");
    expect(json.data.removed).toBe(1);
    expect(state.subscriptions).toEqual([{ id: "push-private", user_id: "user-2", endpoint }]);
  });

  it("is idempotent when the endpoint is not present", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: "https://push.example.com/send/missing" }),
    }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.removed).toBe(0);
    expect(state.subscriptions).toHaveLength(2);
  });

  it("rejects invalid endpoint payloads before deletion", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: "not-a-url" }),
    }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(state.subscriptions).toHaveLength(2);
  });

  it("rejects unauthenticated unsubscribe attempts", async () => {
    state.user = null;
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint }),
    }));

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns a safe envelope on storage failure", async () => {
    state.deleteError = new Error("raw delete failure");
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint }),
    }));

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error.code).toBe("PUSH_UNSUBSCRIBE_FAILED");
    expect(JSON.stringify(json)).not.toContain("raw delete failure");
  });
});
