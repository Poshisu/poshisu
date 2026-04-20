import type { AgentContext, AgentResponse } from "@/lib/claude/types";
import { classifyIntent } from "./router";

export async function orchestrate(ctx: AgentContext): Promise<AgentResponse> {
  const intent = await classifyIntent(ctx);
  return { content: "", intent, metadata: {} };
}
