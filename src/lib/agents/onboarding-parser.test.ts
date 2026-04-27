import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { callAgentMock } = vi.hoisted(() => ({ callAgentMock: vi.fn() }));
vi.mock("@/lib/claude/client", () => ({ callAgent: callAgentMock }));
vi.mock("@/lib/claude/prompts", () => ({ getPrompt: vi.fn(() => "ONBOARDING_PARSER prompt body") }));

import { buildProfileMarkdown } from "@/lib/onboarding/profileTemplate";
import type { OnboardingAnswers } from "@/lib/onboarding/types";
import { generateProfileViaAgent } from "./onboarding-parser";

const baseAnswers: OnboardingAnswers = {
  name: "Aarti",
  age: 34,
  gender: "female",
  height_cm: 162,
  weight_kg: 68,
  primary_goal: "lose-weight",
  goal_target_kg: 60,
  goal_timeline_weeks: 24,
  conditions: ["pcos"],
  dietary_pattern: "veg-egg",
  allergies: ["peanuts"],
  meal_times: { breakfast: "08:30", lunch: "13:30", dinner: "20:30" },
  eating_context: "mixed",
  estimation_preference: "conservative",
};

const validMarkdown = buildProfileMarkdown(baseAnswers);

function callAgentResultWithTool(input: Record<string, unknown>) {
  return {
    content: "",
    toolUse: { id: "tu_1", name: "generate_profile", input },
    stopReason: "tool_use",
    usage: { inputTokens: 100, outputTokens: 200, cacheReadTokens: 0, cacheWriteTokens: 0 },
    latencyMs: 50,
    estimatedCostUsd: 0.001,
  };
}

describe("generateProfileViaAgent", () => {
  beforeEach(() => {
    callAgentMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the markdown from a successful tool call", async () => {
    callAgentMock.mockResolvedValueOnce(callAgentResultWithTool({ profile_markdown: validMarkdown }));

    const md = await generateProfileViaAgent(baseAnswers, { userId: "u-1" });
    expect(md).toBe(validMarkdown);
  });

  it("calls callAgent with the right model, tool choice, and userId", async () => {
    callAgentMock.mockResolvedValueOnce(callAgentResultWithTool({ profile_markdown: validMarkdown }));

    await generateProfileViaAgent(baseAnswers, { userId: "u-42" });

    const args = callAgentMock.mock.calls[0][0];
    expect(args.agent).toBe("onboarding-parser");
    expect(args.model).toBe("claude-haiku-4-5");
    expect(args.toolChoice).toEqual({ type: "tool", name: "generate_profile" });
    expect(args.cacheSystem).toBe(true);
    expect(args.userId).toBe("u-42");
    expect(args.intent).toBe("update_profile");
    // The user message must be the serialised answers — the agent reads
    // structured JSON, not natural language.
    expect(JSON.parse(args.messages[0].content)).toMatchObject({ name: "Aarti" });
  });

  it("throws when the model returns no tool_use block", async () => {
    callAgentMock.mockResolvedValueOnce({
      content: "I'd love to help",
      toolUse: null,
      stopReason: "end_turn",
      usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 },
      latencyMs: 10,
      estimatedCostUsd: 0,
    });

    await expect(generateProfileViaAgent(baseAnswers, { userId: "u-1" })).rejects.toThrow(
      /did not return the generate_profile tool call/,
    );
  });

  it("throws when the wrong tool was used", async () => {
    callAgentMock.mockResolvedValueOnce({
      content: "",
      toolUse: { id: "tu_1", name: "some_other_tool", input: { foo: "bar" } },
      stopReason: "tool_use",
      usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 },
      latencyMs: 10,
      estimatedCostUsd: 0,
    });

    await expect(generateProfileViaAgent(baseAnswers, { userId: "u-1" })).rejects.toThrow();
  });

  it("throws when profile_markdown is missing", async () => {
    callAgentMock.mockResolvedValueOnce(callAgentResultWithTool({}));

    await expect(generateProfileViaAgent(baseAnswers, { userId: "u-1" })).rejects.toThrow(
      /missing or not a string/,
    );
  });

  it("throws when profile_markdown is the wrong type", async () => {
    callAgentMock.mockResolvedValueOnce(callAgentResultWithTool({ profile_markdown: 42 }));

    await expect(generateProfileViaAgent(baseAnswers, { userId: "u-1" })).rejects.toThrow();
  });

  it("throws when the markdown fails structural validation", async () => {
    callAgentMock.mockResolvedValueOnce(callAgentResultWithTool({ profile_markdown: "garbage output" }));

    await expect(generateProfileViaAgent(baseAnswers, { userId: "u-1" })).rejects.toThrow(
      /failed structural validation/,
    );
  });

  it("propagates errors from callAgent (overload, auth, etc.)", async () => {
    callAgentMock.mockRejectedValueOnce(new Error("model overloaded"));

    await expect(generateProfileViaAgent(baseAnswers, { userId: "u-1" })).rejects.toThrow(
      "model overloaded",
    );
  });
});
