type OpenAIResponseOutputContent = {
  type?: string;
  text?: string;
};

type OpenAIResponseOutputItem = {
  type?: string;
  content?: OpenAIResponseOutputContent[];
};

type OpenAIResponsesApiResult = {
  output_text?: string;
  output?: OpenAIResponseOutputItem[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

export type OpenAITextResponseInput = {
  model: string;
  system: string;
  prompt: string;
  maxOutputTokens: number;
};

export type OpenAITextResponseResult = {
  text: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return key;
}

function extractResponseText(result: OpenAIResponsesApiResult) {
  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  const text = (result.output ?? [])
    .flatMap((item) => item.content ?? [])
    .flatMap((content) => (typeof content.text === "string" ? [content.text] : []))
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("OpenAI response did not include output text.");
  }
  return text;
}

export async function createOpenAITextResponse(input: OpenAITextResponseInput): Promise<OpenAITextResponseResult> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      instructions: input.system,
      input: input.prompt,
      max_output_tokens: input.maxOutputTokens,
    }),
  });

  const result = (await response.json()) as OpenAIResponsesApiResult;
  if (!response.ok) {
    throw new Error(result.error?.message ?? `OpenAI request failed with status ${response.status}.`);
  }

  return {
    text: extractResponseText(result),
    usage: {
      inputTokens: result.usage?.input_tokens,
      outputTokens: result.usage?.output_tokens,
    },
  };
}
