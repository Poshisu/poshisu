/**
 * Return the Sentry DSN only if the env var holds a plausible real value.
 *
 * Real DSNs have the shape `https://<public-key>@<org>.ingest.sentry.io/<project>`,
 * so we require `https://` as a minimal, unambiguous sanity check. That
 * rejects common placeholders like `TODO_SENTRY_DSN` or empty strings that
 * would otherwise trip Sentry's own `Invalid Sentry Dsn` warning at boot.
 */
export function resolveSentryDsn(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!raw) return undefined;
  if (!raw.startsWith("https://")) return undefined;
  return raw;
}
