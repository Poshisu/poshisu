import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1" } as { id: string } | null,
  authError: null as Error | null,
  memories: [] as Array<Record<string, unknown>>,
  upserts: [] as Array<Record<string, unknown>>,
  selectError: null as Error | null,
  upsertError: null as Error | null,
};

const seedMemories = () => [
  {
    id: "memory-profile-1",
    user_id: "user-1",
    layer: "profile",
    key: "main",
    content: "# Profile\nVegetarian, wants steady energy.",
    version: 2,
    expires_at: null,
    created_at: "2026-05-12T07:00:00.000Z",
    updated_at: "2026-05-12T08:00:00.000Z",
  },
  {
    id: "memory-patterns-1",
    user_id: "user-1",
    layer: "patterns",
    key: "main",
    content: "# Patterns\nUsually logs lunch late.",
    version: 1,
    expires_at: null,
    created_at: "2026-05-12T07:05:00.000Z",
    updated_at: "2026-05-12T07:05:00.000Z",
  },
  {
    id: "memory-private-1",
    user_id: "user-2",
    layer: "profile",
    key: "main",
    content: "# Private profile",
    version: 1,
    expires_at: null,
    created_at: "2026-05-12T07:10:00.000Z",
    updated_at: "2026-05-12T07:10:00.000Z",
  },
  {
    id: "memory-daily-1",
    user_id: "user-1",
    layer: "daily",
    key: "2026-05-12",
    content: "Daily summary",
    version: 1,
    expires_at: null,
    created_at: "2026-05-12T07:15:00.000Z",
    updated_at: "2026-05-12T07:15:00.000Z",
  },
];

const filterRows = (
  rows: Array<Record<string, unknown>>,
  filters: Array<{ column: string; value: unknown }>,
  inFilters: Array<{ column: string; values: unknown[] }>,
) => rows.filter((row) => (
  filters.every((filter) => row[filter.column] === filter.value)
  && inFilters.every((filter) => filter.values.includes(row[filter.column]))
));

const createMemorySelectQuery = () => {
  const filters: Array<{ column: string; value: unknown }> = [];
  const inFilters: Array<{ column: string; values: unknown[] }> = [];
  const query = {
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ column, value });
      return query;
    }),
    in: vi.fn((column: string, values: unknown[]) => {
      inFilters.push({ column, values });
      return query;
    }),
    order: vi.fn(async () => ({ data: filterRows(state.memories, filters, inFilters), error: state.selectError })),
  };
  return query;
};

