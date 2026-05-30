import type { AgentSupabaseClient } from "./health-coach/contextBuilder";
import { runHealthCoachAgent } from "./health-coach/runtime";
import type { CoachIntent, CoachResponseBlock } from "./health-coach/types";

export type OrchestratorIntent = CoachIntent;
export type AssistantResponseBlock = CoachResponseBlock;

export interface OrchestratorResponse {
  intent: OrchestratorIntent;
  blocks: AssistantResponseBlock[];
  metadata?: Awaited<ReturnType<typeof runHealthCoachAgent>>["metadata"];
}

export async function handleMessage(
  userId: string,
  message: unknown,
  options: { supabase?: AgentSupabaseClient } = {},
): Promise<OrchestratorResponse> {
  const response = await runHealthCoachAgent({ userId, message, supabase: options.supabase });
  return {
    intent: response.intent,
    blocks: response.blocks,
    metadata: response.metadata,
  };
}
