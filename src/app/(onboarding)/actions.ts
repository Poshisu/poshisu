"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import { withServerActionLogging } from "@/lib/errors/serverAction";
import { parseOnboardingAnswers } from "@/lib/onboarding/schema";
import { generateOnboardingProfile } from "@/lib/agents/onboarding-parser";
import { createClient } from "@/lib/supabase/server";

type OnboardingErrorCategory = "validation" | "auth" | "idempotency" | "persistence" | "partial_write";

class OnboardingPersistenceError extends Error {
  constructor(
    message: string,
    public readonly category: OnboardingErrorCategory,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "OnboardingPersistenceError";
  }
}

const completeOnboardingMetaSchema = z.object({
  onboarding_session_token: z.string().trim().min(8).max(128).optional(),
});

const patternsSeed = "# Patterns\n\n_No patterns yet. I'll learn from your first week of logs._";

function buildOnboardingOperationKey(userId: string, sessionToken: string | undefined, payload: unknown): string {
  const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
  const scopedSession = sessionToken ?? "missing-session-token";
  return `onboarding:${userId}:${scopedSession}:${payloadHash}`;
}

function logOnboardingStep(step: string, metadata: Record<string, unknown>) {
  console.info(`[onboarding.complete] ${step}`, metadata);
}

export const previewProfileAction = withServerActionLogging("previewOnboardingProfile", async (rawInput: unknown) => {
  const parsed = parseOnboardingAnswers(rawInput);
  const profileMarkdown = await generateOnboardingProfile(parsed);

  return {
    ok: true as const,
    profileMarkdown,
  };
});

export const completeOnboardingAction = withServerActionLogging("completeOnboarding", async (rawInput: unknown) => {
  const meta = completeOnboardingMetaSchema.parse(rawInput);
  const input = parseOnboardingAnswers(rawInput);
  const profileMarkdown = await generateOnboardingProfile(input);

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new OnboardingPersistenceError("Unauthorized onboarding attempt", "auth", false);
  }

  const operationKey = buildOnboardingOperationKey(user.id, meta.onboarding_session_token, input);

  const { data: existingUser, error: existingUserError } = await supabase
    .from("users" as never)
    .select("onboarded_at" as never)
    .eq("id", user.id)
    .single();
  if (existingUserError) {
    throw new OnboardingPersistenceError(`Failed to load current onboarding state: ${existingUserError.message}`, "persistence", true);
  }

  if ((existingUser as { onboarded_at: string | null }).onboarded_at) {
    logOnboardingStep("already_complete", { userId: user.id, operationKey });
    return { ok: true as const, profileMarkdown, operationKey, status: "already_completed" as const };
  }

  const profilePayload = {
    user_id: user.id,
    age: input.age,
    gender: input.gender,
    height_cm: input.height_cm,
    weight_kg: input.weight_kg,
    city: input.city || null,
    primary_goal: input.primary_goal,
    goal_target_kg: input.goal_target_kg ?? null,
    goal_timeline_weeks: input.goal_timeline_weeks ?? null,
    conditions: input.conditions,
    conditions_other: input.conditions_other || null,
    medications: input.medications_affecting_diet || null,
    dietary_pattern: input.dietary_pattern,
    allergies: input.allergies,
    dislikes: input.dislikes || null,
    meal_times: input.meal_times,
    eating_context: input.eating_context,
  };

  logOnboardingStep("write_user_profiles", { userId: user.id, operationKey });
  const { error: profileError } = await supabase.from("user_profiles" as never).upsert(profilePayload as never, { onConflict: "user_id" });
  if (profileError) throw new OnboardingPersistenceError(`Failed to save user profile: ${profileError.message}`, "persistence", true);

  logOnboardingStep("write_memories_profile", { userId: user.id, operationKey, layer: "profile", key: "main" });
  const { error: profileMemoryError } = await supabase.from("memories" as never).upsert(
    ({
      user_id: user.id,
      layer: "profile",
      key: "main",
      content: profileMarkdown,
    } as never),
    { onConflict: "user_id,layer,key" },
  );
  if (profileMemoryError) throw new OnboardingPersistenceError(`Failed to save profile memory: ${profileMemoryError.message}`, "persistence", true);

  logOnboardingStep("write_memories_patterns", { userId: user.id, operationKey, layer: "patterns", key: "main" });
  const { error: patternsMemoryError } = await supabase.from("memories" as never).upsert(
    ({
      user_id: user.id,
      layer: "patterns",
      key: "main",
      content: patternsSeed,
    } as never),
    { onConflict: "user_id,layer,key" },
  );
  if (patternsMemoryError) throw new OnboardingPersistenceError(`Failed to save patterns memory: ${patternsMemoryError.message}`, "persistence", true);

  const onboardedAt = new Date().toISOString();
  logOnboardingStep("write_users_onboarded_at", { userId: user.id, operationKey });
  const { error: userUpdateError } = await supabase
    .from("users" as never)
    .update({ onboarded_at: onboardedAt, estimation_preference: input.estimation_preference } as never)
    .eq("id", user.id)
    .is("onboarded_at", null);

  if (userUpdateError) {
    logOnboardingStep("compensate_on_failure", { userId: user.id, operationKey, reason: "users_update_failed" });
    await supabase.from("memories" as never).delete().eq("user_id", user.id).eq("layer", "patterns").eq("key", "main");
    await supabase.from("memories" as never).delete().eq("user_id", user.id).eq("layer", "profile").eq("key", "main");

    throw new OnboardingPersistenceError(
      "Onboarding partially saved and automatically rolled back. Please retry with the same onboarding session token.",
      "partial_write",
      true,
    );
  }

  return { ok: true as const, profileMarkdown, operationKey, status: "completed" as const };
});
