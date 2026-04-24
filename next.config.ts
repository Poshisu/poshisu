import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";
import { SECURITY_HEADERS } from "./src/lib/http/securityHeaders";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        // Apply to every route. Static assets are cheap — one extra header
        // per response — and CDN caches get the headers too.
        source: "/:path*",
        headers: [...SECURITY_HEADERS],
      },
    ];
  },
};

// `withSentryConfig` is a no-op at runtime — it only wires source-map uploads
// and route instrumentation at build time. When the auth token or DSN is
// missing it degrades silently, which is what we want for PR previews that
// don't have access to the Sentry secret.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },
  // Skip wizard nagging; we've configured manually.
  telemetry: false,
});
