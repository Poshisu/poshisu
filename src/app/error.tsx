"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary. Catches render/server-action errors that bubble
 * up to any route segment under `app/`.
 *
 * In non-production builds we surface the real message + digest so debugging
 * preview deploys doesn't require rooting around in Vercel Runtime Logs.
 * In production we hide the message (may contain internals) but keep the
 * digest so support can correlate with a Sentry event.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Always log to the server logs via console — Vercel Runtime Logs will
    // pick this up regardless of whether Sentry is configured.
    console.error("[route-error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  const showDetails = process.env.NODE_ENV !== "production";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-svh items-center justify-center p-6 focus-visible:outline-none"
    >
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground">
          {showDetails
            ? "You're on a preview or dev build, so the raw error is shown below."
            : "We've logged the issue. Please try again in a moment."}
        </p>

        {showDetails ? (
          <pre
            role="status"
            className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-left text-xs"
          >
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : null}
          </pre>
        ) : error.digest ? (
          <p className="text-xs text-muted-foreground">
            Reference: <code className="font-mono">{error.digest}</code>
          </p>
        ) : null}

        <div className="flex justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
