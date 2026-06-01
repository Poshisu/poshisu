import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn(async (): Promise<Record<string, unknown>> => ({ data: { user: { id: "user-1" } }, error: null }));
const resolveConfigMock = vi.fn(() => ({ provider: "openai", model: "gpt-5.2" }));
const isConfiguredMock = vi.fn((_provider?: unknown) => true);
const smokeTestMock = vi.fn(async (): Promise<Record<string, unknown>> => ({
  ok: true,
  provider: "openai",
  model: "gpt-5.2",
  promptVersion: "ai-chat-01-health-coach-v1",
  latencyMs: 123,
  outputTextPresent: true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: getUserMock } })),
}));

vi.mock("@/lib/agents/health-coach/llmProvider", () => ({
  resolveHealthCoachProviderConfig: () => resolveConfigMock(),
  isLlmConfigured: (provider: unknown) => isConfiguredMock(provider),
  smokeTestHealthCoachProvider: () => smokeTestMock(),
}));

describe("GET /api/health/llm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    resolveConfigMock.mockReturnValue({ provider: "openai", model: "gpt-5.2" });
    isConfiguredMock.mockReturnValue(true);
    smokeTestMock.mockResolvedValue({
      ok: true,
      provider: "openai",
      model: "gpt-5.2",
      promptVersion: "ai-chat-01-health-coach-v1",
      latencyMs: 123,
      outputTextPresent: true,
    });
  });

  it("returns safe config diagnostics without running a live provider check by default", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/health/llm", { headers: { "x-request-id": "req-health" } }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const json = await response.json();
    expect(json).toMatchObject({
      ok: true,
      requestId: "req-health",
      data: {
        provider: "openai",
        model: "gpt-5.2",
        apiKeyConfigured: true,
        checkRequested: false,
      },
    });
    expect(smokeTestMock).not.toHaveBeenCalled();
  });

  it("runs a live smoke check when check=1", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/health/llm?check=1"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.smoke).toMatchObject({ ok: true, outputTextPresent: true });
    expect(smokeTestMock).toHaveBeenCalledTimes(1);
  });

  it("returns safe failure details when the provider smoke check fails", async () => {
    smokeTestMock.mockResolvedValueOnce({
      ok: false,
      provider: "openai",
      model: "gpt-5.2",
      promptVersion: "ai-chat-01-health-coach-v1",
      latencyMs: 45,
      error: "model rejected",
      errorCode: "model_unavailable",
    });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/health/llm?check=1"));

    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json.error).toMatchObject({
      code: "LLM_UNAVAILABLE",
      details: { provider: "openai", model: "gpt-5.2", reason: "model_unavailable", apiKeyConfigured: true },
    });
  });

  it("requires an authenticated user", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/health/llm"));

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });
});
