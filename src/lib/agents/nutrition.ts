import type { AgentContext, AgentResponse } from "@/lib/claude/types";

export async function estimateNutrition(_ctx: AgentContext): Promise<AgentResponse> {
  return { content: "", intent: "log_meal" };
}
