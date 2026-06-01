import type { ConfirmableMealEstimate } from "@/lib/meals/confirm";
import type { SafetyFlags } from "@/lib/safety/check";

export type CoachIntent = "meal_log_candidate" | "coach_response" | "general_fallback_guidance" | "safety_concern";

export type CoachTextBlock = { type: "text"; text: string };

export type CoachEstimateAssumption = {
  label: string;
  detail: string;
};

export type CoachItemPortion = {
  name: string;
  quantityG?: number | null;
  quantityMl?: number | null;
  householdDescription: string;
  prepStyle?: string | null;
};

export type CoachMealEstimatePresentation = {
  conciseSummary: string;
  itemPortions: CoachItemPortion[];
  assumptions: CoachEstimateAssumption[];
  clarificationQuestions: string[];
};

export type CoachMealCandidateBlock = {
  type: "meal_log_candidate";
  summary: string;
  needsConfirmation: true;
  confidence: "high" | "medium" | "low";
  estimate: { kcalMin: number; kcalMax: number; protein: number; carbs: number; fat: number; fiber: number };
  rationale: string;
  displayAssumptions?: CoachEstimateAssumption[];
  clarificationQuestions: string[];
  safetyFlags: SafetyFlags;
  confirmPayload?: ConfirmableMealEstimate;
};

export type CoachResponseBlock = CoachTextBlock | CoachMealCandidateBlock;

export type LlmProviderId = "openai" | "anthropic";

export type LlmFailureCode =
  | "missing_api_key"
  | "unsupported_provider"
  | "auth_failed"
  | "model_unavailable"
  | "rate_limited"
  | "invalid_response"
  | "provider_rejected"
  | "provider_request_failed";

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

export type PendingMealCandidateContext = {
  summary: string;
  mealSlot?: ConfirmableMealEstimate["mealSlot"];
  estimate?: { kcalMin: number; kcalMax: number; protein: number; carbs: number; fat: number; fiber: number };
  items?: Array<{
    name?: string;
    householdUnit?: string;
    quantityG?: number;
  }>;
};

export type CoachMessage = {
  text: string;
  allergies?: string[];
  conditions?: string[];
  pendingCandidate?: PendingMealCandidateContext;
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
  mealEstimatePresentation?: CoachMealEstimatePresentation | null;
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
  errorCode: LlmFailureCode;
  latencyMs: number;
};
