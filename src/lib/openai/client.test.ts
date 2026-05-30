import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAITextResponse, OpenAIResponseError } from "./client";

describe("createOpenAITextResponse", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends structured-output JSON schema when requested", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      output_text: '{"assistantText":"ok","inferredFacts":[],"userVisibleMemoryNotes":[]}',
      usage: { input_tokens: 10, output_tokens: 5 },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createOpenAITextResponse({
      model: "gpt-5.2",
      system: "Return JSON.",
      prompt: "hello",
      maxOutputTokens: 1400,
      responseFormat: "health_coach_draft_json",
    });

    expect(result.text).toContain("assistantText");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      model: "gpt-5.2",
      max_output_tokens: 1400,
      text: {
        format: {
          type: "json_schema",
          name: "health_coach_draft",
          strict: true,
        },
      },
    });
    expect(body.text.format.schema.required).toEqual(["assistantText", "inferredFacts", "userVisibleMemoryNotes", "mealEstimatePresentation"]);
    expect(body.text.format.schema.properties.mealEstimatePresentation).toBeDefined();
  });

  it("strips an accidental OPENAI_API_KEY= prefix before sending authorization", async () => {
    vi.stubEnv("OPENAI_API_KEY", "OPENAI_API_KEY=sk-test");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      output_text: '{"assistantText":"ok","inferredFacts":[],"userVisibleMemoryNotes":[]}',
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await createOpenAITextResponse({
      model: "gpt-5.2",
      system: "Return JSON.",
      prompt: "hello",
      maxOutputTokens: 100,
    });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
  });

  it("preserves OpenAI error status and code for diagnostics", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      error: { message: "model not found", code: "model_not_found", type: "invalid_request_error" },
    }), { status: 404 })));

    await expect(createOpenAITextResponse({
      model: "gpt-5.2",
      system: "Return JSON.",
      prompt: "hello",
      maxOutputTokens: 100,
    })).rejects.toMatchObject({
      name: "OpenAIResponseError",
      status: 404,
      code: "model_not_found",
      type: "invalid_request_error",
    } satisfies Partial<OpenAIResponseError>);
  });
});
