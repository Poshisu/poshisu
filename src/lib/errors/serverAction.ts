import * as Sentry from "@sentry/nextjs";

/**
 * Next.js uses thrown errors to implement `redirect()` and `notFound()`.
 * Their `digest` starts with these magic strings. We must let them propagate
 * without treating them as failures.
 *
 * Duck-typed against `digest` rather than imported from `next/dist/...`
 * because the internal path is not part of Next's public API and has moved
 * between 14 / 15 / 16.
 */
function isNextControlFlowError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const digest = (err as { digest?: unknown }).digest;
  if (typeof digest !== "string") return false;
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
}

/**
 * Wraps a Server Action so thrown errors are logged with structured context
 * before propagating.
 *
 * Why this exists:
 *   Next.js serialises Server Action errors into an opaque `digest` at the
 *   network boundary. The client only sees `{ digest: "464254539" }`, which
 *   is useless for debugging. Without this wrapper, the only way to see the
 *   real stack is to dig through Vercel Runtime Logs — assuming your plan
 *   includes them, and assuming you know exactly when the error happened.
 *
 * PII rules:
 *   `actionName` is logged verbatim. Do NOT pass raw form data, emails, or
 *   passwords. Use opaque identifiers only (action name, user_id if known).
 */
export function withServerActionLogging<TArgs extends unknown[], TReturn>(
  actionName: string,
  fn: (...args: TArgs) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (isNextControlFlowError(err)) throw err;

      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`[server-action:${actionName}]`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      Sentry.captureException(error, {
        tags: { serverAction: actionName },
      });
      throw error;
    }
  };
}
