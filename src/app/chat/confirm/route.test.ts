import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { confirmMealEstimateMock, state } = vi.hoisted(() => ({
  confirmMealEstimateMock: vi.fn(async () => ({ status: "saved" })),
  state: {
    user: { id: "user-1" } as { id: string } | null,
    authError: null as Error | null,
    message: null as Record<string, unknown> | null,
    messageError: null as Error | null,
  },
}));

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: state.user }, error: state.authError })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(function eq(this: Record<string, unknown>) {
        return this;
      }),
      single: vi.fn(async () => ({ data: state.message, error: state.messageError })),
    })),
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

vi.mock("@/lib/meals/confirm", () => ({
  confirmMealEstimate: confirmMealEstimateMock,
}));

function formRequest(fields: Record<string, string>) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.set(key, value));
  return new Request("http://localhost/chat/confirm", { method: "POST", body: formData });
}

const confirmPayload = {
  mealSlot: "breakfast" as const,
  sourceText: "I had idli and sambar for breakfast",
  items: [{ name: "idli", quantity_g: 100, household_unit: "estimated serving" }],
  kcalLow: 185,
  kcalHigh: 251,
  kcalLead: 218,
  confidence: 0.9,
};

describe("POST /chat/confirm", () => {
  beforeEach(() => {
    state.user = { id: "user-1" };
    state.authError = null;
    state.messageError = null;
    state.message = {
      id: "assistant-1",
      metadata: {
        mealCandidate: {
          confirmPayload,
          safetyFlags: { blocked: false, allergenFlags: [], conditionFlags: [], blockingReasons: [] },
        },
      },
    };
    confirmMealEstimateMock.mockClear();
    supabaseMock.from.mockClear();
  });

  it("confirms the server-stored candidate referenced by candidateId", async () => {
    const response = await POST(formRequest({ candidateId: "assistant-1" }));

    expect(confirmMealEstimateMock).toHaveBeenCalledWith(confirmPayload);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/today?status=saved");
  });

  it("rejects direct or malformed client payloads without throwing", async () => {
    const response = await POST(formRequest({ payload: "{not-json" }));

    expect(confirmMealEstimateMock).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/chat?error=invalid_confirm");
  });

  it("rejects safety-blocked candidates server-side", async () => {
    state.message = {
      id: "assistant-1",
      metadata: {
        mealCandidate: {
          confirmPayload,
          safetyFlags: { blocked: true, allergenFlags: ["peanut"], conditionFlags: [], blockingReasons: ["Peanut allergy conflict"] },
        },
      },
    };

    const response = await POST(formRequest({ candidateId: "assistant-1" }));

    expect(confirmMealEstimateMock).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/chat?error=safety_blocked");
  });

  it("rejects missing or unowned candidates", async () => {
    state.message = null;
    state.messageError = new Error("not found");

    const response = await POST(formRequest({ candidateId: "other-user-message" }));

    expect(confirmMealEstimateMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost/chat?error=invalid_confirm");
  });
});
