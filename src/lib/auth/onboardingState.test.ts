import { describe, expect, it } from "vitest";
import { isOnboardingComplete } from "@/lib/auth/onboardingState";

describe("isOnboardingComplete", () => {
  it("returns true when onboarded_at is present", () => {
    expect(isOnboardingComplete({ onboarded_at: "2026-05-03T00:00:00.000Z" })).toBe(true);
  });

  it("returns false when onboarded_at is null or missing", () => {
    expect(isOnboardingComplete({ onboarded_at: null })).toBe(false);
    expect(isOnboardingComplete(null)).toBe(false);
    expect(isOnboardingComplete(undefined)).toBe(false);
  });
});
