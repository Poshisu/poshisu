import { describe, expect, it } from "vitest";

import { handleMessage } from "./orchestrator";

describe("handleMessage", () => {
  it("routes meal logging candidate messages", async () => {
    const response = await handleMessage("user-123", {
      text: "I had paneer tikka and roti for dinner",
    });

    expect(response.intent).toBe("meal_log_candidate");
    expect(response.blocks[0]).toMatchObject({
      type: "meal_log_candidate",
      needsConfirmation: true,
    });
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
