import { describe, expect, it } from "vitest";

import {
  evaluatePromptSuite,
  getFailedPromptEvalSuites,
  promptEvalSuites,
  summarizePromptEvalRun,
} from "@/lib/evals/prompt-evals";

describe("prompt eval harness", () => {
  it("tracks the required S5-T01 suites with non-empty cases and thresholds", () => {
    expect(promptEvalSuites.map((suite) => suite.id)).toEqual([
      "onboarding-parser",
      "router",
      "nutrition-estimator",
      "coach",
    ]);

    for (const suite of promptEvalSuites) {
      expect(suite.cases.length).toBeGreaterThanOrEqual(3);
      expect(suite.threshold).toBeGreaterThanOrEqual(0.8);
      expect(suite.threshold).toBeLessThanOrEqual(1);
    }
  });

  it("evaluates onboarding, router, nutrition, and coach baselines above threshold", async () => {
    const run = await evaluatePromptSuite();

    expect(run.overall.passed).toBe(true);
    expect(run.overall.totalCases).toBeGreaterThanOrEqual(12);
    expect(run.overall.score).toBeGreaterThanOrEqual(0.8);
    expect(run.suites.every((suite) => suite.passed)).toBe(true);
    expect(run.suites.map((suite) => suite.id)).toEqual([
      "onboarding-parser",
      "router",
      "nutrition-estimator",
      "coach",
    ]);
  });

  it("produces a stable copy-pasteable baseline summary", async () => {
    const summary = summarizePromptEvalRun(await evaluatePromptSuite());

    expect(summary).toContain("Prompt eval baseline");
    expect(summary).toContain("onboarding-parser:");
    expect(summary).toContain("router:");
    expect(summary).toContain("nutrition-estimator:");
    expect(summary).toContain("coach:");
    expect(summary).toContain("Overall:");
  });

  it("surfaces suite-level threshold failures even when there are no failed case IDs", async () => {
    const run = await evaluatePromptSuite([
      {
        id: "coach",
        title: "Empty suite guard",
        threshold: 1,
        cases: [],
      },
    ]);

    expect(run.overall.passed).toBe(false);
    expect(getFailedPromptEvalSuites(run)).toEqual(["coach: 0/0 (0%) threshold 100%"]);
  });
});
