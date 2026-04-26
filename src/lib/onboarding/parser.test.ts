import { describe, expect, it } from "vitest";
import { onboardingAnswersSchema, parseAnswer } from "./parser";

describe("parseAnswer — name", () => {
  it("accepts a plain name", () => {
    const r = parseAnswer("name", "Aarti", {});
    expect(r).toEqual({ ok: true, fields: { name: "Aarti" } });
  });

  it("strips conversational prefixes", () => {
    expect(parseAnswer("name", "I'm Aarti", {})).toEqual({ ok: true, fields: { name: "Aarti" } });
    expect(parseAnswer("name", "my name is Aarti", {})).toEqual({ ok: true, fields: { name: "Aarti" } });
    expect(parseAnswer("name", "call me Aarti", {})).toEqual({ ok: true, fields: { name: "Aarti" } });
  });

  it("rejects empty input", () => {
    expect(parseAnswer("name", "   ", {})).toMatchObject({ ok: false });
  });

  it("rejects 60+ char names", () => {
    const longName = "A".repeat(70);
    expect(parseAnswer("name", longName, {})).toMatchObject({ ok: false });
  });
});

describe("parseAnswer — age", () => {
  it.each([
    ["34", 34],
    ["I'm 34", 34],
    ["34 years old", 34],
    ["34 yrs", 34],
    ["13", 13],
    ["100", 100],
  ])("accepts %s as %i", (input, expected) => {
    expect(parseAnswer("age", input, {})).toEqual({ ok: true, fields: { age: expected } });
  });

  it("rounds floats", () => {
    expect(parseAnswer("age", "34.6", {})).toEqual({ ok: true, fields: { age: 35 } });
  });

  it.each(["12", "101", "150", "abc"])("rejects out-of-range / non-numeric %s", (input) => {
    expect(parseAnswer("age", input, {})).toMatchObject({ ok: false });
  });
});

describe("parseAnswer — gender", () => {
  it.each([
    ["Female", "female"],
    ["female", "female"],
    ["f", "female"],
    ["she/her", "female"],
    ["Male", "male"],
    ["he him", "male"],
    ["non-binary", "non-binary"],
    ["nb", "non-binary"],
    ["prefer not to say", "prefer-not-to-say"],
    ["skip", "prefer-not-to-say"],
  ])("maps %s to %s", (input, expected) => {
    expect(parseAnswer("gender", input, {})).toEqual({ ok: true, fields: { gender: expected } });
  });

  it("asks again on unknown input", () => {
    expect(parseAnswer("gender", "?????", {})).toMatchObject({ ok: false });
  });
});

describe("parseAnswer — height_cm", () => {
  it("accepts plain cm", () => {
    expect(parseAnswer("height_cm", "162", {})).toEqual({ ok: true, fields: { height_cm: 162 } });
  });

  it("accepts cm with units", () => {
    expect(parseAnswer("height_cm", "162 cm", {})).toEqual({ ok: true, fields: { height_cm: 162 } });
  });

  it("converts feet+inches", () => {
    expect(parseAnswer("height_cm", "5'6", {})).toEqual({ ok: true, fields: { height_cm: 168 } });
    expect(parseAnswer("height_cm", "5 ft 10", {})).toEqual({ ok: true, fields: { height_cm: 178 } });
    expect(parseAnswer("height_cm", "5 feet", {})).toEqual({ ok: true, fields: { height_cm: 152 } });
  });

  it.each(["80", "300", "abc"])("rejects %s", (input) => {
    expect(parseAnswer("height_cm", input, {})).toMatchObject({ ok: false });
  });
});

describe("parseAnswer — weight_kg", () => {
  it("accepts plain kg", () => {
    expect(parseAnswer("weight_kg", "68", {})).toEqual({ ok: true, fields: { weight_kg: 68 } });
  });

  it("converts lbs", () => {
    expect(parseAnswer("weight_kg", "150 lbs", {})).toEqual({ ok: true, fields: { weight_kg: 68 } });
  });

  it("preserves one decimal of precision", () => {
    expect(parseAnswer("weight_kg", "68.5", {})).toEqual({ ok: true, fields: { weight_kg: 68.5 } });
  });

  it.each(["20", "300", "abc"])("rejects %s", (input) => {
    expect(parseAnswer("weight_kg", input, {})).toMatchObject({ ok: false });
  });
});

describe("parseAnswer — city", () => {
  it("strips conversational prefix", () => {
    expect(parseAnswer("city", "I'm in Bengaluru", {})).toEqual({ ok: true, fields: { city: "Bengaluru" } });
  });

  it("treats skip / none as no answer", () => {
    expect(parseAnswer("city", "skip", {})).toEqual({ ok: true, fields: {} });
    expect(parseAnswer("city", "none", {})).toEqual({ ok: true, fields: {} });
  });
});

