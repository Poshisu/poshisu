import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isDebugSurfaceAllowed } from "./debugSurface";

describe("isDebugSurfaceAllowed", () => {
  const originalVercelEnv = process.env.VERCEL_ENV;

  beforeEach(() => {
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
    vi.unstubAllEnvs();
  });

  it("returns true on Vercel preview", () => {
    process.env.VERCEL_ENV = "preview";
    expect(isDebugSurfaceAllowed()).toBe(true);
  });

  it("returns true on Vercel development", () => {
    process.env.VERCEL_ENV = "development";
    expect(isDebugSurfaceAllowed()).toBe(true);
  });

  it("returns false on Vercel production", () => {
    process.env.VERCEL_ENV = "production";
    vi.stubEnv("NODE_ENV", "development"); // shouldn't matter — Vercel wins
    expect(isDebugSurfaceAllowed()).toBe(false);
  });

  it("falls back to NODE_ENV when VERCEL_ENV is unset", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDebugSurfaceAllowed()).toBe(true);
  });

  it("returns false when NODE_ENV is production and VERCEL_ENV unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isDebugSurfaceAllowed()).toBe(false);
  });
});
