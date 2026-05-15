import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1", email: "aarti@example.com" } as { id: string; email?: string } | null,
  authError: null as Error | null,
  adminCreateError: null as Error | null,
  rpcError: null as Error | null,
  rpcCalls: [] as Array<{ functionName: string; args: unknown }>,
};

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: state.user }, error: state.authError })),
    signOut: vi.fn(async () => ({ error: null })),
  },
};

const adminSupabaseMock = {
  rpc: vi.fn(async (functionName: string, args: unknown) => {
    state.rpcCalls.push({ functionName, args });
    return { data: null, error: state.rpcError };
  }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    if (state.adminCreateError) throw state.adminCreateError;
    return adminSupabaseMock;
  }),
}));

describe("/api/privacy/delete-account route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.user = { id: "user-1", email: "aarti@example.com" };
    state.authError = null;
    state.adminCreateError = null;
    state.rpcError = null;
    state.rpcCalls = [];
  });

  it("requires authentication", async () => {
    state.user = null;
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/privacy/delete-account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    }));

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    expect(adminSupabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("requires exact DELETE confirmation before destructive work", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/privacy/delete-account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: "delete" }),
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("CONFIRMATION_REQUIRED");
    expect(adminSupabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("calls the transactional account-deletion RPC and signs out", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/privacy/delete-account", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "req-delete" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, requestId: "req-delete", data: { deletedUserId: "user-1" } });
    expect(state.rpcCalls).toEqual([{ functionName: "delete_account_cascade", args: { p_user_id: "user-1" } }]);
    expect(supabaseMock.auth.signOut).toHaveBeenCalled();
  });

  it("returns a safe failure when transactional account deletion fails", async () => {
    state.rpcError = new Error("raw cleanup failure");
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/privacy/delete-account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    }));

    expect(response.status).toBe(500);
    expect((await response.json()).error.code).toBe("ACCOUNT_DELETE_FAILED");
    expect(state.rpcCalls).toEqual([{ functionName: "delete_account_cascade", args: { p_user_id: "user-1" } }]);
    expect(supabaseMock.auth.signOut).not.toHaveBeenCalled();
  });

  it("returns a safe error when admin deletion is unavailable", async () => {
    state.adminCreateError = new Error("missing service role key");
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/privacy/delete-account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    }));

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error.code).toBe("ACCOUNT_DELETE_UNAVAILABLE");
    expect(JSON.stringify(json)).not.toContain("service role");
  });
});
