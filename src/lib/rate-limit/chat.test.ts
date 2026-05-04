import { describe, expect, it, vi } from "vitest";
import { enforceChatRateLimit } from "./chat";

describe("enforceChatRateLimit", () => {
  it("returns limiter values when rpc succeeds", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: true, current_count: 5, reset_at: "2026-05-04T01:00:00.000Z" }],
      error: null,
    });

    const result = await enforceChatRateLimit({ rpc } as never, "user-1");

    expect(rpc).toHaveBeenCalled();
    expect(result).toEqual({
      allowed: true,
      currentCount: 5,
      resetAt: "2026-05-04T01:00:00.000Z",
    });
  });

  it("fails closed when rpc errors", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error("down") });

    const result = await enforceChatRateLimit({ rpc } as never, "user-1");

    expect(result.allowed).toBe(false);
    expect(result.currentCount).toBe(60);
  });
});
