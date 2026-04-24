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
  signup_email_in_use:
    "If an account exists for this email, please sign in instead.",
  signup_weak_password: "Password is too weak. Try something longer or mix in numbers and symbols.",
  signup_invalid_email: "That email doesn't look right. Please check and try again.",
  signup_rate_limited: "Too many attempts. Please wait a minute and try again.",
  signup_disabled: "Sign-up is temporarily unavailable. Please try again shortly.",
  signup_email_not_authorized:
    "This email isn't allowed to sign up right now. If you're testing, add it to the Supabase allow-list.",
  signup_redirect_not_allowed:
    "The sign-up confirmation link points to a URL that isn't allowed. Add it in Supabase → Authentication → URL Configuration.",
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
