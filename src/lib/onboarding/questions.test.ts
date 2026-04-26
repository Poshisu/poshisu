import { describe, expect, it } from "vitest";
import { QUESTIONS, getQuestion, nextQuestion, type OnboardingQuestionId } from "./questions";

describe("QUESTIONS script", () => {
  it("has the expected 16 questions in the canonical order", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(ids).toEqual([
      "name",
      "age",
      "gender",
      "height_cm",
      "weight_kg",
      "city",
      "primary_goal",
      "goal_target_and_timeline",
      "conditions",
      "medications",
      "dietary_pattern",
      "allergies",
      "dislikes",
      "meal_times",
      "eating_context",
      "estimation_preference",
    ]);
  });

  it("has unique ids", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("pre-selects 'Midpoint' on the estimation_preference question", () => {
    const q = QUESTIONS.find((x) => x.id === "estimation_preference")!;
    expect(q.defaultChip).toBe("Midpoint");
  });
});

describe("getQuestion", () => {
  it("returns the matching question", () => {
    expect(getQuestion("name").id).toBe("name");
    expect(getQuestion("estimation_preference").defaultChip).toBe("Midpoint");
  });

  it("throws on an unknown id", () => {
    expect(() => getQuestion("???" as unknown as OnboardingQuestionId)).toThrow();
  });
});

describe("nextQuestion", () => {
  it("returns the first question when the draft is empty", () => {
    expect(nextQuestion({}, new Set())?.id).toBe("name");
  });

  it("walks through questions in order as they're answered", () => {
    const answered = new Set<OnboardingQuestionId>(["name", "age"]);
    expect(nextQuestion({}, answered)?.id).toBe("gender");
  });

  it("returns null once every question is answered", () => {
    const answered = new Set<OnboardingQuestionId>(QUESTIONS.map((q) => q.id));
    expect(nextQuestion({}, answered)).toBeNull();
  });

  it("skips goal_target_and_timeline when goal is 'wellness'", () => {
    const draft = { primary_goal: "wellness" as const };
    const answered = new Set<OnboardingQuestionId>([
      "name",
      "age",
      "gender",
      "height_cm",
      "weight_kg",
      "city",
      "primary_goal",
    ]);
    expect(nextQuestion(draft, answered)?.id).toBe("conditions");
  });

  it("skips goal_target_and_timeline when goal is 'maintain'", () => {
    const draft = { primary_goal: "maintain" as const };
    const answered = new Set<OnboardingQuestionId>([
      "name",
      "age",
      "gender",
      "height_cm",
      "weight_kg",
      "city",
      "primary_goal",
    ]);
    expect(nextQuestion(draft, answered)?.id).toBe("conditions");
  });

  it("includes goal_target_and_timeline when goal is 'lose-weight'", () => {
    const draft = { primary_goal: "lose-weight" as const };
    const answered = new Set<OnboardingQuestionId>([
      "name",
      "age",
      "gender",
      "height_cm",
      "weight_kg",
      "city",
      "primary_goal",
    ]);
    expect(nextQuestion(draft, answered)?.id).toBe("goal_target_and_timeline");
  });

  it("includes goal_target_and_timeline when goal is 'gain-weight'", () => {
    const draft = { primary_goal: "gain-weight" as const };
    const answered = new Set<OnboardingQuestionId>([
      "name",
      "age",
      "gender",
      "height_cm",
      "weight_kg",
      "city",
      "primary_goal",
    ]);
    expect(nextQuestion(draft, answered)?.id).toBe("goal_target_and_timeline");
  });
});
