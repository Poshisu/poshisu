import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { LlmCallResult } from "./types";

function canUseAdminClient() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function createTraceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function redactText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

export async function recordHealthCoachTrace(args: {
  userId: string;
  intent: string;
  requestText: string;
  llmResult: LlmCallResult;
}): Promise<string | undefined> {
  if (!canUseAdminClient()) return undefined;

  const supabase = createTraceClient();
  if (!supabase) return undefined;

  const result = args.llmResult;
  const payload = {
    user_id: args.userId,
    agent: "health_coach",
    model: result.model,
    prompt_version: result.promptVersion,
    intent: args.intent,
    input_tokens: result.ok ? result.usage.inputTokens : undefined,
    output_tokens: result.ok ? result.usage.outputTokens : undefined,
    latency_ms: result.latencyMs,
    request_redacted: { textPreview: redactText(args.requestText) },
    response_redacted: result.ok ? { textPreview: redactText(result.draft.assistantText) } : undefined,
    error: result.ok ? undefined : result.error,
  };

  const { data, error } = await supabase.from("agent_traces").insert(payload).select("id").single();
  if (error || !data) return undefined;
  return String(data.id);
}
