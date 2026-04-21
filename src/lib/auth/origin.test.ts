import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trustedAppOrigin } from "./origin";

const KEYS = ["NEXT_PUBLIC_APP_URL", "VERCEL_BRANCH_URL", "VERCEL_URL"] as const;

describe("trustedAppOrigin", () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) original[k] = process.env[k];
    for (const k of KEYS) delete process.env[k];
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
    vi.unstubAllEnvs();
  });

  it("returns NEXT_PUBLIC_APP_URL verbatim when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://nourish.app";
    expect(trustedAppOrigin()).toBe("https://nourish.app");
  });

  it("strips a trailing slash from NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://nourish.app/";
    expect(trustedAppOrigin()).toBe("https://nourish.app");
  });

  it("prefers NEXT_PUBLIC_APP_URL over Vercel vars", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://nourish.app";
    process.env.VERCEL_BRANCH_URL = "branch.vercel.app";
    process.env.VERCEL_URL = "deploy.vercel.app";
    expect(trustedAppOrigin()).toBe("https://nourish.app");
  });

  it("falls back to VERCEL_BRANCH_URL and prepends https://", () => {
    process.env.VERCEL_BRANCH_URL = "poshisu-git-feature-team.vercel.app";
    expect(trustedAppOrigin()).toBe("https://poshisu-git-feature-team.vercel.app");
  });

  it("prefers VERCEL_BRANCH_URL over VERCEL_URL", () => {
    process.env.VERCEL_BRANCH_URL = "branch.vercel.app";
    process.env.VERCEL_URL = "deploy.vercel.app";
    expect(trustedAppOrigin()).toBe("https://branch.vercel.app");
  });

  it("falls back to VERCEL_URL when branch URL is absent", () => {
    process.env.VERCEL_URL = "poshisu-abc123-team.vercel.app";
    expect(trustedAppOrigin()).toBe("https://poshisu-abc123-team.vercel.app");
  });

  it("throws when no origin source is available", () => {
    expect(() => trustedAppOrigin()).toThrow(/trusted app origin/i);
  });

  it("treats an empty string as unset", () => {
    process.env.NEXT_PUBLIC_APP_URL = "";
    process.env.VERCEL_URL = "deploy.vercel.app";
    expect(trustedAppOrigin()).toBe("https://deploy.vercel.app");
  });
});
