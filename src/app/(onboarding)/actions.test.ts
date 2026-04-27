import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, generateProfileMock, adminFromMock, adminUpdateMock, adminEqMock, adminUpsertMock } =
  vi.hoisted(() => ({
    getUserMock: vi.fn(),
    generateProfileMock: vi.fn(),
    adminFromMock: vi.fn(),
    adminUpdateMock: vi.fn(),
    adminEqMock: vi.fn(),
    adminUpsertMock: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({
    from: adminFromMock,
  })),
}));

vi.mock("@/lib/agents/onboarding-parser", () => ({
  generateProfileViaAgent: generateProfileMock,
}));

import { buildProfileMarkdown } from "@/lib/onboarding/profileTemplate";
import type { OnboardingAnswers } from "@/lib/onboarding/types";
import { getAdminClient } from "@/lib/supabase/admin";
import { submitOnboarding } from "./actions";

const baseAnswers: OnboardingAnswers = {
  name: "Aarti",
  age: 34,
  gender: "female",
  height_cm: 162,
  weight_kg: 68,
  primary_goal: "lose-weight",
  goal_target_kg: 60,
  goal_timeline_weeks: 24,
  conditions: ["pcos"],
  dietary_pattern: "veg-egg",
  allergies: ["peanuts"],
  meal_times: { breakfast: "08:30", lunch: "13:30", dinner: "20:30" },
  eating_context: "mixed",
  estimation_preference: "conservative",
};

const validMd = buildProfileMarkdown(baseAnswers);

function setupAdminChain({ updateError = null, upsertError = null }: { updateError?: { message: string } | null; upsertError?: { message: string } | null } = {}) {
  // users.update(...).eq(...) chain
  adminEqMock.mockResolvedValue({ error: updateError });
  adminUpdateMock.mockReturnValue({ eq: adminEqMock });
  // memories.upsert(...)
  adminUpsertMock.mockResolvedValue({ error: upsertError });
  adminFromMock.mockImplementation((table: string) => {
    if (table === "users") return { update: adminUpdateMock };
    if (table === "memories") return { upsert: adminUpsertMock };
    return {};
  });
  vi.mocked(getAdminClient).mockReturnValue({ from: adminFromMock } as never);
}

function isRedirectError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const digest = (err as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

describe("submitOnboarding", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    generateProfileMock.mockReset();
    adminFromMock.mockReset();
    adminUpdateMock.mockReset();
    adminEqMock.mockReset();
    adminUpsertMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    generateProfileMock.mockResolvedValue(validMd);
    setupAdminChain();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects to /onboarding/review on success", async () => {
    let caught: unknown;
    try {
      await submitOnboarding(baseAnswers);
    } catch (err) {
      caught = err;
    }
    expect(isRedirectError(caught)).toBe(true);
    // The redirect digest encodes the destination path.
    expect((caught as { digest: string }).digest).toContain("/onboarding/review");
  });

  it("calls the parser agent with the user id", async () => {
    try {
      await submitOnboarding(baseAnswers);
    } catch {}
    expect(generateProfileMock).toHaveBeenCalledWith(baseAnswers, { userId: "u-1" });
  });

  it("falls back to the deterministic template when the agent throws", async () => {
    generateProfileMock.mockRejectedValueOnce(new Error("model overloaded"));
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      await submitOnboarding(baseAnswers);
    } catch {}

    expect(consoleSpy).toHaveBeenCalledWith(
      "[submitOnboarding] parser agent failed, using template fallback",
      expect.objectContaining({ error: "model overloaded" }),
    );
    // The upsert payload should contain template-shaped markdown.
    const upsertedRows = adminUpsertMock.mock.calls[0][0] as Array<{ layer: string; content: string }>;
    const profileRow = upsertedRows.find((r) => r.layer === "profile");
    expect(profileRow?.content).toMatch(/^# Profile for Aarti/);
  });

  it("writes display_name, estimation_preference, onboarding_answers, onboarded_at to users", async () => {
    try {
      await submitOnboarding(baseAnswers);
    } catch {}

    const updatePayload = adminUpdateMock.mock.calls[0][0];
    expect(updatePayload.display_name).toBe("Aarti");
    expect(updatePayload.estimation_preference).toBe("conservative");
    expect(updatePayload.onboarding_answers).toMatchObject({ name: "Aarti", age: 34 });
    expect(updatePayload.onboarded_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(adminEqMock).toHaveBeenCalledWith("id", "u-1");
  });

  it("upserts both profile and patterns memory rows", async () => {
    try {
      await submitOnboarding(baseAnswers);
    } catch {}

    const upsertedRows = adminUpsertMock.mock.calls[0][0] as Array<{ user_id: string; layer: string; key: string; content: string }>;
    expect(upsertedRows).toHaveLength(2);
    const profile = upsertedRows.find((r) => r.layer === "profile");
    const patterns = upsertedRows.find((r) => r.layer === "patterns");
    expect(profile).toMatchObject({ user_id: "u-1", layer: "profile", key: "main" });
    expect(profile?.content).toBe(validMd);
    expect(patterns).toMatchObject({ user_id: "u-1", layer: "patterns", key: "main", content: "" });
    expect(adminUpsertMock.mock.calls[0][1]).toEqual({ onConflict: "user_id,layer,key" });
  });

  it("returns a 'session expired' error when not authenticated", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

    const result = await submitOnboarding(baseAnswers);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/session expired/i) });
    expect(generateProfileMock).not.toHaveBeenCalled();
  });

  it("returns a generic error when the answers fail Zod validation", async () => {
    const bad = { ...baseAnswers, age: 5 };

    const result = await submitOnboarding(bad as unknown as OnboardingAnswers);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/don't look right/i) });
    expect(generateProfileMock).not.toHaveBeenCalled();
  });

  it("returns a generic error when the admin client is unavailable", async () => {
    vi.mocked(getAdminClient).mockReturnValueOnce(null);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await submitOnboarding(baseAnswers);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/couldn't save/i) });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("returns a generic error when the users update fails", async () => {
    setupAdminChain({ updateError: { message: "permission denied" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await submitOnboarding(baseAnswers);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/couldn't save/i) });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("returns a generic error when the memories upsert fails", async () => {
    setupAdminChain({ upsertError: { message: "constraint violation" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await submitOnboarding(baseAnswers);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/couldn't save/i) });
    expect(consoleSpy).toHaveBeenCalled();
  });
});
