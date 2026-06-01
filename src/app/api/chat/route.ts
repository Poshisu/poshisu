import { randomUUID } from "node:crypto";
import { z } from "zod";
import { handleMessage } from "@/lib/agents/orchestrator";
import { HealthCoachProviderError } from "@/lib/agents/health-coach/runtime";
import { enforceChatRateLimit } from "@/lib/rate-limit/chat";
import { createClient } from "@/lib/supabase/server";

const pendingCandidateSchema = z
  .object({
    summary: z.string().trim().min(1).max(500),
    mealSlot: z.enum(["breakfast", "lunch", "dinner", "snack", "beverage", "other"]).optional(),
    estimate: z
      .object({
        kcalMin: z.number().nonnegative(),
        kcalMax: z.number().nonnegative(),
        protein: z.number().nonnegative(),
        carbs: z.number().nonnegative(),
        fat: z.number().nonnegative(),
        fiber: z.number().nonnegative(),
      })
      .optional(),
    items: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(120).optional(),
          householdUnit: z.string().trim().min(1).max(120).optional(),
          quantityG: z.number().nonnegative().optional(),
        }),
      )
      .max(12)
      .optional(),
  })
  .strict();

const chatRequestSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  pendingCandidate: pendingCandidateSchema.optional(),
});

type JsonErrorDetails = Record<string, string | number | boolean | undefined>;

function jsonError(status: number, code: string, message: string, requestId: string, details?: JsonErrorDetails) {
  return Response.json({ ok: false, error: { code, message, details }, requestId }, { status });
}

function healthCoachProviderMessage(error: HealthCoachProviderError) {
  if (error.reason === "model_unavailable") {
    return "The selected OpenAI model is unavailable for this project. Set OPENAI_HEALTH_COACH_MODEL to an enabled model, then redeploy.";
  }
  if (error.reason === "auth_failed") {
    return "OpenAI rejected the API key. Rotate OPENAI_API_KEY in Vercel, then redeploy.";
  }
  if (error.reason === "missing_api_key") {
    return "OPENAI_API_KEY is missing for the selected health coach provider. Add it in Vercel, then redeploy.";
  }
  if (error.reason === "rate_limited") {
    return "The selected LLM provider is rate-limiting Nourish right now. Check provider usage limits or retry shortly.";
  }
  if (error.reason === "invalid_response") {
    return "The health coach model returned an invalid response. Try a lower-latency enabled model and redeploy.";
  }
  return "The Nourish health coach is temporarily unavailable. Please check the LLM provider configuration and try again.";
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError(401, "UNAUTHORIZED", "You must be signed in to chat.", requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Please send a non-empty text message.", requestId);
  }

  const rateLimit = await enforceChatRateLimit(supabase, user.id);
  if (!rateLimit.allowed) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many messages. Please wait a bit and try again.",
        },
        requestId,
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.max(1, Math.ceil((new Date(rateLimit.resetAt).getTime() - Date.now()) / 1000)).toString(),
        },
      },
    );
  }

  const messageTable = supabase.from("messages" as never);

  const { data: rawUserMessage, error: userInsertError } = await messageTable
    .insert({
      user_id: user.id,
      role: "user",
      kind: "text",
      content: parsed.data.text,
      metadata: { requestId },
    } as never)
    .select("id, role, kind, content, created_at")
    .single();

  const userMessage = rawUserMessage as unknown as { id: string; role: string; kind: string; content: string; created_at: string };

  if (userInsertError || !userMessage) {
    return jsonError(500, "MESSAGE_PERSIST_FAILED", "Could not save your message. Please try again.", requestId);
  }

  let orchestrated: Awaited<ReturnType<typeof handleMessage>>;
  try {
    orchestrated = await handleMessage(user.id, {
      text: parsed.data.text,
      allergies: parsed.data.allergies,
      conditions: parsed.data.conditions,
      pendingCandidate: parsed.data.pendingCandidate,
    }, { supabase });
  } catch (error) {
    if (error instanceof HealthCoachProviderError) {
      const details = {
        provider: error.provider,
        model: error.model,
        reason: error.reason,
      };
      console.error("[api/chat] health coach provider unavailable", { requestId, ...details });
      return jsonError(503, "LLM_UNAVAILABLE", healthCoachProviderMessage(error), requestId, details);
    }

    console.error("[api/chat] health coach failed", { requestId });
    return jsonError(503, "LLM_UNAVAILABLE", "The Nourish health coach is temporarily unavailable. Please check the LLM provider configuration and try again.", requestId);
  }

  const intent = orchestrated.intent;
  const blocks = orchestrated.blocks;
  const agentMetadata = orchestrated.metadata;
  const usedFallback = false;
  const firstTextBlock = blocks.find((block) => block.type === "text");
  const assistantText = firstTextBlock?.text.trim();
  if (!assistantText) {
    return jsonError(502, "LLM_EMPTY_RESPONSE", "The health coach did not return a usable reply. Please try again.", requestId);
  }

  const mealCandidate = blocks.find((block) => block.type === "meal_log_candidate");
  const assistantMetadata = {
    intent,
    requestId,
    usedFallback,
    agent: agentMetadata,
    mealCandidate: mealCandidate
      ? {
          candidateBlock: mealCandidate,
          confirmPayload: mealCandidate.confirmPayload,
          safetyFlags: mealCandidate.safetyFlags,
        }
      : undefined,
  };

  const { data: rawAssistantMessage, error: assistantInsertError } = await messageTable
    .insert({
      user_id: user.id,
      role: "assistant",
      kind: "text",
      content: assistantText,
      in_reply_to: userMessage.id,
      metadata: assistantMetadata,
    } as never)
    .select("id, role, kind, content, created_at, in_reply_to")
    .single();

  const assistantMessage = rawAssistantMessage as unknown as {
    id: string;
    role: string;
    kind: string;
    content: string;
    created_at: string;
    in_reply_to: string | null;
  };

  if (assistantInsertError || !assistantMessage) {
    return jsonError(500, "ASSISTANT_PERSIST_FAILED", "Message received, but reply could not be saved.", requestId);
  }

  return Response.json({
    ok: true,
    requestId,
    data: {
      userMessage,
      assistantMessage,
      blocks,
      intent,
      usedFallback,
    },
  });
}
