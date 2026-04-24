/**
 * Resolve the canonical origin for building auth redirect URLs (OAuth
 * `redirectTo`, email-confirmation `emailRedirectTo`, post-callback redirects).
 *
 * Priority:
 *   1. `NEXT_PUBLIC_APP_URL` — explicit override. Set this in production so
 *      emails and OAuth redirects always land on the canonical domain.
 *   2. `VERCEL_BRANCH_URL` — stable alias per branch. Preferred on previews
 *      because it survives redeploys of the same branch.
 *   3. `VERCEL_URL` — per-deployment URL, last-resort fallback on any Vercel
 *      deploy that didn't surface `VERCEL_BRANCH_URL`.
 *
 * We never derive the origin from the incoming `Origin` / `Host` header —
 * a malicious client can set those to arbitrary hosts, which would cause
 * confirmation / OAuth emails to link to attacker infrastructure.
 *
 * For auth flows to actually succeed end-to-end, whatever URL this returns
 * must also be in the Supabase project's "Redirect URLs" allow-list. On
 * previews that means adding the branch URL (or a wildcard) in Supabase.
 */
export function trustedAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelHost = process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;

  throw new Error(
    "Cannot resolve trusted app origin — set NEXT_PUBLIC_APP_URL or deploy on Vercel.",
  );
}
