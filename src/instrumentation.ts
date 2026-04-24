import * as Sentry from "@sentry/nextjs";
import { resolveSentryDsn } from "@/lib/env/sentryDsn";

/**
 * Next.js instrumentation hook — runs once per server process at startup.
 * We use it to initialise Sentry for the Node.js and Edge runtimes.
 *
 * Sentry only initialises when `NEXT_PUBLIC_SENTRY_DSN` holds a plausible
 * DSN (https:// URL). Local dev and PRs that lack the secret — or have a
 * placeholder like `TODO_SENTRY_DSN` — are untouched.
 */
export async function register() {
  const dsn = resolveSentryDsn();
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      tracesSampleRate: process.env.VERCEL_ENV === "production" ? 0.1 : 1.0,
      // Don't send PII by default. We redact email/password at the action
      // layer before reporting; this is a belt-and-braces default.
      sendDefaultPii: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      tracesSampleRate: process.env.VERCEL_ENV === "production" ? 0.1 : 1.0,
      sendDefaultPii: false,
    });
  }
}

/**
 * Captures errors thrown during a request so we get the real stack on Vercel
 * even when Next serialises the error behind an opaque `digest`.
 */
export const onRequestError = Sentry.captureRequestError;
