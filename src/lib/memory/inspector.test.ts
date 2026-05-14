import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1", email: "aarti@example.com", user_metadata: { name: "Aarti Rao" } } as {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null,
  requested: [] as Array<{ table?: string; method: string; args: unknown[] }>,
  memories: [] as Array<Record<string, unknown>>,
  history: [] as Array<Record<string, unknown>>,
};

function makeQuery(table: string) {
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
    limit: vi.fn(async (...args: unknown[]) => {
      state.requested.push({ table, method: "limit", args });
      return { data: table === "memories_history" ? state.history : [], error: null };
    }),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      resolve({ data: table === "memories" ? state.memories : state.history, error: null }),
  };
  return query;
}

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: state.user } })),
  },
  from: vi.fn((table: string) => makeQuery(table)),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

describe("loadProfileMemoryInspector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.user = { id: "user-1", email: "aarti@example.com", user_metadata: { name: "Aarti Rao" } };
    state.requested = [];
    state.memories = [];
    state.history = [];
  });

  it("loads the signed-in user's memory layers and audit history", async () => {
    const { loadProfileMemoryInspector } = await import("./inspector");
    state.memories = [
      {
        id: "mem-profile",
        layer: "profile",
        key: "main",
        content: "# Profile\n- Goal: maintain",
        version: 3,
        expires_at: null,
        created_at: "2026-05-10T08:00:00.000Z",
        updated_at: "2026-05-14T08:00:00.000Z",
      },
      {
        id: "mem-context",
        layer: "context",
        key: "2026-05-14",
        content: "Dinner was high sodium.",
        version: 1,
        expires_at: "2026-05-15T00:00:00.000Z",
        created_at: "2026-05-14T08:00:00.000Z",
        updated_at: "2026-05-14T08:00:00.000Z",
      },
    ];
    state.history = [
      {
        id: "hist-1",
        memory_id: "mem-profile",
        layer: "profile",
        key: "main",
        version: 2,
        changed_at: "2026-05-14T07:30:00.000Z",
        changed_by: "onboarding",
      },
    ];

    const result = await loadProfileMemoryInspector();

    expect(result.user).toMatchObject({ id: "user-1", email: "aarti@example.com", firstName: "Aarti" });
    expect(supabaseMock.from).toHaveBeenCalledWith("memories");
    expect(supabaseMock.from).toHaveBeenCalledWith("memories_history");
    expect(state.requested).toContainEqual({ table: "memories", method: "eq", args: ["user_id", "user-1"] });
    expect(state.requested).toContainEqual({ table: "memories_history", method: "eq", args: ["user_id", "user-1"] });
    expect(result.memories).toHaveLength(2);
    expect(result.memories[0]).toMatchObject({ id: "mem-profile", layer: "profile", key: "main", editable: true });
    expect(result.memories[1]).toMatchObject({ id: "mem-context", layer: "context", editable: false, expiresAt: "2026-05-15T00:00:00.000Z" });
    expect(result.auditHistory[0]).toMatchObject({ id: "hist-1", layer: "profile", key: "main", version: 2, changedBy: "onboarding" });
  });

  it("returns an empty authenticated state when no memories exist", async () => {
    const { loadProfileMemoryInspector } = await import("./inspector");

    const result = await loadProfileMemoryInspector();

    expect(result.user).toMatchObject({ id: "user-1" });
    expect(result.memories).toEqual([]);
    expect(result.auditHistory).toEqual([]);
  });

  it("returns a null user state when unauthenticated so the page can redirect", async () => {
    const { loadProfileMemoryInspector } = await import("./inspector");
    state.user = null;

    const result = await loadProfileMemoryInspector();

    expect(result).toEqual({ user: null, memories: [], auditHistory: [] });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
