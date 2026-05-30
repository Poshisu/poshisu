import { readServerEnv } from "@/lib/env/server";

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

type OpenAIResponseFormat = {
  type: "json_schema";
  name: string;
  strict: boolean;
  schema: Record<string, unknown>;
};

const healthCoachDraftJsonSchema: OpenAIResponseFormat = {
  type: "json_schema",
  name: "health_coach_draft",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      assistantText: {
        type: "string",
        minLength: 1,
        maxLength: 1400,
      },
      inferredFacts: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            category: { type: "string", enum: ["preference", "routine", "correction", "context"] },
            fact: { type: "string", minLength: 1, maxLength: 240 },
            stability: { type: "string", enum: ["stable", "tentative"] },
            source: { type: "string", enum: ["user_message", "assistant_inference"] },
          },
          required: ["category", "fact", "stability", "source"],
        },
      },
      userVisibleMemoryNotes: {
        type: "array",
        maxItems: 3,
        items: { type: "string", minLength: 1, maxLength: 240 },
      },
      mealEstimatePresentation: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            properties: {
              conciseSummary: { type: "string", minLength: 1, maxLength: 90 },
              itemPortions: {
                type: "array",
                maxItems: 8,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string", minLength: 1, maxLength: 80 },
                    quantityG: { type: ["number", "null"], exclusiveMinimum: 0, maximum: 2000 },
                    quantityMl: { type: ["number", "null"], exclusiveMinimum: 0, maximum: 3000 },
                    householdDescription: { type: "string", minLength: 1, maxLength: 120 },
                    prepStyle: { type: ["string", "null"], minLength: 1, maxLength: 120 },
                  },
                  required: ["name", "quantityG", "quantityMl", "householdDescription", "prepStyle"],
                },
              },
              assumptions: {
                type: "array",
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    label: { type: "string", minLength: 1, maxLength: 50 },
                    detail: { type: "string", minLength: 1, maxLength: 180 },
                  },
                  required: ["label", "detail"],
                },
              },
              clarificationQuestions: {
                type: "array",
                maxItems: 2,
                items: { type: "string", minLength: 1, maxLength: 180 },
              },
            },
            required: ["conciseSummary", "itemPortions", "assumptions", "clarificationQuestions"],
          },
          { type: "null" },
        ],
      },
    },
    required: ["assistantText", "inferredFacts", "userVisibleMemoryNotes", "mealEstimatePresentation"],
  },
};

export class OpenAIResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly type?: string,
  ) {
    super(message);
    this.name = "OpenAIResponseError";
  }
}

export type OpenAITextResponseInput = {
  model: string;
  system: string;
  prompt: string;
  maxOutputTokens: number;
  responseFormat?: "health_coach_draft_json";
};

export type OpenAITextResponseResult = {
  text: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

function getOpenAIKey() {
  const key = readServerEnv("OPENAI_API_KEY");
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return key;
}

async function readOpenAIJson(response: Response): Promise<OpenAIResponsesApiResult> {
  const raw = await response.text();
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as OpenAIResponsesApiResult;
  } catch (error) {
    if (!response.ok) {
      throw new OpenAIResponseError(
        `OpenAI returned a non-JSON error response with status ${response.status}.`,
        response.status,
      );
    }
    throw error;
  }
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

function buildOpenAIRequestBody(input: OpenAITextResponseInput) {
  const body: Record<string, unknown> = {
    model: input.model,
    instructions: input.system,
    input: input.prompt,
    max_output_tokens: input.maxOutputTokens,
  };

  if (input.responseFormat === "health_coach_draft_json") {
    body.text = { format: healthCoachDraftJsonSchema };
  }

  return body;
}

export async function createOpenAITextResponse(input: OpenAITextResponseInput): Promise<OpenAITextResponseResult> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildOpenAIRequestBody(input)),
  });

  const result = await readOpenAIJson(response);
  if (!response.ok) {
    throw new OpenAIResponseError(
      result.error?.message ?? `OpenAI request failed with status ${response.status}.`,
      response.status,
      result.error?.code,
      result.error?.type,
    );
  }

  return {
    text: extractResponseText(result),
    usage: {
      inputTokens: result.usage?.input_tokens,
      outputTokens: result.usage?.output_tokens,
    },
  };
}
