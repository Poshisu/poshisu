"use server";

import { withServerActionLogging } from "@/lib/errors/serverAction";
import { parseOnboardingAnswers } from "@/lib/onboarding/schema";
import { generateOnboardingProfile } from "@/lib/agents/onboarding-parser";

export const previewProfileAction = withServerActionLogging("previewOnboardingProfile", async (rawInput: unknown) => {
  const parsed = parseOnboardingAnswers(rawInput);
  const profileMarkdown = await generateOnboardingProfile(parsed);

  return {
    ok: true as const,
    profileMarkdown,
  };
});