describe("parseAnswer — primary_goal", () => {
  it.each([
    ["Lose weight", "lose-weight"],
    ["weight loss", "lose-weight"],
    ["build muscle", "gain-weight"],
    ["bulk up", "gain-weight"],
    ["Eat better", "maintain"],
    ["Manage a condition", "manage-condition"],
    ["More energy", "wellness"],
    ["wellness", "wellness"],
  ])("maps %s to %s", (input, expected) => {
    expect(parseAnswer("primary_goal", input, {})).toEqual({
      ok: true,
      fields: { primary_goal: expected },
    });
  });
});

describe("parseAnswer — goal_target_and_timeline", () => {
  it("parses '60 kg in 24 weeks'", () => {
    expect(parseAnswer("goal_target_and_timeline", "60 kg in 24 weeks", {})).toEqual({
      ok: true,
      fields: { goal_target_kg: 60, goal_timeline_weeks: 24 },
    });
  });

  it("parses months → weeks (1 month = 4 weeks)", () => {
    expect(parseAnswer("goal_target_and_timeline", "60 kg in 6 months", {})).toEqual({
      ok: true,
      fields: { goal_target_kg: 60, goal_timeline_weeks: 24 },
    });
  });

  it("asks for timeline when only weight is given", () => {
    expect(parseAnswer("goal_target_and_timeline", "60", {})).toMatchObject({ ok: false });
  });

  it("asks for target when only timeline is given", () => {
    expect(parseAnswer("goal_target_and_timeline", "in 24 weeks", {})).toMatchObject({ ok: false });
  });

  it("rejects out-of-range targets", () => {
    expect(parseAnswer("goal_target_and_timeline", "10 kg in 4 weeks", {})).toMatchObject({ ok: false });
  });
});

describe("parseAnswer — conditions", () => {
  it.each([
    ["none", []],
    ["nope", []],
    ["nothing", []],
    ["No", []],
  ])("treats %s as empty list", (input, expected) => {
    expect(parseAnswer("conditions", input, {})).toEqual({ ok: true, fields: { conditions: expected } });
  });

  it("parses single condition", () => {
    expect(parseAnswer("conditions", "PCOS", {})).toMatchObject({
      ok: true,
      fields: { conditions: ["pcos"] },
    });
  });

  it("parses multiple conditions split by comma", () => {
    const r = parseAnswer("conditions", "PCOS, hypertension", {});
    expect(r).toMatchObject({
      ok: true,
      fields: { conditions: ["pcos", "hypertension"] },
    });
  });

  it("parses 'and' separator", () => {
    const r = parseAnswer("conditions", "PCOS and high cholesterol", {});
    expect(r).toMatchObject({
      ok: true,
      fields: { conditions: ["pcos", "high-cholesterol"] },
    });
  });

  it("captures unmatched terms in conditions_other", () => {
    const r = parseAnswer("conditions", "PCOS, lupus", {});
    expect(r).toMatchObject({
      ok: true,
      fields: { conditions: ["pcos", "other"], conditions_other: "lupus" },
    });
  });

  it("recognises common synonyms", () => {
    expect(parseAnswer("conditions", "diabetes", {})).toMatchObject({
      ok: true,
      fields: { conditions: ["t2-diabetes"] },
    });
    expect(parseAnswer("conditions", "high BP", {})).toMatchObject({
      ok: true,
      fields: { conditions: ["hypertension"] },
    });
    expect(parseAnswer("conditions", "PCOD", {})).toMatchObject({
      ok: true,
      fields: { conditions: ["pcos"] },
    });
  });

  it("re-prompts on a single unrecognised single-word reply", () => {
    expect(parseAnswer("conditions", "??", {})).toMatchObject({ ok: false });
  });
});

describe("parseAnswer — dietary_pattern", () => {
  it.each([
    ["Vegetarian", "veg"],
    ["veggie", "veg"],
    ["veg + eggs", "veg-egg"],
    ["eggetarian", "veg-egg"],
    ["Non-veg", "non-veg"],
    ["meat eater", "non-veg"],
    ["Vegan", "vegan"],
    ["plant based", "vegan"],
    ["jain", "jain"],
    ["pescatarian", "pescetarian"],
    ["no restrictions", "none"],
  ])("maps %s to %s", (input, expected) => {
    expect(parseAnswer("dietary_pattern", input, {})).toEqual({
      ok: true,
      fields: { dietary_pattern: expected },
    });
  });
});

