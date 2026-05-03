import { describe, expect, it } from "vitest";
import { extractTextFromMessage } from "@/lib/agents/onboarding-parser";

describe("extractTextFromMessage", () => {
  it("joins text blocks and ignores non-text blocks", () => {
    const text = extractTextFromMessage([
      { type: "text", text: "Hello" },
      { type: "tool_use" },
      { type: "text", text: "World" },
    ]);

    expect(text).toBe("Hello\n\nWorld");
  });
});
