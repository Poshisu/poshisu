import * as Sentry from "@sentry/nextjs";
import { resolveSentryDsn } from "@/lib/env/sentryDsn";

/**
 * Client-side Sentry init. Runs in the browser.
 *
 * Guard on DSN shape (https:// prefix) so placeholders like
 * `TODO_SENTRY_DSN` don't trigger Sentry's "Invalid Sentry Dsn" warning.
 */
const dsn = resolveSentryDsn();
if (dsn) {
  Sentry.init({
    dsn,
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
