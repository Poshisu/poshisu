import { describe, expect, it } from "vitest";
import { onboardingAnswersSchema, parseOnboardingAnswers } from "@/lib/onboarding/schema";

const validBase = {
  name: "Aarti",
  age: 29,
  gender: "female",
  height_cm: 162,
  weight_kg: 68,
  city: "Bengaluru",
  primary_goal: "maintain",
  conditions: ["pcos-pcod"],
  dietary_pattern: "veg",
  allergies: [],
  meal_times: {
    breakfast: "08:00",
    lunch: "13:00",
    dinner: "20:00",
  },
  eating_context: "mixed",
  estimation_preference: "midpoint",
};

describe("onboardingAnswersSchema", () => {
  it("accepts a valid baseline payload", () => {
    const parsed = onboardingAnswersSchema.parse(validBase);
    expect(parsed.name).toBe("Aarti");
  });

  it("requires target and timeline for lose-weight goal", () => {
    const result = onboardingAnswersSchema.safeParse({
      ...validBase,
      primary_goal: "lose-weight",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.goal_target_kg?.[0]).toContain("required");
      expect(fieldErrors.goal_timeline_weeks?.[0]).toContain("required");
    }
  });

  it("allows lose-weight goal when target and timeline are provided", () => {
    const result = onboardingAnswersSchema.safeParse({
      ...validBase,
      primary_goal: "lose-weight",
      goal_target_kg: 61,
      goal_timeline_weeks: 20,
    });

    expect(result.success).toBe(true);
  });

  it("requires at least one main meal time", () => {
    const result = onboardingAnswersSchema.safeParse({
      ...validBase,
      meal_times: { snacks: "17:00" },
    });

    expect(result.success).toBe(false);
  });

  it("rejects malformed HH:mm strings", () => {
    const result = onboardingAnswersSchema.safeParse({
      ...validBase,
      meal_times: {
        breakfast: "8:0",
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects conditions_other when 'other' is not selected", () => {
    const result = onboardingAnswersSchema.safeParse({
      ...validBase,
      conditions: ["hypertension"],
      conditions_other: "Some condition",
    });

    expect(result.success).toBe(false);
  });

  it("parse helper returns typed payload", () => {
    const parsed = parseOnboardingAnswers(validBase);
    expect(parsed.estimation_preference).toBe("midpoint");
  });
});
