import type { AgentContext, AgentIntent } from "@/lib/claude/types";

export async function classifyIntent(_ctx: AgentContext): Promise<AgentIntent> {
  return "unknown";
}
