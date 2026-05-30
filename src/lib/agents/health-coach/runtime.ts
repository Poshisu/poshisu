import { z } from "zod";
import { buildCoachContext } from "./contextBuilder";
import type { AgentSupabaseClient } from "./contextBuilder";
import { buildDeterministicCoachResponse } from "./deterministicFallback";
import { callHealthCoachLlm } from "./llmProvider";
import { inferFactsFromUserText, mergeInferredFacts } from "./responseQuality";
import { evaluateCoachMessageSafety } from "./safetyPolicy";
import { recordHealthCoachTrace } from "./traceLogger";
import { writeCoachMemoryEffects } from "./memoryWriter";
import type { CoachEstimateAssumption, CoachItemPortion, CoachMealEstimatePresentation, CoachMessage, CoachResponse, CoachResponseBlock, LlmFailureCode } from "./types";

export class HealthCoachProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly model: string,
    readonly promptVersion: string,
    readonly reason: LlmFailureCode,
  ) {
    super(message);
    this.name = "HealthCoachProviderError";
  }
}

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

function normalizeItemName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findPresentationItem(items: CoachItemPortion[], name: string) {
  const normalizedName = normalizeItemName(name);
  return items.find((item) => {
    const normalizedItem = normalizeItemName(item.name);
    return normalizedItem === normalizedName || normalizedItem.includes(normalizedName) || normalizedName.includes(normalizedItem);
  });
}

function assumptionRationale(assumptions: CoachEstimateAssumption[], fallback: string) {
  if (assumptions.length === 0) return fallback;
  return assumptions.map((assumption) => `${assumption.label}: ${assumption.detail}`).join("\n");
}

function withMealEstimatePresentation(blocks: CoachResponseBlock[], presentation?: CoachMealEstimatePresentation | null): CoachResponseBlock[] {
  if (!presentation) return blocks;
  const p = presentation;
  const itemPortions = p.itemPortions ?? [];
  const assumptions = p.assumptions ?? [];

  return blocks.map((block) => {
    if (block.type !== "meal_log_candidate") return block;

    const updatedConfirmPayload = block.confirmPayload
      ? {
          ...block.confirmPayload,
          items: block.confirmPayload.items.map((item) => {
            const presented = findPresentationItem(itemPortions, item.name);
            if (!presented) return item;
            return {
              ...item,
              quantity_g: presented.quantityG ?? item.quantity_g,
              household_unit: presented.householdDescription,
            };
          }),
        }
      : undefined;

    return {
      ...block,
      summary: p.conciseSummary ?? block.summary,
      rationale: assumptionRationale(assumptions, block.rationale),
      displayAssumptions: assumptions.length > 0 ? assumptions : block.displayAssumptions,
      clarificationQuestions: p.clarificationQuestions?.length ? p.clarificationQuestions.slice(0, 2) : block.clarificationQuestions,
      confirmPayload: updatedConfirmPayload,
    };
  });
}

function safetyResponse(userId: string, parsedMessage: CoachMessage, reasons: string[], responseText: string): CoachResponse {
  return {
    intent: "safety_concern",
    blocks: [{ type: "text", text: responseText }],
    metadata: {
      provider: "safety",
      model: "pre-provider-safety-policy",
      promptVersion: "ai-chat-01-safety-v1",
      usedDeterministicFallback: false,
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

  if (!llmResult.ok) {
    await recordHealthCoachTrace({
      userId: safeUserId,
      intent: "provider_error",
      requestText: enrichedMessage.text,
      llmResult,
    });
    throw new HealthCoachProviderError(
      `Health coach LLM provider unavailable: ${llmResult.error}`,
      llmResult.provider,
      llmResult.model,
      llmResult.promptVersion,
      llmResult.errorCode,
    );
  }

  const inferredFacts = mergeInferredFacts(llmResult.draft.inferredFacts, userFacts);
  const response: CoachResponse = {
    intent: deterministicResponse.intent === "general_fallback_guidance" ? "coach_response" : deterministicResponse.intent,
    blocks: withMealEstimatePresentation(withAssistantText(deterministicResponse.blocks, llmResult.draft.assistantText), llmResult.draft.mealEstimatePresentation),
    metadata: {
      provider: llmResult.provider,
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
