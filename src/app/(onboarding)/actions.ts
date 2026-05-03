"use server";

import { withServerActionLogging } from "@/lib/errors/serverAction";
import { parseOnboardingAnswers } from "@/lib/onboarding/schema";
import { generateOnboardingProfile } from "@/lib/agents/onboarding-parser";
import { createClient } from "@/lib/supabase/server";

export const previewProfileAction = withServerActionLogging("previewOnboardingProfile", async (rawInput: unknown) => {
  const parsed = parseOnboardingAnswers(rawInput);
  const profileMarkdown = await generateOnboardingProfile(parsed);

  return {
    ok: true as const,
    profileMarkdown,
  };
});

export const completeOnboardingAction = withServerActionLogging("completeOnboarding", async (rawInput: unknown) => {
  const input = parseOnboardingAnswers(rawInput);
  const profileMarkdown = await generateOnboardingProfile(input);

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized onboarding attempt");
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

  const { error: profileError } = await supabase.from("user_profiles" as never).upsert(profilePayload as never, { onConflict: "user_id" });
  if (profileError) throw new Error(`Failed to save user profile: ${profileError.message}`);

  const { error: profileMemoryError } = await supabase.from("memories" as never).upsert(
    ({
      user_id: user.id,
      layer: "profile",
      key: "main",
      content: profileMarkdown,
    } as never),
    { onConflict: "user_id,layer,key" },
  );
  if (profileMemoryError) throw new Error(`Failed to save profile memory: ${profileMemoryError.message}`);

  const { error: patternsMemoryError } = await supabase.from("memories" as never).upsert(
    ({
      user_id: user.id,
      layer: "patterns",
      key: "main",
      content: "# Patterns\n\n_No patterns yet. I'll learn from your first week of logs._",
    } as never),
    { onConflict: "user_id,layer,key" },
  );
  if (patternsMemoryError) throw new Error(`Failed to save patterns memory: ${patternsMemoryError.message}`);

  const { error: userUpdateError } = await supabase
    .from("users" as never)
    .update({ onboarded_at: new Date().toISOString(), estimation_preference: input.estimation_preference } as never)
    .eq("id", user.id);
  if (userUpdateError) throw new Error(`Failed to update user onboarding state: ${userUpdateError.message}`);

  return { ok: true as const, profileMarkdown };
});
