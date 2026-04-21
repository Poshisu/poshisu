/**
 * Auth error token → user-facing message map.
 *
 * The `?error=` query param that our Server Actions write when something fails
 * MUST be one of these opaque codes. The page looks up the display string from
 * this map and renders a fixed, server-controlled message. This prevents an
 * attacker from crafting a URL with arbitrary text (e.g. a phishing prompt
 * such as "Your session expired. Sign in at https://evil.example") and tricking
 * a victim who clicks the link into trusting attacker-supplied copy.
 */

export const AUTH_ERROR_CODES = {
  invalid_input: "Please check the email and password fields.",
  invalid_credentials: "Invalid email or password.",
  signup_failed: "Could not create account. Please try again.",
  oauth_start_failed: "Could not start Google sign-in. Please try again.",
  oauth_callback_invalid: "Sign-in link is invalid or has expired.",
  oauth_callback_failed: "Sign-in failed. Please try again.",
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERROR_CODES;

export function isAuthErrorCode(value: string | undefined | null): value is AuthErrorCode {
  return typeof value === "string" && value in AUTH_ERROR_CODES;
}

export function authErrorMessage(value: string | undefined | null): string | null {
  return isAuthErrorCode(value) ? AUTH_ERROR_CODES[value] : null;
}
