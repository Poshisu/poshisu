import { describe, expect, it } from "vitest";
import { parseItemsFromText, runPipeline } from "@/lib/nutrition/pipeline";

describe("nutrition pipeline", () => {
  it("parses known items and computes deterministic ranges", async () => {
    const parsed = parseItemsFromText("I had paneer and roti for dinner");
    expect(parsed.items).toEqual(["roti", "paneer"]);
    expect(parsed.isAmbiguous).toBe(false);

    const result = await runPipeline(parsed.items);
    expect(result.confidence).toBe("high");
    expect(result.kcalMin).toBeGreaterThan(300);
    expect(result.kcalMax).toBeGreaterThan(result.kcalMin);
    expect(result.rationale).toContain("home-style prep");
  });

  it("returns low-confidence broad estimate for unknown meal", async () => {
    const parsed = parseItemsFromText("I ate some random food");
    const result = await runPipeline(parsed.items);

    expect(parsed.isAmbiguous).toBe(true);
    expect(result.confidence).toBe("low");
    expect(result.clarificationQuestions).toHaveLength(2);
  });
});
