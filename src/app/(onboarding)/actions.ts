"use server";

import { redirect } from "next/navigation";
import { generateProfileViaAgent } from "@/lib/agents/onboarding-parser";
import { AgentError } from "@/lib/claude/types";
import { withServerActionLogging } from "@/lib/errors/serverAction";
import { onboardingAnswersSchema } from "@/lib/onboarding/parser";
import { buildProfileMarkdown } from "@/lib/onboarding/profileTemplate";
import type { OnboardingAnswers } from "@/lib/onboarding/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SubmitOnboardingResult =
  | { ok: true } // unreachable in practice — success path redirects
  | { ok: false; error: string };

const RATE_LIMIT_BUCKET = "onboarding:submit";
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_PER_WINDOW = 5;

/**
 * Server action that turns the chat-based onboarding into persisted state:
 *   1. Authenticate the caller and validate the answers (Zod, defence in
 *      depth — the per-question parser already validated them).
 *   2. Idempotency: if the user already finished onboarding, redirect to
 *      /onboarding/review without re-doing any work.
 *   3. Rate-limit (5/hour per user) so a hostile authenticated client
 *      can't drain Claude budget by spamming this endpoint.
 *   4. Generate profile.md via the Onboarding Parser agent. On any agent
 *      failure, fall back to the deterministic template generator. The
 *      user never sees an "agent down" error for this — the fallback
 *      produces an identical-shape profile.md so downstream agents are
 *      unaffected.
 *   5. Persist via the service-role admin client:
 *        - users.onboarding_answers ← raw answers (audit trail / regen)
 *        - users.display_name ← the captured name
 *        - users.estimation_preference ← the captured preference
 *        - users.onboarded_at ← now()
 *        - memories(layer='profile', key='main') ← profile.md
 *        - memories(layer='patterns', key='main') ← empty seed
 *   6. Redirect to /onboarding/review.
 *
 * Returns `{ ok: false, error }` for user-recoverable failures (validation,
 * persistence). On success the action redirects (which throws a NEXT_REDIRECT
 * control-flow error that the client never sees as a value).
 */
async function submitOnboardingImpl(answers: OnboardingAnswers): Promise<SubmitOnboardingResult> {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: "Your session expired. Please sign in again." };
  }

  // 2. Idempotency: if the user already onboarded, send them straight to
  // review without re-running the agent or re-writing memories. Repeat
  // submissions are usually a double-click, sometimes a hostile retry.
  const { data: existing } = await supabase
    .from("users")
    .select("onboarded_at")
    .eq("id", user.id)
    .single<{ onboarded_at: string | null }>();
  if (existing?.onboarded_at) {
    redirect("/onboarding/review");
  }

  // 3. Rate-limit. 5 submissions per hour per user is generous for the
  // happy path (one) plus retries from transient errors, while capping
  // worst-case Claude spend at well under $0.01/user/hour.
  const limit = await checkRateLimit({
    userId: user.id,
    bucket: RATE_LIMIT_BUCKET,
    windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
    limit: RATE_LIMIT_PER_WINDOW,
  });
  if (!limit.allowed) {
    return {
      ok: false,
      error: "Too many attempts. Please wait a few minutes and try again.",
    };
  }

  // 4. Validate (defence in depth)
  const validated = onboardingAnswersSchema.safeParse(answers);
  if (!validated.success) {
    return {
      ok: false,
      error: "Some answers don't look right. Please try again or contact support.",
    };
  }
  const data = validated.data;

  // 5. Generate profile.md (agent first, template fallback on any failure).
  // We log only the AgentError code — the full message can leak provider
  // internals or echoed user input via SDK error responses; the structured
  // exception is already captured by Sentry through callAgent's trace path.
  let profileMd: string;
  try {
    profileMd = await generateProfileViaAgent(data, { userId: user.id });
  } catch (agentErr) {
    const code = agentErr instanceof AgentError ? agentErr.code : "non_agent_error";
    console.warn("[submitOnboarding] parser agent failed, using template fallback", {
      userId: user.id,
      code,
    });
    profileMd = buildProfileMarkdown(data);
  }

  // 6. Persist via admin client (batch writes need consistent privilege)
  const admin = getAdminClient();
  if (!admin) {
    console.error("[submitOnboarding] admin client unavailable — cannot persist");
    return { ok: false, error: "Couldn't save your profile right now. Please try again." };
  }

  // The generated types/database.ts is empty until `pnpm db:types` runs
  // against a local Supabase, so the typed client narrows update / upsert
  // arg types to `never`. Cast through `as never` until types regenerate.
  const userUpdate = {
    display_name: data.name,
    estimation_preference: data.estimation_preference,
    onboarding_answers: data,
    onboarded_at: new Date().toISOString(),
  };
  const { error: updateError } = await admin.from("users").update(userUpdate as never).eq("id", user.id);
  if (updateError) {
    console.error("[submitOnboarding] failed to update users row", {
      userId: user.id,
      error: updateError.message,
    });
    return { ok: false, error: "Couldn't save your profile right now. Please try again." };
  }

  // Upsert profile.md and an empty patterns seed under the
  // (user_id, layer, key) unique constraint defined in 0002.
  const memoryRows = [
    {
      user_id: user.id,
      layer: "profile",
      key: "main",
      content: profileMd,
      version: 1,
    },
    {
      user_id: user.id,
      layer: "patterns",
      key: "main",
      content: "",
      version: 1,
    },
  ];
  const { error: memoryError } = await admin
    .from("memories")
    .upsert(memoryRows as never, { onConflict: "user_id,layer,key" });
  if (memoryError) {
    console.error("[submitOnboarding] failed to write memories", {
      userId: user.id,
      error: memoryError.message,
    });
    return { ok: false, error: "Couldn't save your profile right now. Please try again." };
  }

  // 7. Redirect (throws NEXT_REDIRECT — the client never sees the return)
  redirect("/onboarding/review");
}

export const submitOnboarding = withServerActionLogging("onboarding_submit", submitOnboardingImpl);
