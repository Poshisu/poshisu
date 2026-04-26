import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let _admin: ReturnType<typeof createSupabaseClient<Database>> | null = null;

/**
 * Service-role Supabase client. Bypasses RLS — for server-only use cases that
 * legitimately need to write rows the user can't (e.g. inserting into
 * `agent_traces`, which has RLS read but no insert policy).
 *
 * NEVER import this into a client component or expose its responses to the
 * browser. The service role key MUST stay server-side only — it has full
 * database access.
 *
 * Returns null when `SUPABASE_SERVICE_ROLE_KEY` is unset, so non-prod
 * environments without the secret degrade silently rather than crashing.
 * Callers must handle the null path (typically by skipping the write and
 * logging a warning).
 */
export function getAdminClient(): ReturnType<typeof createSupabaseClient<Database>> | null {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  _admin = createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return _admin;
}

/**
 * Resets the cached admin client. Test-only — production code should never
 * need to swap clients at runtime.
 */
export function _resetAdminClientForTests(): void {
  _admin = null;
}
