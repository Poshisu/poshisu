import * as Sentry from "@sentry/nextjs";

/**
 * Client-side Sentry init. Runs in the browser.
 *
 * Guard on DSN so local dev and preview PRs without the secret remain quiet.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? 0.1 : 1.0,
    // No replay for now — opt-in once we've wired consent and considered DPDP.
    integrations: [],
    sendDefaultPii: false,
  });
}

/**
 * Required by Sentry to trace client-side navigations.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
