import type { AuthErrorCode } from "../errors";

/**
 * Map Supabase auth error codes to our opaque `AuthErrorCode` enum.
 *
 * We translate only codes that are safe to show the user (wrong password
 * strength, invalid email format, rate limits, misconfigured signup).
 * Anything that could reveal account existence ("user_already_exists",
 * "email_exists") falls through to the generic `signup_failed`.
 *
 * Extracted from `signup/actions.ts` so it can be unit tested without
 * pulling in the "use server" boundary.
 */
export function mapSignupError(code: string | undefined): AuthErrorCode {
  switch (code) {
    case "weak_password":
      return "signup_weak_password";
    case "email_address_invalid":
    case "validation_failed":
      return "signup_invalid_email";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
    case "email_send_rate_limit":
      return "signup_rate_limited";
    case "signup_disabled":
    case "email_provider_disabled":
      return "signup_disabled";
    case "email_address_not_authorized":
      return "signup_email_not_authorized";
    case "validation_failed_redirect_to":
    case "invalid_redirect_url":
      return "signup_redirect_not_allowed";
    default:
      return "signup_failed";
  }
}
