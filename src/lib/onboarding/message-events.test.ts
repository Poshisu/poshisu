import { describe, expect, it } from "vitest";
import { parseMultimodalMessageEvent } from "@/lib/onboarding/message-events";

describe("parseMultimodalMessageEvent", () => {
  it("accepts text-only events", () => {
    const parsed = parseMultimodalMessageEvent({ text: "hello" });
    expect(parsed.text).toBe("hello");
  });

  it("accepts attachment metadata", () => {
    const parsed = parseMultimodalMessageEvent({
      images: [
        {
          type: "image",
          attachmentId: "d16f4220-d3ec-4ea8-9dd4-0869293697f4",
          storagePath: "onboarding/u1/image/2026-05-05/test.jpg",
          metadata: { originalName: "meal.jpg", mimeType: "image/jpeg", sizeBytes: 1200 },
        },
      ],
    });

    expect(parsed.images).toHaveLength(1);
  });

  it("rejects empty events", () => {
    expect(() => parseMultimodalMessageEvent({})).toThrow("Message event must contain text or at least one attachment.");
  });
});
