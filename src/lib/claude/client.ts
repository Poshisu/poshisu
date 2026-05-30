import Anthropic from "@anthropic-ai/sdk";
import { readServerEnv } from "@/lib/env/server";

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: readServerEnv("ANTHROPIC_API_KEY") });
  }
  return _client;
}

export type AnthropicTextMessageInput = {
  model: string;
  system: string;
  prompt: string;
  maxTokens: number;
  temperature?: number;
};

export type AnthropicTextMessageResult = {
  text: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export async function createAnthropicTextMessage(input: AnthropicTextMessageInput): Promise<AnthropicTextMessageResult> {
  const message = await getAnthropicClient().messages.create({
    model: input.model,
    max_tokens: input.maxTokens,
    temperature: input.temperature ?? 0.2,
    system: input.system,
    messages: [{ role: "user", content: input.prompt }],
  });

  const text = message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("\n")
    .trim();

  return {
    text,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  };
}
