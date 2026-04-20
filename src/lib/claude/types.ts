export type AgentIntent =
  | "log_meal"
  | "ask_nutrition"
  | "get_insights"
  | "update_profile"
  | "acknowledge_nudge"
  | "unknown";

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentContext {
  userId: string;
  messages: AgentMessage[];
  intent?: AgentIntent;
}

export interface AgentResponse {
  content: string;
  intent: AgentIntent;
  metadata?: Record<string, unknown>;
}
