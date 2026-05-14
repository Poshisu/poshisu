import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeOnboardingAction } from "@/app/(onboarding)/actions";

const createClientMock = vi.fn();
const generateOnboardingProfileMock = vi.fn<(arg: unknown) => Promise<string>>(async () => "# Profile");
const adminInsertUserMock = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({ insert: adminInsertUserMock })),
  })),
}));

vi.mock("@/lib/onboarding/schema", () => ({
  parseOnboardingAnswers: vi.fn(() => ({
    name: "Aarti",
    age: 30,
    gender: "prefer-not-to-say",
    height_cm: 170,
    weight_kg: 70,
    city: "Mumbai",
    primary_goal: "maintain",
    goal_target_kg: null,
    goal_timeline_weeks: null,
    conditions: [],
    conditions_other: "",
    medications_affecting_diet: "",
    dietary_pattern: "none",
    allergies: [],
    dislikes: "",
    meal_times: { breakfast: "09:00", lunch: "13:00", dinner: "19:00" },
    eating_context: "mixed",
    estimation_preference: "midpoint",
  })),
}));

vi.mock("@/lib/agents/onboarding-parser", () => ({
  generateOnboardingProfile: (arg: unknown) => generateOnboardingProfileMock(arg),
  decideOnboardingParseMode: vi.fn(() => ({ mode: "extract", promptInput: "" })),
}));

vi.mock("@/lib/onboarding/message-events", () => ({
  parseMultimodalMessageEvent: vi.fn(),
}));

vi.mock("@/lib/onboarding/transcription", () => ({
  transcribeOnboardingAudio: vi.fn(),
}));

function makeSupabaseClient(overrides?: {
  onboardedAt?: string | null;
  userRowMissing?: boolean;
  userInsertError?: string | null;
  userUpdateError?: string | null;
  userUpdateRows?: Array<{ onboarded_at: string | null }> | null;
  latestOnboardedAfterRace?: string | null;
}) {
  const upsert = vi.fn(async () => ({ error: null }));
  const insertUser = vi.fn(async () => ({ error: overrides?.userInsertError ? { message: overrides.userInsertError } : null }));
  const del = vi.fn(async () => ({ error: null }));

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-1", email: "aarti@example.com", user_metadata: { name: "Aarti Rao" } } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn(() => {
            const readQuery = {
              eq: vi.fn(() => readQuery),
              single: vi.fn(async () => ({ data: { onboarded_at: overrides?.latestOnboardedAfterRace ?? overrides?.onboardedAt ?? null }, error: null })),
              maybeSingle: vi.fn(async () => ({
                data: overrides?.userRowMissing ? null : { onboarded_at: overrides?.onboardedAt ?? null },
                error: null,
              })),
            };
            return readQuery;
          }),
          insert: insertUser,
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                select: vi.fn(async () => ({
                  data: overrides?.userUpdateRows ?? [{ onboarded_at: "2026-05-11T00:00:00.000Z" }],
                  error: overrides?.userUpdateError ? { message: overrides.userUpdateError } : null,
                })),
              })),
            })),
          })),
        };
      }

      if (table === "memories") {
        return {
          upsert,
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: del,
              })),
            })),
          })),
        };
      }

      return { upsert };
    }),
    __spies: { upsert, insertUser, del },
  };
}

describe("completeOnboardingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateOnboardingProfileMock.mockResolvedValue("# Profile");
  });

  it("returns already_completed when user is already onboarded", async () => {
    const supabase = makeSupabaseClient({ onboardedAt: "2026-05-10T00:00:00.000Z" });
    createClientMock.mockResolvedValue(supabase);

    const result = await completeOnboardingAction({ onboarding_session_token: "session-12345678" });

    expect(result.status).toBe("already_completed");
    expect(supabase.__spies.upsert).not.toHaveBeenCalled();
  });

  it("continues onboarding with deterministic fallback profile when profile generation fails", async () => {
    generateOnboardingProfileMock.mockRejectedValueOnce(new Error("anthropic unavailable"));
    const supabase = makeSupabaseClient();
    createClientMock.mockResolvedValue(supabase);

    const result = await completeOnboardingAction({ onboarding_session_token: "session-12345678" });

    expect(result.status).toBe("completed");
    expect(result.profileMarkdown).toContain("# Profile");
    expect(result.profileMarkdown).toContain("Name: Aarti");
    expect(result.profileMarkdown).toContain("Goal: maintain");
    expect(result.profileMarkdown).not.toContain("undefined");
    expect(supabase.__spies.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", layer: "profile", key: "main", content: result.profileMarkdown }),
      { onConflict: "user_id,layer,key" },
    );
    expect(supabase.__spies.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", layer: "patterns", key: "main" }),
      { onConflict: "user_id,layer,key" },
    );
  });

  it("creates the public users row before completing onboarding when auth trigger did not backfill it", async () => {
    const supabase = makeSupabaseClient({ userRowMissing: true });
    createClientMock.mockResolvedValue(supabase);

    const result = await completeOnboardingAction({ onboarding_session_token: "session-12345678" });

    expect(result.status).toBe("completed");
    expect(adminInsertUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1", display_name: "Aarti Rao" }),
    );
    expect(supabase.__spies.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", layer: "profile", key: "main" }),
      { onConflict: "user_id,layer,key" },
    );
  });

  it("rolls back memories and throws on final user update failure", async () => {
    const supabase = makeSupabaseClient({ userUpdateError: "failed update" });
    createClientMock.mockResolvedValue(supabase);

    await expect(completeOnboardingAction({ onboarding_session_token: "session-12345678" })).rejects.toThrow(
      /partially saved/i,
    );
    expect(supabase.__spies.del).toHaveBeenCalled();
  });

  it("returns already_completed when users update races and onboarded_at is now set", async () => {
    const supabase = makeSupabaseClient({
      userUpdateRows: [],
      latestOnboardedAfterRace: "2026-05-11T00:00:00.000Z",
    });
    createClientMock.mockResolvedValue(supabase);

    const result = await completeOnboardingAction({ onboarding_session_token: "session-12345678" });
    expect(result.status).toBe("already_completed");
  });

  it("rolls back and throws when users update writes no rows and latest state is still not onboarded", async () => {
    const supabase = makeSupabaseClient({ userUpdateRows: [], latestOnboardedAfterRace: null });
    createClientMock.mockResolvedValue(supabase);

    await expect(completeOnboardingAction({ onboarding_session_token: "session-12345678" })).rejects.toThrow(
      /partially saved/i,
    );
    expect(supabase.__spies.del).toHaveBeenCalled();
  });
});
