import { beforeEach, describe, expect, it, vi } from "vitest";

const handleMessageMock = vi.fn();
const enforceRateLimitMock = vi.fn();

const insertedPayloads: Array<Record<string, unknown>> = [];

const expectedBlocks = [
  {
    type: "meal_log_candidate",
    summary: "I had roti and dal",
    needsConfirmation: true,
    confidence: "high",
    estimate: { kcalMin: 400, kcalMax: 500, protein: 18, carbs: 70, fat: 10, fiber: 8 },
    rationale: "Estimated from parsed foods.",
    clarificationQuestions: [],
    safetyFlags: { blocked: false, allergenFlags: [], conditionFlags: [], blockingReasons: [] },
    confirmPayload: {
      mealSlot: "other",
      sourceText: "I had roti and dal",
      items: [{ name: "roti", quantity_g: 100, household_unit: "estimated serving" }],
      kcalLow: 400,
      kcalHigh: 500,
      kcalLead: 450,
      confidence: 0.9,
    },
  },
  { type: "text", text: "I can log this meal." },
];

const createMessagesTable = () => {
  const insert = vi.fn((payload: Record<string, unknown>) => {
    insertedPayloads.push(payload);
    return {
      select: vi.fn(() => ({
        single: vi.fn(async () => {
          if (payload.role === "user") {
            return {
              data: {
                id: "msg-user-1",
                role: "user",
                kind: "text",
                content: String(payload.content),
                created_at: "2026-05-11T00:00:00.000Z",
              },
              error: null,
            };
          }

          return {
            data: {
              id: "msg-assistant-1",
              role: "assistant",
              kind: "text",
              content: String(payload.content),
              created_at: "2026-05-11T00:00:01.000Z",
              in_reply_to: "msg-user-1",
            },
            error: null,
          };
        }),
      })),
    };
  });

  return { insert };
};

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
  },
  from: vi.fn(() => createMessagesTable()),
};

vi.mock("@/lib/agents/orchestrator", () => ({
  handleMessage: (...args: unknown[]) => handleMessageMock(...args),
}));

vi.mock("@/lib/rate-limit/chat", () => ({
  enforceChatRateLimit: (...args: unknown[]) => enforceRateLimitMock(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedPayloads.length = 0;
    enforceRateLimitMock.mockResolvedValue({ allowed: true, resetAt: new Date(Date.now() + 60_000).toISOString() });
    handleMessageMock.mockResolvedValue({
      intent: "meal_log_candidate",
      blocks: expectedBlocks,
    });
  });

  it("returns safe envelope with requestId and orchestrator output", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "req-123" },
      body: JSON.stringify({ text: "I had roti and dal", allergies: ["dairy"] }),
    }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.requestId).toBe("req-123");
    expect(json.data.intent).toBe("meal_log_candidate");
    expect(json.data.blocks).toEqual(expectedBlocks);
    expect(json.data.usedFallback).toBe(false);
    expect(insertedPayloads[1].metadata).toMatchObject({
      intent: "meal_log_candidate",
      requestId: "req-123",
      usedFallback: false,
      mealCandidate: {
        confirmPayload: {
          mealSlot: "other",
          sourceText: "I had roti and dal",
        },
        safetyFlags: { blocked: false },
      },
    });
  });

  it("returns deterministic fallback payload when orchestrator throws", async () => {
    handleMessageMock.mockRejectedValueOnce(new Error("boom"));
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "I had lunch" }),
    }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.usedFallback).toBe(true);
    expect(json.data.assistantMessage.content).toContain("trouble processing");
  });

  it("returns 429 with retry-after when rate limited", async () => {
    enforceRateLimitMock.mockResolvedValueOnce({ allowed: false, resetAt: new Date(Date.now() + 45_000).toISOString() });
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
    const json = await response.json();
    expect(json.error.code).toBe("RATE_LIMITED");
  });
});
