import { describe, expect, it } from "vitest";

import { handleMessage } from "./orchestrator";

describe("handleMessage", () => {
  it("routes meal logging candidate messages with estimate + confidence", async () => {
    const response = await handleMessage("user-123", {
      text: "I had paneer and roti for dinner",
      allergies: ["dairy"],
    });

    expect(response.intent).toBe("meal_log_candidate");
    const candidate = response.blocks[0];
    expect(candidate).toMatchObject({
      type: "meal_log_candidate",
      needsConfirmation: true,
      confidence: "high",
    });

    if (candidate.type === "meal_log_candidate") {
      expect(candidate.estimate.kcalMax).toBeGreaterThan(candidate.estimate.kcalMin);
      expect(candidate.safetyFlags.allergenFlags).toContain("allergen:dairy");
    }
  });

  it("returns up to two clarifying questions for ambiguous meals", async () => {
    const response = await handleMessage("user-123", {
      text: "I had some random food",
    });

    const candidate = response.blocks[0];
    expect(candidate.type).toBe("meal_log_candidate");
    if (candidate.type === "meal_log_candidate") {
      expect(candidate.confidence).toBe("low");
      expect(candidate.clarificationQuestions.length).toBeLessThanOrEqual(2);
    }
  });

  it("routes non-meal messages to fallback guidance", async () => {
    const response = await handleMessage("user-123", {
      text: "Can you motivate me today?",
    });

    expect(response.intent).toBe("general_fallback_guidance");
    expect(response.blocks).toEqual([
      {
        type: "text",
        text: expect.stringContaining("meal logging"),
      },
    ]);
  });

  it("throws for malformed payload", async () => {
    await expect(handleMessage("user-123", { foo: "bar" })).rejects.toThrow(
      "Invalid message payload",
    );
  });

  it("throws for blank userId", async () => {
    await expect(handleMessage("   ", { text: "I had idli" })).rejects.toThrow("Invalid userId");
  });
});
