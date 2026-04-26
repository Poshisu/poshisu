import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({ rpc: rpcMock })),
}));

import { getAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    vi.mocked(getAdminClient).mockReturnValue({ rpc: rpcMock } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns allowed: true when the RPC says under the limit", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ allowed: true, current_count: 5, reset_at: "2026-04-26T10:00:00Z" }],
      error: null,
    });

    const result = await checkRateLimit({
      userId: "u-1",
      bucket: "voice:hour",
      windowMinutes: 60,
      limit: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(5);
    expect(result.resetAt).toBeInstanceOf(Date);
  });

  it("returns allowed: false when the RPC says over the limit", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ allowed: false, current_count: 61, reset_at: "2026-04-26T10:00:00Z" }],
      error: null,
    });

    const result = await checkRateLimit({
      userId: "u-1",
      bucket: "voice:hour",
      windowMinutes: 60,
      limit: 60,
    });

    expect(result.allowed).toBe(false);
    expect(result.currentCount).toBe(61);
  });

  it("calls the RPC with the right arguments", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ allowed: true, current_count: 1, reset_at: "2026-04-26T10:00:00Z" }],
      error: null,
    });

    await checkRateLimit({
      userId: "u-1",
      bucket: "voice:hour",
      windowMinutes: 60,
      limit: 60,
    });

    expect(rpcMock).toHaveBeenCalledWith("increment_rate_limit", {
      p_user_id: "u-1",
      p_bucket: "voice:hour",
      p_window_minutes: 60,
      p_limit: 60,
    });
  });

  it("fails open when the admin client is unavailable", async () => {
    vi.mocked(getAdminClient).mockReturnValueOnce(null);
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await checkRateLimit({
      userId: "u-1",
      bucket: "voice:hour",
      windowMinutes: 60,
      limit: 60,
    });

    expect(result.allowed).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("fails open when the RPC errors", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "db down" } });
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await checkRateLimit({
      userId: "u-1",
      bucket: "voice:hour",
      windowMinutes: 60,
      limit: 60,
    });

    expect(result.allowed).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[rate-limit] RPC failed — failing open",
      expect.objectContaining({ error: "db down" }),
    );
  });

  it("fails open when the RPC returns no rows", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await checkRateLimit({
      userId: "u-1",
      bucket: "voice:hour",
      windowMinutes: 60,
      limit: 60,
    });

    expect(result.allowed).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
