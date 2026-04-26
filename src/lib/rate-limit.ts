import { getAdminClient } from "@/lib/supabase/admin";

export interface RateLimitResult {
  /** True if the request is within the limit and may proceed. */
  allowed: boolean;
  /** Current count after this request was registered. */
  currentCount: number;
  /** When the current window resets, as a Date. */
  resetAt: Date;
}

export interface CheckRateLimitArgs {
  userId: string;
  /** Logical bucket — e.g. `"voice:hour"`, `"chat:hour"`. Convention: `<feature>:<window>`. */
  bucket: string;
  /** Window length in minutes. */
  windowMinutes: number;
  /** Maximum requests allowed within the window. */
  limit: number;
}

/**
 * Whether to fail OPEN (allow) when the rate-limit machinery is broken.
 *
 * For cost-sensitive endpoints (LLM, voice transcription) failing open is
 * a cost-exhaustion risk: a hostile authenticated user could drain quota
 * if the limiter is offline. We default to fail-CLOSED for safety; PR
 * previews and local dev can opt in via `ALLOW_RATE_LIMIT_FAIL_OPEN=true`.
 *
 * Production should never set this flag.
 */
function shouldFailOpen(): boolean {
  return process.env.ALLOW_RATE_LIMIT_FAIL_OPEN === "true";
}

function fallbackResult(args: CheckRateLimitArgs): RateLimitResult {
  return {
    allowed: shouldFailOpen(),
    currentCount: 0,
    resetAt: new Date(Date.now() + args.windowMinutes * 60_000),
  };
}

/**
 * Check + increment the rate limit for a (user, bucket) pair.
 *
 * Atomic: defers to the `increment_rate_limit` Postgres RPC defined in
 * migration 0005 (hardened with `SET search_path` in 0009), which inserts
 * or increments under a unique (user_id, bucket, window_start) constraint
 * and returns the post-increment count. No race conditions.
 *
 * Failure mode is configurable: by default we fail CLOSED (deny) when the
 * admin client is unavailable or the RPC errors, to prevent cost
 * exhaustion through a broken limiter. Preview/dev can opt in to
 * fail-open via `ALLOW_RATE_LIMIT_FAIL_OPEN=true`.
 */
export async function checkRateLimit(args: CheckRateLimitArgs): Promise<RateLimitResult> {
  const admin = getAdminClient();
  if (!admin) {
    console.warn("[rate-limit] admin client unavailable", {
      bucket: args.bucket,
      mode: shouldFailOpen() ? "fail-open" : "fail-closed",
    });
    return fallbackResult(args);
  }

  // The RPC return type isn't yet in the generated types/database.ts (the
  // file is empty until `pnpm db:types` is run). Cast the response shape
  // narrowly here; downstream callers see the typed RateLimitResult.
  const { data, error } = await admin.rpc("increment_rate_limit" as never, {
    p_user_id: args.userId,
    p_bucket: args.bucket,
    p_window_minutes: args.windowMinutes,
    p_limit: args.limit,
  } as never);

  if (error) {
    console.warn("[rate-limit] RPC failed", {
      bucket: args.bucket,
      error: error.message,
      mode: shouldFailOpen() ? "fail-open" : "fail-closed",
    });
    return fallbackResult(args);
  }

  const rows = data as Array<{ allowed: boolean; current_count: number; reset_at: string }> | null;
  const row = rows?.[0];
  if (!row) {
    console.warn("[rate-limit] RPC returned no row", {
      bucket: args.bucket,
      mode: shouldFailOpen() ? "fail-open" : "fail-closed",
    });
    return fallbackResult(args);
  }

  return {
    allowed: row.allowed,
    currentCount: row.current_count,
    resetAt: new Date(row.reset_at),
  };
}
