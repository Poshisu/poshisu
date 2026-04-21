import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withServerActionLogging } from "./serverAction";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("withServerActionLogging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the inner function's resolved value", async () => {
    const wrapped = withServerActionLogging("demo", async (n: number) => n * 2);
    await expect(wrapped(5)).resolves.toBe(10);
  });

  it("logs to console.error and forwards to Sentry on a regular throw", async () => {
    const Sentry = await import("@sentry/nextjs");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = new Error("kaboom");
    const wrapped = withServerActionLogging("crashy", async () => {
      throw boom;
    });

    await expect(wrapped()).rejects.toBe(boom);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[server-action:crashy]",
      expect.objectContaining({ message: "kaboom" }),
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(boom, {
      tags: { serverAction: "crashy" },
    });
  });

  it("wraps non-Error throws into Error instances", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapped = withServerActionLogging("stringy", async () => {
      throw "just a string";
    });

    await expect(wrapped()).rejects.toThrowError("just a string");
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("propagates Next redirect errors without logging", async () => {
    const Sentry = await import("@sentry/nextjs");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;push;/chat;307;",
    });

    const wrapped = withServerActionLogging("redirecty", async () => {
      throw redirectError;
    });

    await expect(wrapped()).rejects.toBe(redirectError);
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("propagates Next notFound errors without logging", async () => {
    const Sentry = await import("@sentry/nextjs");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const notFoundError = Object.assign(new Error("NEXT_NOT_FOUND"), {
      digest: "NEXT_NOT_FOUND",
    });

    const wrapped = withServerActionLogging("notfoundy", async () => {
      throw notFoundError;
    });

    await expect(wrapped()).rejects.toBe(notFoundError);
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