describe("parseAnswer — allergies", () => {
  it("treats none / nope as empty", () => {
    expect(parseAnswer("allergies", "none", {})).toEqual({ ok: true, fields: { allergies: [] } });
  });

  it("parses common allergies", () => {
    expect(parseAnswer("allergies", "peanuts and dairy", {})).toMatchObject({
      ok: true,
      fields: { allergies: ["peanuts", "dairy"] },
    });
  });

  it("recognises tree-nut compound term", () => {
    expect(parseAnswer("allergies", "tree nuts", {})).toMatchObject({
      ok: true,
      fields: { allergies: ["tree-nuts"] },
    });
  });

  it("captures unmatched terms in allergies_other", () => {
    const r = parseAnswer("allergies", "peanuts, mustard", {});
    expect(r).toMatchObject({
      ok: true,
      fields: { allergies: ["peanuts", "other"], allergies_other: ["mustard"] },
    });
  });
});

describe("parseAnswer — meal_times", () => {
  it("recognises 'standard' preset", () => {
    expect(parseAnswer("meal_times", "Standard", {})).toEqual({
      ok: true,
      fields: { meal_times: { breakfast: "08:00", lunch: "13:00", dinner: "20:00" } },
    });
  });

  it("recognises 'early riser' preset", () => {
    expect(parseAnswer("meal_times", "Early riser", {})).toEqual({
      ok: true,
      fields: { meal_times: { breakfast: "07:00", lunch: "12:00", dinner: "19:00" } },
    });
  });

  it("parses three custom times", () => {
    expect(parseAnswer("meal_times", "8am, 1pm, 8pm", {})).toEqual({
      ok: true,
      fields: { meal_times: { breakfast: "08:00", lunch: "13:00", dinner: "20:00", snacks: undefined } },
    });
  });

  it("parses 24h format", () => {
    expect(parseAnswer("meal_times", "08:00, 13:30, 20:00", {})).toEqual({
      ok: true,
      fields: { meal_times: { breakfast: "08:00", lunch: "13:30", dinner: "20:00", snacks: undefined } },
    });
  });

  it("re-prompts on 'custom'", () => {
    expect(parseAnswer("meal_times", "Custom", {})).toMatchObject({ ok: false });
  });

  it("re-prompts when fewer than three times can be parsed", () => {
    expect(parseAnswer("meal_times", "8am", {})).toMatchObject({ ok: false });
  });
});

describe("parseAnswer — eating_context", () => {
  it.each([
    ["Mostly cook", "home"],
    ["Mix", "mixed"],
    ["mostly order", "out"],
    ["delivery", "out"],
    ["Varies a lot", "varies"],
  ])("maps %s to %s", (input, expected) => {
    expect(parseAnswer("eating_context", input, {})).toEqual({
      ok: true,
      fields: { eating_context: expected },
    });
  });
});

describe("parseAnswer — estimation_preference", () => {
  it.each([
    ["Conservative", "conservative"],
    ["lower", "conservative"],
    ["Midpoint", "midpoint"],
    ["middle", "midpoint"],
    ["best guess", "midpoint"],
    ["Liberal", "liberal"],
    ["higher", "liberal"],
  ])("maps %s to %s", (input, expected) => {
    expect(parseAnswer("estimation_preference", input, {})).toEqual({
      ok: true,
      fields: { estimation_preference: expected },
    });
  });
});

describe("onboardingAnswersSchema (final validator)", () => {
  const validBase = {
    name: "Aarti",
    age: 34,
    gender: "female" as const,
    height_cm: 162,
    weight_kg: 68,
    primary_goal: "lose-weight" as const,
    goal_target_kg: 60,
    goal_timeline_weeks: 24,
    conditions: ["pcos" as const],
    dietary_pattern: "veg-egg" as const,
    allergies: ["peanuts" as const],
    meal_times: { breakfast: "08:30", lunch: "13:30", dinner: "20:30" },
    eating_context: "mixed" as const,
    estimation_preference: "conservative" as const,
  };

  it("accepts a complete valid object", () => {
    const r = onboardingAnswersSchema.safeParse(validBase);
    expect(r.success).toBe(true);
  });

  it("rejects out-of-range age", () => {
    const r = onboardingAnswersSchema.safeParse({ ...validBase, age: 12 });
    expect(r.success).toBe(false);
  });

  it("rejects malformed meal time", () => {
    const r = onboardingAnswersSchema.safeParse({ ...validBase, meal_times: { breakfast: "8am" } });
    expect(r.success).toBe(false);
  });

  it("requires conditions to be an array (not undefined)", () => {
    const { conditions: _conditions, ...withoutConditions } = validBase;
    void _conditions;
    const r = onboardingAnswersSchema.safeParse(withoutConditions);
    expect(r.success).toBe(false);
  });

  it("allows empty conditions and allergies arrays", () => {
    const r = onboardingAnswersSchema.safeParse({ ...validBase, conditions: [], allergies: [] });
    expect(r.success).toBe(true);
  });
});
