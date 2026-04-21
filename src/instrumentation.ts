import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook — runs once per server process at startup.
 * We use it to initialise Sentry for the Node.js and Edge runtimes.
 *
 * Sentry only initialises when `NEXT_PUBLIC_SENTRY_DSN` is set. Local dev and
 * PRs that lack the secret are untouched — no network calls, no crashes.
 */
export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
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
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
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
