import { randomUUID } from "node:crypto";
import { z } from "zod";
import { handleMessage } from "@/lib/agents/orchestrator";
import { enforceChatRateLimit } from "@/lib/rate-limit/chat";
import { createClient } from "@/lib/supabase/server";

const chatRequestSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
});

const FALLBACK_RESPONSE =
  "I had trouble processing that right now. Please try again in a moment, and I can still help log your meal.";

function jsonError(status: number, code: string, message: string, requestId: string) {
  return Response.json({ ok: false, error: { code, message }, requestId }, { status });
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

  let assistantText = FALLBACK_RESPONSE;
  let intent = "general_fallback_guidance";
  let usedFallback = false;
  let blocks: Awaited<ReturnType<typeof handleMessage>>["blocks"] = [];

  try {
    const orchestrated = await handleMessage(user.id, {
      text: parsed.data.text,
      allergies: parsed.data.allergies,
      conditions: parsed.data.conditions,
    });
    intent = orchestrated.intent;
    blocks = orchestrated.blocks;
    const firstTextBlock = blocks.find((block) => block.type === "text");
    if (firstTextBlock && firstTextBlock.text.trim()) {
      assistantText = firstTextBlock.text;
    } else {
      usedFallback = true;
    }
  } catch {
    usedFallback = true;
  }

  const mealCandidate = blocks.find((block) => block.type === "meal_log_candidate");
  const assistantMetadata = {
    intent,
    requestId,
    usedFallback,
    mealCandidate: mealCandidate
      ? {
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
