import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveSentryDsn } from "./sentryDsn";

describe("resolveSentryDsn", () => {
  const original = process.env.NEXT_PUBLIC_SENTRY_DSN;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    else process.env.NEXT_PUBLIC_SENTRY_DSN = original;
  });

  it("returns undefined when the var is unset", () => {
    expect(resolveSentryDsn()).toBeUndefined();
  });

  it("returns undefined for the empty string", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "";
    expect(resolveSentryDsn()).toBeUndefined();
  });

  it("rejects common placeholders like TODO_SENTRY_DSN", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "TODO_SENTRY_DSN";
    expect(resolveSentryDsn()).toBeUndefined();
  });

  it("rejects non-https schemes", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "http://public@sentry.io/1";
    expect(resolveSentryDsn()).toBeUndefined();
  });

  it("returns the DSN when it looks like a real https URL", () => {
    const real = "https://abc123@o12345.ingest.sentry.io/67890";
    process.env.NEXT_PUBLIC_SENTRY_DSN = real;
    expect(resolveSentryDsn()).toBe(real);
  });
});
