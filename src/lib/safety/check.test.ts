import { describe, expect, it } from "vitest";
import { evaluateMealSafety } from "@/lib/safety/check";

describe("evaluateMealSafety", () => {
  it("flags allergy conflicts", () => {
    const result = evaluateMealSafety({
      foods: ["paneer", "roti"],
      allergies: ["dairy"],
      conditions: [],
    });

    expect(result.allergenFlags).toContain("allergen:dairy");
  });

  it("flags condition conflicts deterministically", () => {
    const result = evaluateMealSafety({
      foods: ["sweet lassi"],
      allergies: [],
      conditions: ["type-2-diabetes"],
    });

    expect(result.conditionFlags[0]).toContain("condition:type-2-diabetes");
  });

  it("blocks recommendations that conflict with declared allergies using ingredient synonyms", () => {
    const result = evaluateMealSafety({
      foods: ["peanut chutney", "almond milk smoothie", "curd rice"],
      allergies: ["groundnut", "tree-nut", "dairy"],
      conditions: [],
    });

    expect(result.blocked).toBe(true);
    expect(result.allergenFlags).toEqual(
      expect.arrayContaining(["allergen:groundnut", "allergen:tree-nut", "allergen:dairy"]),
    );
    expect(result.blockingReasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("groundnut"),
        expect.stringContaining("tree-nut"),
        expect.stringContaining("dairy"),
      ]),
    );
  });

  it("blocks condition conflicts for common Indian high-risk foods", () => {
    const result = evaluateMealSafety({
      foods: ["jaggery chai", "papad", "pickle", "fruit juice"],
      allergies: [],
      conditions: ["prediabetes", "hypertension", "kidney-disease"],
    });

    expect(result.blocked).toBe(true);
    expect(result.conditionFlags).toEqual(
      expect.arrayContaining([
        "condition:prediabetes:high glycemic load",
        "condition:hypertension:high sodium",
        "condition:kidney-disease:renal diet risk",
      ]),
    );
  });

  it("returns safe alternatives that avoid the triggered allergen and condition conflicts", () => {
    const result = evaluateMealSafety({
      foods: ["paneer", "sweet lassi", "pickle"],
      allergies: ["dairy"],
      conditions: ["type-2-diabetes", "hypertension"],
    });

    expect(result.blocked).toBe(true);
    expect(result.safeAlternatives).toEqual(expect.arrayContaining(["plain dal", "grilled chicken", "tofu bhurji"]));
    expect(result.safeAlternatives.join(" ").toLowerCase()).not.toMatch(/paneer|curd|milk|lassi|pickle|sweet|sugar/);
  });

  it("does not block low-risk meals when allergies and conditions do not conflict", () => {
    const result = evaluateMealSafety({
      foods: ["plain dal", "roti", "cucumber salad"],
      allergies: ["egg"],
      conditions: ["hypertension"],
    });

    expect(result.blocked).toBe(false);
    expect(result.allergenFlags).toEqual([]);
    expect(result.conditionFlags).toEqual([]);
    expect(result.blockingReasons).toEqual([]);
  });
});
