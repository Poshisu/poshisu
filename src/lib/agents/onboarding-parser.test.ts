import { describe, expect, it } from "vitest";
import { decideOnboardingParseMode, extractTextFromMessage } from "@/lib/agents/onboarding-parser";

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

describe("decideOnboardingParseMode", () => {
  it("uses transcript when text is missing", () => {
    const decision = decideOnboardingParseMode({ transcript: "I am 30 and vegetarian" });
    expect(decision.mode).toBe("extract");
  });

  it("returns clarify mode when no text or transcript is available", () => {
    const decision = decideOnboardingParseMode({ text: "   ", transcript: "" });
    expect(decision).toEqual({
      mode: "clarify",
      question: "Could you share a quick summary of your onboarding details so I can continue?",
    });
  });
});
