import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS } from "./securityHeaders";

function find(key: string): { key: string; value: string } | undefined {
  return SECURITY_HEADERS.find((h) => h.key === key);
}

describe("SECURITY_HEADERS", () => {
  it("includes HSTS with two-year max-age, subdomains, and preload", () => {
    const h = find("Strict-Transport-Security");
    expect(h?.value).toContain("max-age=63072000");
    expect(h?.value).toContain("includeSubDomains");
    expect(h?.value).toContain("preload");
  });

  it("disables MIME sniffing", () => {
    expect(find("X-Content-Type-Options")?.value).toBe("nosniff");
  });

  it("denies framing", () => {
    expect(find("X-Frame-Options")?.value).toBe("DENY");
  });

  it("sets a conservative referrer policy", () => {
    expect(find("Referrer-Policy")?.value).toBe("strict-origin-when-cross-origin");
  });

  it("isolates the browsing context with COOP", () => {
    expect(find("Cross-Origin-Opener-Policy")?.value).toBe("same-origin");
  });

  describe("Permissions-Policy", () => {
    const policy = find("Permissions-Policy")?.value ?? "";

    it("permits camera and microphone from self", () => {
      expect(policy).toContain("camera=(self)");
      expect(policy).toContain("microphone=(self)");
    });

    it("denies geolocation, payment, usb, and other privacy-sensitive features", () => {
      expect(policy).toContain("geolocation=()");
      expect(policy).toContain("payment=()");
      expect(policy).toContain("usb=()");
      expect(policy).toContain("midi=()");
      expect(policy).toContain("serial=()");
    });

    it("denies interest-group advertising features", () => {
      expect(policy).toContain("browsing-topics=()");
    });

    it("has no duplicate feature entries", () => {
      const features = policy.split(",").map((entry) => entry.trim().split("=")[0]);
      const unique = new Set(features);
      expect(unique.size).toBe(features.length);
    });
  });

  it("exposes exactly the six expected header keys", () => {
    const keys = SECURITY_HEADERS.map((h) => h.key).sort();
    expect(keys).toEqual(
      [
        "Cross-Origin-Opener-Policy",
        "Permissions-Policy",
        "Referrer-Policy",
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
      ].sort(),
    );
  });
});
