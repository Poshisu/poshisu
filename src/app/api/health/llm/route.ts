import { randomUUID } from "node:crypto";
import {
  isLlmConfigured,
  resolveHealthCoachProviderConfig,
  smokeTestHealthCoachProvider,
} from "@/lib/agents/health-coach/llmProvider";
import { createClient } from "@/lib/supabase/server";

function healthError(status: number, code: string, message: string, requestId: string, details?: Record<string, string | number | boolean | undefined>) {
  return Response.json(
    { ok: false, error: { code, message, details }, requestId },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return healthError(401, "UNAUTHORIZED", "You must be signed in to inspect LLM health.", requestId);
  }

  let providerConfig: ReturnType<typeof resolveHealthCoachProviderConfig>;
  try {
    providerConfig = resolveHealthCoachProviderConfig();
  } catch (error) {
    return healthError(
      503,
      "LLM_CONFIG_INVALID",
      error instanceof Error ? error.message : "The selected LLM provider is invalid.",
      requestId,
      { reason: "unsupported_provider" },
    );
  }

  const apiKeyConfigured = isLlmConfigured(providerConfig.provider);
  const check = new URL(request.url).searchParams.get("check") === "1";
  const base = {
    provider: providerConfig.provider,
    model: providerConfig.model,
    apiKeyConfigured,
    checkRequested: check,
  };

  if (!check) {
    return Response.json(
      {
        ok: true,
        requestId,
        data: {
          ...base,
          message: "LLM configuration loaded. Add ?check=1 to run a live provider smoke test.",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const smoke = await smokeTestHealthCoachProvider();
  if (!smoke.ok) {
    return healthError(
      503,
      "LLM_UNAVAILABLE",
      "The selected health-coach LLM provider failed the smoke test.",
      requestId,
      {
        provider: smoke.provider,
        model: smoke.model,
        reason: smoke.errorCode,
        latencyMs: smoke.latencyMs,
        apiKeyConfigured,
      },
    );
  }

  return Response.json(
    {
      ok: true,
      requestId,
      data: {
        ...base,
        smoke: {
          ok: true,
          latencyMs: smoke.latencyMs,
          outputTextPresent: smoke.outputTextPresent,
          promptVersion: smoke.promptVersion,
        },
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
