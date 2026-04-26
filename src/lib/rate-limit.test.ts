import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({ rpc: rpcMock })),
}));

import { getAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "./rate-limit";

const ORIGINAL_FAIL_OPEN = process.env.ALLOW_RATE_LIMIT_FAIL_OPEN;

describe("checkRateLimit", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    vi.mocked(getAdminClient).mockReturnValue({ rpc: rpcMock } as never);
    delete process.env.ALLOW_RATE_LIMIT_FAIL_OPEN;
  });

  afterEach(() => {
    if (ORIGINAL_FAIL_OPEN === undefined) delete process.env.ALLOW_RATE_LIMIT_FAIL_OPEN;
    else process.env.ALLOW_RATE_LIMIT_FAIL_OPEN = ORIGINAL_FAIL_OPEN;
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

  it("fails CLOSED by default when the admin client is unavailable", async () => {
    vi.mocked(getAdminClient).mockReturnValueOnce(null);
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await checkRateLimit({
      userId: "u-1",
      bucket: "voice:hour",
      windowMinutes: 60,
      limit: 60,
    });

    expect(result.allowed).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[rate-limit] admin client unavailable",
      expect.objectContaining({ mode: "fail-closed" }),
    );
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("fails OPEN when ALLOW_RATE_LIMIT_FAIL_OPEN=true and admin is unavailable", async () => {
    process.env.ALLOW_RATE_LIMIT_FAIL_OPEN = "true";
    vi.mocked(getAdminClient).mockReturnValueOnce(null);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await checkRateLimit({
      userId: "u-1",
      bucket: "voice:hour",
      windowMinutes: 60,
      limit: 60,
    });

    expect(result.allowed).toBe(true);
  });

  it("fails CLOSED by default when the RPC errors", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "db down" } });
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await checkRateLimit({
      userId: "u-1",
      bucket: "voice:hour",
      windowMinutes: 60,
      limit: 60,
    });

    expect(result.allowed).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[rate-limit] RPC failed",
      expect.objectContaining({ error: "db down", mode: "fail-closed" }),
    );
  });

  it("fails CLOSED by default when the RPC returns no rows", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await checkRateLimit({
      userId: "u-1",
      bucket: "voice:hour",
      windowMinutes: 60,
      limit: 60,
    });

    expect(result.allowed).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("treats any value other than 'true' as fail-closed (e.g. 'false', '1', empty)", async () => {
    process.env.ALLOW_RATE_LIMIT_FAIL_OPEN = "false";
    vi.mocked(getAdminClient).mockReturnValueOnce(null);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await checkRateLimit({
      userId: "u-1",
      bucket: "voice:hour",
      windowMinutes: 60,
      limit: 60,
    });

    expect(result.allowed).toBe(false);
  });
});
