import type { AgentContext, AgentResponse } from "@/lib/claude/types";

export async function generateInsights(_ctx: AgentContext): Promise<AgentResponse> {
  return { content: "", intent: "ask_recommendation" };
}
