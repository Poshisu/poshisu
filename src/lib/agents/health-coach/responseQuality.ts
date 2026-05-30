import { z } from "zod";
import type { InferredFact, LlmCoachDraft } from "./types";

const inferredFactSchema = z.object({
  category: z.enum(["preference", "routine", "correction", "context"]),
  fact: z.string().trim().min(1).max(240),
  stability: z.enum(["stable", "tentative"]),
  source: z.enum(["user_message", "assistant_inference"]),
});

const llmCoachDraftSchema = z.object({
  assistantText: z.string().trim().min(1).max(1400),
  inferredFacts: z.array(inferredFactSchema).max(5).default([]),
  userVisibleMemoryNotes: z.array(z.string().trim().min(1).max(240)).max(3).default([]),
});

export function parseLlmCoachDraft(rawText: string): LlmCoachDraft {
  const trimmed = rawText.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new Error("LLM response did not contain a JSON object.");
  }

  const parsedUnknown = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as unknown;
  const parsed = llmCoachDraftSchema.parse(parsedUnknown);
  return parsed;
}

export function inferFactsFromUserText(text: string): InferredFact[] {
  const facts: InferredFact[] = [];
  const normalized = text.replace(/\s+/g, " ").trim();

  const dislikeMatch = /\b(?:i don't like|i do not like|i dislike|hate)\s+([^.;,]+)/i.exec(normalized);
  if (dislikeMatch?.[1]) {
    facts.push({ category: "preference", fact: `Dislikes ${dislikeMatch[1].trim()}.`, stability: "stable", source: "user_message" });
  }

  const preferenceMatch = /\b(?:i prefer|i usually have|my usual|i like)\s+([^.;,]+)/i.exec(normalized);
  if (preferenceMatch?.[1]) {
    facts.push({ category: "preference", fact: `Preference: ${preferenceMatch[1].trim()}.`, stability: "tentative", source: "user_message" });
  }

  const routineMatch = /\b(?:every morning|every evening|daily|usually for breakfast|usually for lunch|usually for dinner)\b([^.;]*)/i.exec(normalized);
  if (routineMatch) {
    facts.push({ category: "routine", fact: `Routine clue: ${routineMatch[0].trim()}.`, stability: "tentative", source: "user_message" });
  }

  return facts.slice(0, 3);
}

export function mergeInferredFacts(primary: InferredFact[], secondary: InferredFact[]): InferredFact[] {
  const seen = new Set<string>();
  const merged: InferredFact[] = [];
  for (const fact of [...primary, ...secondary]) {
    const key = `${fact.category}:${fact.fact.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(fact);
  }
  return merged.slice(0, 5);
}
