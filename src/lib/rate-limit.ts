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
 * Check + increment the rate limit for a (user, bucket) pair.
 *
 * Atomic: defers to the `increment_rate_limit` Postgres RPC defined in
 * migration 0005, which inserts or increments under a unique
 * (user_id, bucket, window_start) constraint and returns the post-increment
 * count. No race conditions.
 *
 * Fails open: if the admin client is unavailable (e.g. preview without
 * the service-role key) or the RPC errors, we log a warning and allow
 * the request. Refusing every request because the rate limiter is broken
 * would be worse than the transient over-rate risk.
 */
export async function checkRateLimit(args: CheckRateLimitArgs): Promise<RateLimitResult> {
  const admin = getAdminClient();
  if (!admin) {
    console.warn("[rate-limit] admin client unavailable — failing open", { bucket: args.bucket });
    return {
      allowed: true,
      currentCount: 0,
      resetAt: new Date(Date.now() + args.windowMinutes * 60_000),
    };
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
    console.warn("[rate-limit] RPC failed — failing open", {
      bucket: args.bucket,
      error: error.message,
    });
    return {
      allowed: true,
      currentCount: 0,
      resetAt: new Date(Date.now() + args.windowMinutes * 60_000),
    };
  }

  const rows = data as Array<{ allowed: boolean; current_count: number; reset_at: string }> | null;
  const row = rows?.[0];
  if (!row) {
    console.warn("[rate-limit] RPC returned no row — failing open", { bucket: args.bucket });
    return {
      allowed: true,
      currentCount: 0,
      resetAt: new Date(Date.now() + args.windowMinutes * 60_000),
    };
  }

  return {
    allowed: row.allowed,
    currentCount: row.current_count,
    resetAt: new Date(row.reset_at),
  };
}
