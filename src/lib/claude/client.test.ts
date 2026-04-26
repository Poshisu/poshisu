import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted above all top-level code, so the factory must be
// self-contained. We export the inner mock fn via a getter retrieved with
// `vi.hoisted()` so individual tests can configure responses.
const { messagesCreate } = vi.hoisted(() => ({ messagesCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: messagesCreate };
    constructor(_opts?: unknown) {}
  }
  return { default: MockAnthropic };
});

// Mock the admin client so trace inserts don't actually try to hit Supabase.
const traceInsert = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn().mockReturnValue({ insert: traceInsert });
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({ from: fromMock })),
}));

import { getAdminClient } from "@/lib/supabase/admin";
import { _resetAnthropicClientForTests, callAgent } from "./client";
import { AgentError } from "./types";

function makeMessage(overrides: Partial<{ content: unknown[]; usage: Record<string, number>; stop_reason: string }> = {}) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5",
    stop_reason: "end_turn",
    stop_sequence: null,
    content: [{ type: "text", text: "ok" }],
    usage: {
      input_tokens: 100,
      output_tokens: 20,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
    ...overrides,
  };
}

describe("callAgent", () => {
  beforeEach(() => {
    _resetAnthropicClientForTests();
    messagesCreate.mockReset();
    traceInsert.mockClear();
    fromMock.mockClear();
    vi.mocked(getAdminClient).mockReturnValue({ from: fromMock } as unknown as ReturnType<typeof getAdminClient>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed content for a simple text response", async () => {
    messagesCreate.mockResolvedValueOnce(makeMessage({ content: [{ type: "text", text: "hello there" }] }));

    const result = await callAgent({
      agent: "test",
      model: "claude-haiku-4-5",
      system: "You are a test agent.",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe("hello there");
    expect(result.toolUse).toBeNull();
    expect(result.stopReason).toBe("end_turn");
    expect(result.usage.inputTokens).toBe(100);
    expect(result.usage.outputTokens).toBe(20);
    expect(result.estimatedCostUsd).not.toBeNull();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("parses a tool_use response", async () => {
    messagesCreate.mockResolvedValueOnce(
      makeMessage({
        stop_reason: "tool_use",
        content: [
          { type: "text", text: "" },
          { type: "tool_use", id: "tu_1", name: "classify", input: { intent: "log_meal", confidence: 0.99 } },
        ],
      }),
    );

    const result = await callAgent({
      agent: "router",
      model: "claude-haiku-4-5",
      system: "...",
      messages: [{ role: "user", content: "had rajma chawal" }],
    });

    expect(result.toolUse).toEqual({
      id: "tu_1",
      name: "classify",
      input: { intent: "log_meal", confidence: 0.99 },
    });
    expect(result.stopReason).toBe("tool_use");
  });

  it("sets cache_control on the system message by default", async () => {
    messagesCreate.mockResolvedValueOnce(makeMessage());

    await callAgent({
      agent: "test",
      model: "claude-haiku-4-5",
      system: "system text here",
      messages: [{ role: "user", content: "hi" }],
    });

    const params = messagesCreate.mock.calls[0][0];
    expect(params.system).toEqual([
      { type: "text", text: "system text here", cache_control: { type: "ephemeral" } },
    ]);
  });

  it("omits cache_control when cacheSystem=false", async () => {
    messagesCreate.mockResolvedValueOnce(makeMessage());

    await callAgent({
      agent: "test",
      model: "claude-haiku-4-5",
      system: "system text here",
      messages: [{ role: "user", content: "hi" }],
      cacheSystem: false,
    });

    const params = messagesCreate.mock.calls[0][0];
    expect(params.system).toEqual([{ type: "text", text: "system text here" }]);
  });

  it("retries once on a 529 overloaded error and succeeds on the second try", async () => {
    const overloaded = Object.assign(new Error("overloaded"), { status: 529 });
    messagesCreate.mockRejectedValueOnce(overloaded).mockResolvedValueOnce(makeMessage());

    const result = await callAgent({
      agent: "test",
      model: "claude-haiku-4-5",
      system: "...",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(messagesCreate).toHaveBeenCalledTimes(2);
    expect(result.content).toBe("ok");
  });

  it("throws AgentError('overloaded') after retry also fails", async () => {
    const overloaded = Object.assign(new Error("overloaded"), { status: 529 });
    messagesCreate.mockRejectedValue(overloaded);

    await expect(
      callAgent({
        agent: "test",
        model: "claude-haiku-4-5",
        system: "...",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toMatchObject({ name: "AgentError", code: "overloaded" });

    expect(messagesCreate).toHaveBeenCalledTimes(2); // one + one retry
  });

  it("does NOT retry on 4xx (those are bugs in our request)", async () => {
    const badRequest = Object.assign(new Error("bad request"), { status: 400 });
    messagesCreate.mockRejectedValue(badRequest);

    await expect(
      callAgent({
        agent: "test",
        model: "claude-haiku-4-5",
        system: "...",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toMatchObject({ name: "AgentError", code: "invalid_request" });

    expect(messagesCreate).toHaveBeenCalledTimes(1);
  });

  it("maps status codes to AgentError codes correctly", async () => {
    const cases: [number, string][] = [
      [400, "invalid_request"],
      [401, "auth_failed"],
      [403, "auth_failed"],
      [404, "invalid_request"],
      [429, "rate_limited"],
    ];

    for (const [status, expectedCode] of cases) {
      messagesCreate.mockReset();
      messagesCreate.mockRejectedValueOnce(Object.assign(new Error("err"), { status }));
      await expect(
        callAgent({
          agent: "test",
          model: "claude-haiku-4-5",
          system: "...",
          messages: [{ role: "user", content: "hi" }],
        }),
      ).rejects.toMatchObject({ code: expectedCode });
    }
  });

  it("throws no_response when the model returns nothing parseable", async () => {
    messagesCreate.mockResolvedValueOnce(makeMessage({ content: [] }));

    await expect(
      callAgent({
        agent: "test",
        model: "claude-haiku-4-5",
        system: "...",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toMatchObject({ name: "AgentError", code: "no_response" });
  });

  it("inserts a redacted trace row on success", async () => {
    messagesCreate.mockResolvedValueOnce(makeMessage());

    await callAgent({
      agent: "onboarding-parser",
      model: "claude-haiku-4-5",
      system: "...",
      messages: [{ role: "user", content: JSON.stringify({ name: "Aarti", age: 34 }) }],
      userId: "user-uuid-123",
      promptVersion: "v1",
      intent: "update_profile",
    });

    expect(fromMock).toHaveBeenCalledWith("agent_traces");
    const inserted = traceInsert.mock.calls[0][0];
    expect(inserted.user_id).toBe("user-uuid-123");
    expect(inserted.agent).toBe("onboarding-parser");
    expect(inserted.model).toBe("claude-haiku-4-5");
    expect(inserted.prompt_version).toBe("v1");
    expect(inserted.intent).toBe("update_profile");
    expect(inserted.input_tokens).toBe(100);
    expect(inserted.output_tokens).toBe(20);
    expect(inserted.error).toBeNull();
    // The user message contained the name "Aarti" — but redaction here only
    // applies to identified PII keys, not arbitrary string content. The
    // serialised JSON inside the message is opaque to redactPii. That's by
    // design: we redact KEYS, not freeform message text.
    expect(inserted.request_redacted.messages[0].content).toContain("Aarti");
  });

  it("inserts a trace row even when the call fails", async () => {
    messagesCreate.mockRejectedValueOnce(Object.assign(new Error("boom"), { status: 401 }));

    await expect(
      callAgent({
        agent: "test",
        model: "claude-haiku-4-5",
        system: "...",
        messages: [{ role: "user", content: "hi" }],
        userId: "user-uuid-123",
      }),
    ).rejects.toBeInstanceOf(AgentError);

    expect(traceInsert).toHaveBeenCalledTimes(1);
    const inserted = traceInsert.mock.calls[0][0];
    expect(inserted.error).toContain("boom");
    expect(inserted.response_redacted).toBeNull();
  });

  it("silently skips the trace when admin client is unavailable", async () => {
    vi.mocked(getAdminClient).mockReturnValueOnce(null);
    messagesCreate.mockResolvedValueOnce(makeMessage());

    const result = await callAgent({
      agent: "test",
      model: "claude-haiku-4-5",
      system: "...",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe("ok");
    expect(traceInsert).not.toHaveBeenCalled();
  });

  it("does not throw when trace insert itself fails", async () => {
    traceInsert.mockRejectedValueOnce(new Error("network down"));
    messagesCreate.mockResolvedValueOnce(makeMessage());

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await callAgent({
      agent: "test",
      model: "claude-haiku-4-5",
      system: "...",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe("ok");
    // trace failure is logged but doesn't bubble up — give the async insert
    // a tick to settle before asserting the warn happened.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(consoleSpy).toHaveBeenCalledWith(
      "[agent_traces] failed to write trace",
      expect.objectContaining({ error: "network down" }),
    );
  });

  it("forwards tools and tool_choice to the SDK", async () => {
    messagesCreate.mockResolvedValueOnce(makeMessage());
    const tools = [
      {
        name: "classify",
        description: "...",
        input_schema: { type: "object" as const, properties: { intent: { type: "string" } } },
      },
    ];

    await callAgent({
      agent: "router",
      model: "claude-haiku-4-5",
      system: "...",
      messages: [{ role: "user", content: "hi" }],
      tools,
      toolChoice: { type: "tool", name: "classify" },
    });

    const params = messagesCreate.mock.calls[0][0];
    expect(params.tools).toEqual(tools);
    expect(params.tool_choice).toEqual({ type: "tool", name: "classify" });
  });
});