const createMemoryUpsertQuery = (row: Record<string, unknown>) => ({
  select: vi.fn(() => ({
    single: vi.fn(async () => {
      if (state.upsertError) return { data: null, error: state.upsertError };

      state.upserts.push(row);
      const existingIndex = state.memories.findIndex((memory) => memory.user_id === row.user_id && memory.layer === row.layer && memory.key === row.key);
      const upserted = {
        id: existingIndex >= 0 ? state.memories[existingIndex].id : "memory-created",
        version: existingIndex >= 0 ? Number(state.memories[existingIndex].version) + 1 : 1,
        expires_at: null,
        created_at: existingIndex >= 0 ? state.memories[existingIndex].created_at : "2026-05-12T09:00:00.000Z",
        updated_at: "2026-05-12T09:00:00.000Z",
        ...row,
      };

      if (existingIndex >= 0) state.memories[existingIndex] = upserted;
      else state.memories.push(upserted);

      return { data: upserted, error: null };
    }),
  })),
});

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: state.user }, error: state.authError })),
  },
  from: vi.fn((table: string) => {
    if (table !== "memories") throw new Error(`unexpected table: ${table}`);
    return {
      select: vi.fn(() => createMemorySelectQuery()),
      upsert: vi.fn((row: Record<string, unknown>) => createMemoryUpsertQuery(row)),
    };
  }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

describe("/api/memory route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.user = { id: "user-1" };
    state.authError = null;
    state.memories = seedMemories();
    state.upserts = [];
    state.selectError = null;
    state.upsertError = null;
  });

  it("GET returns current user's profile and patterns memories by default", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/memory", {
      headers: { "x-request-id": "req-memory-list" },
    }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.requestId).toBe("req-memory-list");
    expect(json.data.memories).toHaveLength(2);
    expect(json.data.memories.map((memory: Record<string, unknown>) => `${memory.layer}/${memory.key}`)).toEqual(["profile/main", "patterns/main"]);
    expect(json.data.memories.some((memory: Record<string, unknown>) => memory.content === "# Private profile")).toBe(false);
  });

  it("GET filters by layer and key for the authenticated user", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/memory?layer=profile&key=main"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.memories).toHaveLength(1);
    expect(json.data.memories[0]).toMatchObject({
      id: "memory-profile-1",
      layer: "profile",
      key: "main",
      content: "# Profile\nVegetarian, wants steady energy.",
      version: 2,
      updatedAt: "2026-05-12T08:00:00.000Z",
    });
  });

  it("GET rejects invalid query params before querying storage", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/memory?layer=private&key=main"));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("GET rejects unauthenticated requests", async () => {
    state.user = null;
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/memory"));

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("GET returns a safe envelope on storage failure", async () => {
    state.selectError = new Error("raw database failure");
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/memory"));

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error.code).toBe("MEMORY_READ_FAILED");
    expect(JSON.stringify(json)).not.toContain("raw database failure");
  });

  it("PUT upserts profile/main with server-side user scope", async () => {
    const { PUT } = await import("./route");

    const response = await PUT(new Request("http://localhost/api/memory", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-request-id": "req-memory-write" },
      body: JSON.stringify({
        layer: "profile",
        key: "main",
        content: "# Profile\nVegetarian. Updated target: maintain energy.",
      }),
    }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.requestId).toBe("req-memory-write");
    expect(json.data.memory).toMatchObject({
      id: "memory-profile-1",
      layer: "profile",
      key: "main",
      content: "# Profile\nVegetarian. Updated target: maintain energy.",
      version: 3,
    });
    expect(state.upserts[0]).toMatchObject({
      user_id: "user-1",
      layer: "profile",
      key: "main",
      content: "# Profile\nVegetarian. Updated target: maintain energy.",
    });
  });

  it("PUT upserts patterns/main with server-side user scope", async () => {
    const { PUT } = await import("./route");

    const response = await PUT(new Request("http://localhost/api/memory", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        layer: "patterns",
        key: "main",
        content: "# Patterns\nPrefers concise meal confirmations.",
      }),
    }));

    expect(response.status).toBe(200);
    expect(state.upserts[0]).toMatchObject({
      user_id: "user-1",
      layer: "patterns",
      key: "main",
    });
  });

  it("PUT rejects disallowed writable layers", async () => {
    const { PUT } = await import("./route");

    const response = await PUT(new Request("http://localhost/api/memory", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        layer: "daily",
        key: "2026-05-12",
        content: "User should not directly update generated daily memory.",
      }),
    }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(state.upserts).toHaveLength(0);
  });

  it("PUT rejects invalid content before mutating storage", async () => {
    const { PUT } = await import("./route");

    const response = await PUT(new Request("http://localhost/api/memory", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ layer: "profile", key: "main", content: "" }),
    }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(state.upserts).toHaveLength(0);
  });

  it("PUT rejects unauthenticated requests", async () => {
    state.user = null;
    const { PUT } = await import("./route");

    const response = await PUT(new Request("http://localhost/api/memory", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ layer: "profile", key: "main", content: "# Profile" }),
    }));

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("PUT returns a safe envelope on storage failure", async () => {
    state.upsertError = new Error("raw upsert failure");
    const { PUT } = await import("./route");

    const response = await PUT(new Request("http://localhost/api/memory", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ layer: "profile", key: "main", content: "# Profile\nUpdated" }),
    }));

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error.code).toBe("MEMORY_WRITE_FAILED");
    expect(JSON.stringify(json)).not.toContain("raw upsert failure");
  });
});
