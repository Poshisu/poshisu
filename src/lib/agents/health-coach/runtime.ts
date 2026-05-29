import { z } from "zod";
import { buildCoachContext } from "./contextBuilder";
import type { AgentSupabaseClient } from "./contextBuilder";
import { buildDeterministicCoachResponse } from "./deterministicFallback";
import { callHealthCoachLlm } from "./llmProvider";
import { inferFactsFromUserText, mergeInferredFacts } from "./responseQuality";
import { evaluateCoachMessageSafety } from "./safetyPolicy";
import { recordHealthCoachTrace } from "./traceLogger";
import { writeCoachMemoryEffects } from "./memoryWriter";
import type { CoachMessage, CoachResponse, CoachResponseBlock } from "./types";

const messageSchema = z
  .object({
    text: z.string().trim().min(1),
    allergies: z.array(z.string()).optional(),
    conditions: z.array(z.string()).optional(),
  })
  .strict();

function withAssistantText(blocks: CoachResponseBlock[], assistantText: string): CoachResponseBlock[] {
  const hasText = blocks.some((block) => block.type === "text");
  if (!hasText) return [...blocks, { type: "text", text: assistantText }];
  return blocks.map((block) => (block.type === "text" ? { ...block, text: assistantText } : block));
}

function safetyResponse(userId: string, parsedMessage: CoachMessage, reasons: string[], responseText: string): CoachResponse {
  return {
    intent: "safety_concern",
    blocks: [{ type: "text", text: responseText }],
    metadata: {
      provider: "deterministic",
      model: "deterministic-safety-policy",
      promptVersion: "ai-chat-01-safety-v1",
      usedDeterministicFallback: true,
      fallbackReason: "safety_policy_block",
      contextLoaded: false,
      memoryWriteStatus: "skipped",
      inferredFacts: [],
      safety: { blocked: true, reasons },
    },
  } satisfies CoachResponse;
}

export async function runHealthCoachAgent(args: {
  userId: string;
  message: unknown;
  supabase?: AgentSupabaseClient;
}): Promise<CoachResponse> {
  const safeUserId = args.userId.trim();
  if (!safeUserId) {
    throw new Error("Invalid userId: expected a non-empty string.");
  }

  const parsedMessage = messageSchema.safeParse(args.message);
  if (!parsedMessage.success) {
    throw new Error("Invalid message payload: expected { text: string }.");
  }

  const message = parsedMessage.data;
  const safety = evaluateCoachMessageSafety(message.text);
  if (safety.blocked) {
    return safetyResponse(safeUserId, message, safety.reasons, safety.responseText ?? "I can't safely help with that request.");
  }

  const context = await buildCoachContext({ userId: safeUserId, supabase: args.supabase });
  const contextAllergies = context.profile?.allergies ?? [];
  const contextConditions = context.profile?.conditions ?? [];
  const enrichedMessage: CoachMessage = {
    text: message.text,
    allergies: Array.from(new Set([...(message.allergies ?? []), ...contextAllergies])),
    conditions: Array.from(new Set([...(message.conditions ?? []), ...contextConditions])),
  };

  const deterministicResponse = await buildDeterministicCoachResponse(safeUserId, enrichedMessage);
  const llmResult = await callHealthCoachLlm({ message: enrichedMessage, context, deterministicResponse });
  const userFacts = inferFactsFromUserText(enrichedMessage.text);

  let response: CoachResponse;
  if (llmResult.ok) {
    const inferredFacts = mergeInferredFacts(llmResult.draft.inferredFacts, userFacts);
    response = {
      intent: deterministicResponse.intent === "general_fallback_guidance" ? "coach_response" : deterministicResponse.intent,
      blocks: withAssistantText(deterministicResponse.blocks, llmResult.draft.assistantText),
      metadata: {
        provider: "anthropic",
        model: llmResult.model,
        promptVersion: llmResult.promptVersion,
        usedDeterministicFallback: false,
        contextLoaded: context.contextWarnings.length === 0,
        memoryWriteStatus: "attempted",
        inferredFacts,
        safety: { blocked: false, reasons: [] },
        latencyMs: llmResult.latencyMs,
      },
    };
  } else {
    const inferredFacts = userFacts;
    response = {
      ...deterministicResponse,
      metadata: {
        ...deterministicResponse.metadata,
        fallbackReason: llmResult.error,
        contextLoaded: context.contextWarnings.length === 0,
        memoryWriteStatus: "attempted",
        inferredFacts,
        safety: { blocked: false, reasons: [] },
        latencyMs: llmResult.latencyMs,
      },
    };
  }

  const memoryWriteStatus = await writeCoachMemoryEffects({
    supabase: args.supabase,
    userId: safeUserId,
    message: enrichedMessage,
    response,
    inferredFacts: response.metadata.inferredFacts,
  });
  const traceId = await recordHealthCoachTrace({
    userId: safeUserId,
    intent: response.intent,
    requestText: enrichedMessage.text,
    llmResult,
  });

  return {
    ...response,
    metadata: {
      ...response.metadata,
      memoryWriteStatus,
      traceId,
    },
  };
}
