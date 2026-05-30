import type { ConfirmableMealEstimate } from "@/lib/meals/confirm";
import type { SafetyFlags } from "@/lib/safety/check";

export type CoachIntent = "meal_log_candidate" | "coach_response" | "general_fallback_guidance" | "safety_concern";

export type CoachTextBlock = { type: "text"; text: string };

export type CoachMealCandidateBlock = {
  type: "meal_log_candidate";
  summary: string;
  needsConfirmation: true;
  confidence: "high" | "medium" | "low";
  estimate: { kcalMin: number; kcalMax: number; protein: number; carbs: number; fat: number; fiber: number };
  rationale: string;
  clarificationQuestions: string[];
  safetyFlags: SafetyFlags;
  confirmPayload?: ConfirmableMealEstimate;
};

export type CoachResponseBlock = CoachTextBlock | CoachMealCandidateBlock;

export type LlmProviderId = "openai" | "anthropic";

export interface CoachResponseMetadata {
  provider: LlmProviderId | "safety" | "baseline";
  model: string;
  promptVersion: string;
  usedDeterministicFallback: false;
  fallbackReason?: string;
  contextLoaded: boolean;
  memoryWriteStatus: "skipped" | "attempted" | "succeeded" | "failed";
  inferredFacts: InferredFact[];
  safety: {
    blocked: boolean;
    reasons: string[];
  };
  traceId?: string;
  latencyMs?: number;
}

export interface CoachResponse {
  intent: CoachIntent;
  blocks: CoachResponseBlock[];
  metadata: CoachResponseMetadata;
}

export type CoachMessage = {
  text: string;
  allergies?: string[];
  conditions?: string[];
};

export type UserProfileContext = {
  age?: number | null;
  city?: string | null;
  primaryGoal?: string | null;
  conditions: string[];
  allergies: string[];
  dietaryPattern?: string | null;
  eatingContext?: string | null;
  targets: {
    kcal?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    fiber?: number | null;
    waterMl?: number | null;
  };
};

export type MemoryContextRow = {
  layer: string;
  key: string;
  content: string;
  updatedAt?: string | null;
};

export type RecentMealContext = {
  mealSlot: string | null;
  sourceText: string | null;
  kcalLead: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  loggedAt: string;
};

export interface CoachContext {
  user: {
    id: string;
    displayName?: string | null;
    timezone?: string | null;
    estimationPreference?: string | null;
    nudgeTone?: string | null;
  };
  profile: UserProfileContext | null;
  memories: MemoryContextRow[];
  recentMeals: RecentMealContext[];
  contextWarnings: string[];
}

export type InferredFact = {
  category: "preference" | "routine" | "correction" | "context";
  fact: string;
  stability: "stable" | "tentative";
  source: "user_message" | "assistant_inference";
};

export interface LlmCoachDraft {
  assistantText: string;
  inferredFacts: InferredFact[];
  userVisibleMemoryNotes: string[];
}

export type LlmCallResult = {
  ok: true;
  provider: LlmProviderId;
  model: string;
  promptVersion: string;
  draft: LlmCoachDraft;
  rawText: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
  };
  latencyMs: number;
} | {
  ok: false;
  provider: LlmProviderId;
  model: string;
  promptVersion: string;
  error: string;
  latencyMs: number;
};
