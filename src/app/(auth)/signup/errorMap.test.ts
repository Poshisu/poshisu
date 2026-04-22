import { describe, expect, it } from "vitest";
import { mapSignupError } from "./errorMap";

describe("mapSignupError", () => {
  it("maps weak_password to signup_weak_password", () => {
    expect(mapSignupError("weak_password")).toBe("signup_weak_password");
  });

  it("maps email format errors to signup_invalid_email", () => {
    expect(mapSignupError("email_address_invalid")).toBe("signup_invalid_email");
    expect(mapSignupError("validation_failed")).toBe("signup_invalid_email");
  });

  it("maps all rate-limit codes to signup_rate_limited", () => {
    expect(mapSignupError("over_email_send_rate_limit")).toBe("signup_rate_limited");
    expect(mapSignupError("over_request_rate_limit")).toBe("signup_rate_limited");
    expect(mapSignupError("email_send_rate_limit")).toBe("signup_rate_limited");
  });

  it("maps disabled-signup codes to signup_disabled", () => {
    expect(mapSignupError("signup_disabled")).toBe("signup_disabled");
    expect(mapSignupError("email_provider_disabled")).toBe("signup_disabled");
  });

  it("maps allow-list errors to signup_email_not_authorized", () => {
    expect(mapSignupError("email_address_not_authorized")).toBe("signup_email_not_authorized");
  });

  it("maps redirect URL misconfiguration to signup_redirect_not_allowed", () => {
    expect(mapSignupError("validation_failed_redirect_to")).toBe("signup_redirect_not_allowed");
    expect(mapSignupError("invalid_redirect_url")).toBe("signup_redirect_not_allowed");
  });

  it("maps account-existence codes to generic signup_failed (no leak)", () => {
    expect(mapSignupError("user_already_exists")).toBe("signup_failed");
    expect(mapSignupError("email_exists")).toBe("signup_failed");
  });

  it("maps unknown / undefined codes to signup_failed", () => {
    expect(mapSignupError(undefined)).toBe("signup_failed");
    expect(mapSignupError("something_new_from_supabase")).toBe("signup_failed");
  });
});
