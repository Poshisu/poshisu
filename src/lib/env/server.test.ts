import { afterEach, describe, expect, it, vi } from "vitest";
import { readServerEnv } from "./server";

describe("readServerEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a trimmed plain env value", () => {
    vi.stubEnv("NOURISH_LLM_PROVIDER", " openai ");

    expect(readServerEnv("NOURISH_LLM_PROVIDER")).toBe("openai");
  });

  it("strips a matching KEY=value prefix from pasted Vercel values", () => {
    vi.stubEnv("NOURISH_LLM_PROVIDER", "nourish_llm_provider=openai");
    vi.stubEnv("OPENAI_HEALTH_COACH_MODEL", "OPENAI_HEALTH_COACH_MODEL=gpt-5.2");
    vi.stubEnv("OPENAI_API_KEY", "OPENAI_API_KEY=sk-test");

    expect(readServerEnv("NOURISH_LLM_PROVIDER")).toBe("openai");
    expect(readServerEnv("OPENAI_HEALTH_COACH_MODEL")).toBe("gpt-5.2");
    expect(readServerEnv("OPENAI_API_KEY")).toBe("sk-test");
  });

  it("does not strip non-matching assignment-like values", () => {
    vi.stubEnv("NOURISH_LLM_PROVIDER", "OPENAI_API_KEY=sk-test");

    expect(readServerEnv("NOURISH_LLM_PROVIDER")).toBe("OPENAI_API_KEY=sk-test");
  });
});
