/**
 * Returns true when we're allowed to surface raw provider error codes /
 * messages back to the browser. False in production — never leak provider
 * internals where real users can see them.
 *
 * Vercel injects `VERCEL_ENV` as one of "production" | "preview" |
 * "development". When the var is absent (e.g. local `next dev`), we treat
 * NODE_ENV as the source of truth and only suppress for production.
 */
export function isDebugSurfaceAllowed(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv) return vercelEnv !== "production";
  return process.env.NODE_ENV !== "production";
}
