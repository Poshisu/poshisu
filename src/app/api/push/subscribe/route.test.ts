import { beforeEach, describe, expect, it, vi } from "vitest";

const validSubscription = {
  endpoint: "https://push.example.com/send/token-1",
  keys: {
    p256dh: "p256dh_key_1234567890abcdef",
    auth: "auth_key_1234567890abcdef",
  },
};

const state = {
  user: { id: "user-1" } as { id: string } | null,
  authError: null as Error | null,
  subscriptions: [] as Array<Record<string, unknown>>,
  upserts: [] as Array<Record<string, unknown>>,
  upsertOptions: [] as Array<Record<string, unknown>>,
  cleanupErrors: [] as Array<Error | null>,
  upsertError: null as Error | null,
};

const upsertSpy = vi.fn((row: Record<string, unknown>, options: Record<string, unknown>) => ({
  select: vi.fn(() => ({
    single: vi.fn(async () => {
      if (state.upsertError) return { data: null, error: state.upsertError };
      state.upserts.push(row);
      state.upsertOptions.push(options);
      const existingIndex = state.subscriptions.findIndex(
        (subscription) => subscription.user_id === row.user_id && subscription.endpoint === row.endpoint,
      );
      const saved = {
        id: existingIndex >= 0 ? state.subscriptions[existingIndex].id : "push-sub-1",
        created_at: existingIndex >= 0 ? state.subscriptions[existingIndex].created_at : "2026-05-14T08:00:00.000Z",
        ...row,
      };
      if (existingIndex >= 0) state.subscriptions[existingIndex] = saved;
      else state.subscriptions.push(saved);
      return { data: saved, error: null };
    }),
  })),
}));

const serverSupabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: state.user }, error: state.authError })),
  },
  from: vi.fn((table: string) => {
    if (table !== "push_subscriptions") throw new Error(`unexpected table: ${table}`);
    return { upsert: upsertSpy };
  }),
};

const cleanupNeqSpy = vi.fn(async (_column: string, currentUserId: string) => {
  const error = state.cleanupErrors.shift() ?? null;
  if (!error) {
    state.subscriptions = state.subscriptions.filter((subscription) => subscription.user_id === currentUserId);
  }
  return { error };
});
const cleanupEqSpy = vi.fn(() => ({ neq: cleanupNeqSpy }));
const cleanupDeleteSpy = vi.fn(() => ({ eq: cleanupEqSpy }));
const adminSupabaseMock = {
  from: vi.fn((table: string) => {
    if (table !== "push_subscriptions") throw new Error(`unexpected admin table: ${table}`);
    return { delete: cleanupDeleteSpy };
  }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => serverSupabaseMock),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => adminSupabaseMock),
}));

describe("POST /api/push/subscribe", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.user = { id: "user-1" };
    state.authError = null;
    state.subscriptions = [];
    state.upserts = [];
    state.upsertOptions = [];
    state.cleanupErrors = [];
    state.upsertError = null;
  });

  it("upserts an authenticated user's browser push subscription", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "req-push-sub", "user-agent": "Playwright" },
      body: JSON.stringify({ subscription: validSubscription }),
    }));

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.requestId).toBe("req-push-sub");
    expect(json.data.subscription).toMatchObject({
      id: "push-sub-1",
      endpoint: validSubscription.endpoint,
      userAgent: "Playwright",
    });
    expect(state.upserts[0]).toMatchObject({
      user_id: "user-1",
      endpoint: validSubscription.endpoint,
      p256dh: validSubscription.keys.p256dh,
      auth: validSubscription.keys.auth,
      user_agent: "Playwright",
    });
    expect(upsertSpy).toHaveBeenCalledWith(expect.objectContaining({ endpoint: validSubscription.endpoint }), { onConflict: "user_id,endpoint" });
  });

  it("removes the same endpoint from other users before saving current ownership", async () => {
    state.subscriptions = [
      { id: "other", user_id: "other-user", endpoint: validSubscription.endpoint },
      { id: "same", user_id: "user-1", endpoint: validSubscription.endpoint },
    ];
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: validSubscription }),
    }));

    expect(response.status).toBe(201);
    expect(cleanupEqSpy).toHaveBeenCalledWith("endpoint", validSubscription.endpoint);
    expect(cleanupNeqSpy).toHaveBeenCalledWith("user_id", "user-1");
    expect(state.subscriptions.some((subscription) => subscription.user_id === "other-user")).toBe(false);
  });

  it("updates an existing user+endpoint subscription instead of duplicating it", async () => {
    state.subscriptions = [{
      id: "push-existing",
      user_id: "user-1",
      endpoint: validSubscription.endpoint,
      p256dh: "old_key_1234567890abcdef",
      auth: "old_auth_1234567890abcdef",
      user_agent: "Old UA",
      created_at: "2026-05-13T08:00:00.000Z",
      last_used_at: null,
    }];
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "New UA" },
      body: JSON.stringify({ subscription: validSubscription }),
    }));

    expect(response.status).toBe(201);
    expect(state.subscriptions).toHaveLength(1);
    expect(state.subscriptions[0]).toMatchObject({ id: "push-existing", p256dh: validSubscription.keys.p256dh, user_agent: "New UA" });
  });

  it("rejects invalid and non-HTTPS subscription payloads before storage writes", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: { endpoint: "http://push.example.com/send/token-1", keys: { p256dh: "short", auth: "short" } } }),
    }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(state.upserts).toHaveLength(0);
    expect(cleanupDeleteSpy).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON before storage writes", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("INVALID_JSON");
    expect(state.upserts).toHaveLength(0);
    expect(cleanupDeleteSpy).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated subscription attempts", async () => {
    state.user = null;
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: validSubscription }),
    }));

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
    expect(cleanupDeleteSpy).not.toHaveBeenCalled();
  });

  it("rejects auth errors without storage writes", async () => {
    state.authError = new Error("expired session");
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: validSubscription }),
    }));

    expect(response.status).toBe(401);
    expect(cleanupDeleteSpy).not.toHaveBeenCalled();
    expect(state.upserts).toHaveLength(0);
  });

  it("returns a safe envelope on cleanup failure", async () => {
    state.cleanupErrors = [new Error("raw cleanup failure")];
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: validSubscription }),
    }));

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error.code).toBe("PUSH_SUBSCRIBE_FAILED");
    expect(JSON.stringify(json)).not.toContain("raw cleanup failure");
    expect(state.upserts).toHaveLength(0);
  });

  it("returns a safe envelope on storage failure", async () => {
    state.upsertError = new Error("raw database failure");
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: validSubscription }),
    }));

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error.code).toBe("PUSH_SUBSCRIBE_FAILED");
    expect(JSON.stringify(json)).not.toContain("raw database failure");
  });
});
