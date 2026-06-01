import { describe, expect, it } from "vitest";
import { parseItemsFromText, runPipeline } from "@/lib/nutrition/pipeline";

describe("nutrition pipeline", () => {
  it("parses known items and computes deterministic ranges", async () => {
    const parsed = parseItemsFromText("I had paneer and roti for dinner");
    expect(parsed.items.map((item) => item.key)).toEqual(["roti", "paneer"]);
    expect(parsed.isAmbiguous).toBe(false);

    const result = await runPipeline(parsed.items);
    expect(result.confidence).toBe("high");
    expect(result.kcalMin).toBeGreaterThan(300);
    expect(result.kcalMax).toBeGreaterThan(result.kcalMin);
    expect(result.rationale).toContain("recognized items");
  });

  it("returns low-confidence broad estimate for unknown meal", async () => {
    const parsed = parseItemsFromText("I ate some random food");
    const result = await runPipeline(parsed.items);

    expect(parsed.isAmbiguous).toBe(true);
    expect(result.confidence).toBe("low");
    expect(result.clarificationQuestions).toHaveLength(2);
  });

  it("does not hallucinate roti from misspelled protein and estimates the screenshot breakfast", async () => {
    const text =
      "Breakfast the whole truth unflavoured whey isolate protien 35g True Elements rolled oats 60g. 1 cup is 115g Skyr yogurt 50g Chia and flax 1 tsp each 2 dates / 1 tsp honey 100ml almond milk from So Good 100gm dragonfruit and 60gm mango And 30gm radish kimchi";
    const parsed = parseItemsFromText(text);

    expect(parsed.items.map((item) => item.key)).not.toContain("roti");
    expect(parsed.items.map((item) => item.key)).toEqual(
      expect.arrayContaining(["whey isolate", "oats", "skyr", "chia", "flax", "dates", "honey", "almond milk", "dragonfruit", "mango", "kimchi"]),
    );

    const result = await runPipeline(parsed.items);
    expect(result.kcalMin).toBeGreaterThanOrEqual(500);
    expect(result.kcalMax).toBeLessThanOrEqual(760);
    expect(result.protein).toBeGreaterThanOrEqual(40);
    expect(result.items).not.toContain("roti");
  });

  it("recognizes a delayed quantity in chicken krapow style text", async () => {
    const parsed = parseItemsFromText("Thai chicken krapow 150g, a fried egg and 100g white rice for dinner");
    const chicken = parsed.items.find((item) => item.key === "chicken");

    expect(chicken?.quantityG).toBe(150);
    expect(parsed.items.map((item) => item.key)).toEqual(expect.arrayContaining(["chicken", "egg", "rice"]));
  });

});
