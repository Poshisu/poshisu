import type { SupabaseClient } from "@supabase/supabase-js";

type RateLimitResult = {
  allowed: boolean;
  currentCount: number;
  resetAt: string;
};

const CHAT_BUCKET = "chat:hour";
const CHAT_WINDOW_MINUTES = 60;
const CHAT_LIMIT = 60;

export async function enforceChatRateLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc("increment_rate_limit", {
    p_user_id: userId,
    p_bucket: CHAT_BUCKET,
    p_window_minutes: CHAT_WINDOW_MINUTES,
    p_limit: CHAT_LIMIT,
  });

  if (error) {
    return {
      allowed: false,
      currentCount: CHAT_LIMIT,
      resetAt: new Date(Date.now() + CHAT_WINDOW_MINUTES * 60_000).toISOString(),
    };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.allowed !== "boolean") {
    return {
      allowed: false,
      currentCount: CHAT_LIMIT,
      resetAt: new Date(Date.now() + CHAT_WINDOW_MINUTES * 60_000).toISOString(),
    };
  }

  return {
    allowed: row.allowed,
    currentCount: Number(row.current_count ?? 0),
    resetAt: new Date(row.reset_at).toISOString(),
  };
}
