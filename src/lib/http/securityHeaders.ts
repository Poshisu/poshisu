/**
 * HTTP security headers applied to every response by `next.config.ts`.
 *
 * What's included and why:
 *
 *   Strict-Transport-Security — force HTTPS for two years including
 *     subdomains, and preload-eligible. Prevents protocol-downgrade MITM.
 *   X-Content-Type-Options: nosniff — disables MIME-sniffing so a served
 *     .json file can't be treated as script.
 *   X-Frame-Options: DENY — legacy clickjacking protection. Modern
 *     browsers honour `frame-ancestors` from CSP but we don't have a
 *     CSP yet, and older browsers still use this header.
 *   Referrer-Policy: strict-origin-when-cross-origin — sends full URL
 *     to same-origin, just origin to cross-origin, and nothing on HTTPS→HTTP
 *     downgrades. Matches the browser default but pinning it avoids drift.
 *   Cross-Origin-Opener-Policy: same-origin — isolates the browsing
 *     context so `window.opener` can't reach into a popup from another
 *     origin. Required for SharedArrayBuffer; harmless otherwise.
 *   Permissions-Policy — explicit allow-list. We pre-allow the two
 *     features the product actually needs (camera for meal photos,
 *     microphone for voice input) and disable everything else.
 *
 * What's NOT included and why:
 *
 *   Content-Security-Policy — a proper CSP for a Next.js App Router app
 *     needs per-request nonces generated in middleware, because Next
 *     injects inline hydration scripts. Doing it right is a Phase 1
 *     follow-up; see docs/DEPLOYMENT.md "CSP follow-up".
 *
 * Tested by src/lib/http/securityHeaders.test.ts.
 */

/**
 * Features we explicitly permit. Everything not listed here is denied.
 * Keep the allow-list tight — every entry is a permission the browser
 * will grant our origin without re-prompting.
 */
const PERMITTED_FEATURES: Record<string, string> = {
  // Pre-approved for Phase 2 meal-photo capture.
  camera: "(self)",
  // Pre-approved for Phase 2 voice input (ElevenLabs Scribe).
  microphone: "(self)",
};

/**
 * Features we actively deny. Anything not in this list AND not in
 * PERMITTED_FEATURES is implicitly denied by the empty allow-list for
 * the feature name. Listing them explicitly makes the policy auditable.
 */
const DENIED_FEATURES = [
  "accelerometer",
  "autoplay",
  "browsing-topics",
  "display-capture",
  "encrypted-media",
  "fullscreen",
  "geolocation",
  "gyroscope",
  "hid",
  "identity-credentials-get",
  "idle-detection",
  "local-fonts",
  "magnetometer",
  "midi",
  "payment",
  "picture-in-picture",
  "publickey-credentials-create",
  "publickey-credentials-get",
  "screen-wake-lock",
  "serial",
  "storage-access",
  "usb",
  "web-share",
  "xr-spatial-tracking",
] as const;

function buildPermissionsPolicy(): string {
  const entries: string[] = [];
  for (const [feature, allowList] of Object.entries(PERMITTED_FEATURES)) {
    entries.push(`${feature}=${allowList}`);
  }
  for (const feature of DENIED_FEATURES) {
    entries.push(`${feature}=()`);
  }
  return entries.join(", ");
}

export const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Permissions-Policy",
    value: buildPermissionsPolicy(),
  },
] as const;
