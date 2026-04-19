import type { AgentContext, AgentResponse } from "@/lib/claude/types";

export async function generateNudge(_ctx: AgentContext): Promise<AgentResponse> {
  return { content: "", intent: "acknowledge_nudge" };
}
