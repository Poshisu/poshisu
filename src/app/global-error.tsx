"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary. Catches errors in the root layout itself, which
 * `error.tsx` cannot (because error.tsx mounts inside the root layout). This
 * component replaces the entire <html> tree, so it must render its own shell.
 *
 * Intentionally minimal — we can't rely on shadcn components, Tailwind theme
 * tokens, or global CSS being available if the layout crashed before they
 * loaded. Inline styles only.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  const showDetails = process.env.NODE_ENV !== "production";

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
          background: "#fafaf9",
          color: "#1c1917",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 16px", color: "#57534e" }}>
            {showDetails
              ? "You're on a preview or dev build, so the raw error is shown below."
              : "We've logged the issue. Please try again in a moment."}
          </p>
          {showDetails ? (
            <pre
              style={{
                textAlign: "left",
                padding: 12,
                borderRadius: 6,
                background: "#f5f5f4",
                border: "1px solid #e7e5e4",
                fontSize: 12,
                whiteSpace: "pre-wrap",
                overflowX: "auto",
              }}
            >
              {error.message}
              {error.digest ? `\n\ndigest: ${error.digest}` : null}
            </pre>
          ) : error.digest ? (
            <p style={{ fontSize: 12, color: "#57534e" }}>
              Reference: <code style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>{error.digest}</code>
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              height: 40,
              padding: "0 16px",
              borderRadius: 6,
              border: "none",
              background: "#1c1917",
              color: "#fafaf9",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
