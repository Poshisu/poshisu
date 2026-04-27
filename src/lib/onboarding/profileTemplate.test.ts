import { describe, expect, it } from "vitest";
import { buildProfileMarkdown, isValidProfileMarkdown, profilePreservesSafety } from "./profileTemplate";
import type { OnboardingAnswers } from "./types";

const baseAnswers: OnboardingAnswers = {
  name: "Aarti",
  age: 34,
  gender: "female",
  height_cm: 162,
  weight_kg: 68,
  city: "Bengaluru",
  primary_goal: "lose-weight",
  goal_target_kg: 60,
  goal_timeline_weeks: 24,
  conditions: ["pcos"],
  medications: "Metformin 500mg twice daily",
  dietary_pattern: "veg-egg",
  allergies: ["peanuts"],
  dislikes: "Beetroot, strong cheeses",
  meal_times: { breakfast: "08:30", lunch: "13:30", dinner: "20:30", snacks: "17:00" },
  eating_context: "mixed",
  estimation_preference: "conservative",
};

describe("buildProfileMarkdown", () => {
  it("renders all canonical section headers", () => {
    const md = buildProfileMarkdown(baseAnswers, { date: "2026-04-26" });
    expect(md).toMatch(/^# Profile for Aarti/m);
    expect(md).toContain("## Basics");
    expect(md).toContain("## Goal");
    expect(md).toContain("## Medical");
    expect(md).toContain("## Diet");
    expect(md).toContain("## Eating context");
    expect(md).toContain("## Preferences");
    expect(md).toContain("## Notes for the agents");
  });

  it("includes the date in the _Created:_ line", () => {
    const md = buildProfileMarkdown(baseAnswers, { date: "2026-04-26" });
    expect(md).toContain("_Created: 2026-04-26_");
  });

  it("renders all enums in human form", () => {
    const md = buildProfileMarkdown(baseAnswers, { date: "2026-04-26" });
    expect(md).toContain("**Gender:** Female");
    expect(md).toContain("**Primary goal:** Lose weight");
    expect(md).toContain("**Pattern:** Vegetarian + eggs");
    expect(md).toContain("Mix of home cooking and ordering in");
    expect(md).toContain("Conservative");
  });

  it("renders the allergy warning emoji and the list", () => {
    const md = buildProfileMarkdown(baseAnswers, { date: "2026-04-26" });
    expect(md).toMatch(/\*\*Allergies:\*\* Peanuts ⚠️/);
  });

  it("renders 'None declared' when there are no allergies", () => {
    const md = buildProfileMarkdown({ ...baseAnswers, allergies: [] }, { date: "2026-04-26" });
    expect(md).toMatch(/\*\*Allergies:\*\* None declared ⚠️/);
  });

  it("includes free-form 'other' allergies in the list", () => {
    const md = buildProfileMarkdown(
      { ...baseAnswers, allergies: ["peanuts", "other"], allergies_other: ["mustard", "cinnamon"] },
      { date: "2026-04-26" },
    );
    expect(md).toContain("Peanuts, mustard, cinnamon");
  });

  it("renders 'None declared' when there are no conditions", () => {
    const md = buildProfileMarkdown({ ...baseAnswers, conditions: [] }, { date: "2026-04-26" });
    expect(md).toContain("**Conditions:** None declared");
    expect(md).toContain("No condition-specific notes");
  });

  it("includes per-condition handling notes drawn from SAFETY_RULES", () => {
    const md = buildProfileMarkdown(baseAnswers, { date: "2026-04-26" });
    expect(md).toContain("**PCOS:**");
    expect(md).toMatch(/low-glycemic, high-protein, high-fiber/);
  });

  it("includes 'Other condition' free-form text in notes", () => {
    const md = buildProfileMarkdown(
      { ...baseAnswers, conditions: ["other"], conditions_other: "Lupus" },
      { date: "2026-04-26" },
    );
    expect(md).toContain("**Other condition declared:** Lupus");
  });

  it("renders the meal times block with 'Not typical' for unset slots", () => {
    const md = buildProfileMarkdown(
      { ...baseAnswers, meal_times: { breakfast: "08:00", lunch: "13:00", dinner: "20:00" } },
      { date: "2026-04-26" },
    );
    expect(md).toContain("Breakfast: 08:00");
    expect(md).toContain("Lunch: 13:00");
    expect(md).toContain("Dinner: 20:00");
    expect(md).toContain("Snacks: Not typical");
  });

  it("falls back to 'Not specified' for optional fields", () => {
    const md = buildProfileMarkdown(
      {
        ...baseAnswers,
        city: undefined,
        goal_target_kg: undefined,
        goal_timeline_weeks: undefined,
        medications: undefined,
        dislikes: undefined,
      },
      { date: "2026-04-26" },
    );
    expect(md).toContain("**City:** Not specified");
    expect(md).toContain("**Target:** Not specified");
    expect(md).toContain("**Timeline:** Open-ended");
    expect(md).toContain("**Medications affecting diet:** None declared");
    expect(md).toContain("**Dislikes:** None specified");
  });

  it("includes a hard allergy-enforcement note when allergies exist", () => {
    const md = buildProfileMarkdown(baseAnswers, { date: "2026-04-26" });
    expect(md).toContain("**Allergy enforcement:** Hard");
    expect(md).toContain("cross-contamination");
  });

  it("includes a 'no allergies' enforcement note when none declared", () => {
    const md = buildProfileMarkdown({ ...baseAnswers, allergies: [] }, { date: "2026-04-26" });
    expect(md).toContain("No allergies declared");
  });

  it("today's date defaults when opts.date is omitted", () => {
    const md = buildProfileMarkdown(baseAnswers);
    expect(md).toMatch(/_Created: \d{4}-\d{2}-\d{2}_/);
  });

  it("output passes the structural validator", () => {
    const md = buildProfileMarkdown(baseAnswers);
    expect(isValidProfileMarkdown(md)).toBe(true);
  });
});

describe("isValidProfileMarkdown", () => {
  it("accepts a real template output", () => {
    expect(isValidProfileMarkdown(buildProfileMarkdown(baseAnswers))).toBe(true);
  });

  it("rejects empty / short / non-string inputs", () => {
    expect(isValidProfileMarkdown("")).toBe(false);
    expect(isValidProfileMarkdown("# Profile for X")).toBe(false);
    expect(isValidProfileMarkdown(null as unknown as string)).toBe(false);
    expect(isValidProfileMarkdown(undefined as unknown as string)).toBe(false);
  });

  it("rejects markdown missing required sections", () => {
    const md = buildProfileMarkdown(baseAnswers).replace("## Notes for the agents", "## Random Header");
    expect(isValidProfileMarkdown(md)).toBe(false);
  });

  it("rejects markdown with no profile title", () => {
    const md = buildProfileMarkdown(baseAnswers).replace(/^# Profile for[^\n]+\n/, "");
    expect(isValidProfileMarkdown(md)).toBe(false);
  });
});

describe("profilePreservesSafety", () => {
  it("accepts the template output for a user with allergies and conditions", () => {
    expect(profilePreservesSafety(buildProfileMarkdown(baseAnswers), baseAnswers)).toBe(true);
  });

  it("accepts a profile when the user has no allergies and no conditions", () => {
    const noConcerns = { ...baseAnswers, allergies: [], conditions: [] } as OnboardingAnswers;
    expect(profilePreservesSafety(buildProfileMarkdown(noConcerns), noConcerns)).toBe(true);
  });

  it("rejects a profile that strips the allergy enforcement line", () => {
    const md = buildProfileMarkdown(baseAnswers).replace(
      /\*\*Allergy enforcement:\*\* Hard\.[^\n]*/,
      "**Allergy enforcement:** Soft. Treat as a preference.",
    );
    expect(profilePreservesSafety(md, baseAnswers)).toBe(false);
  });

  it("rejects a profile that drops a declared allergy from the notes", () => {
    // Strip the allergy label from the notes section only.
    const md = buildProfileMarkdown(baseAnswers).replace(/Peanuts/g, "Other_Allergen");
    expect(profilePreservesSafety(md, baseAnswers)).toBe(false);
  });

  it("rejects a profile that drops a declared condition from the notes", () => {
    const md = buildProfileMarkdown(baseAnswers).replace(/PCOS/g, "Other_Condition");
    expect(profilePreservesSafety(md, baseAnswers)).toBe(false);
  });

  it("rejects markdown with no Notes section at all", () => {
    const md = buildProfileMarkdown(baseAnswers).replace(/## Notes for the agents[\s\S]*$/m, "");
    expect(profilePreservesSafety(md, baseAnswers)).toBe(false);
  });

  it("requires custom (other) allergies to appear in the notes", () => {
    const withOther = {
      ...baseAnswers,
      allergies: ["peanuts", "other"] as const,
      allergies_other: ["mustard"],
    } as OnboardingAnswers;
    const md = buildProfileMarkdown(withOther);
    expect(profilePreservesSafety(md, withOther)).toBe(true);

    const stripped = md.replace(/mustard/g, "");
    expect(profilePreservesSafety(stripped, withOther)).toBe(false);
  });
});
