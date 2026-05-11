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
});
