import { describe, expect, it } from "vitest";
import { redactPii } from "./redact";

describe("redactPii", () => {
  it("redacts top-level PII keys", () => {
    expect(redactPii({ name: "Aarti", age: 34 })).toEqual({
      name: "[redacted]",
      age: 34,
    });
  });

  it("redacts nested PII keys", () => {
    expect(
      redactPii({
        user: { name: "Aarti", email: "a@x.com", age: 34 },
        meal: { items: ["roti", "dal"] },
      }),
    ).toEqual({
      user: { name: "[redacted]", email: "[redacted]", age: 34 },
      meal: { items: ["roti", "dal"] },
    });
  });

  it("keeps clinical fields visible (allergies, conditions)", () => {
    expect(
      redactPii({
        allergies: ["peanuts"],
        conditions: ["pcos", "hypertension"],
        gender: "female",
        height_cm: 162,
      }),
    ).toEqual({
      allergies: ["peanuts"],
      conditions: ["pcos", "hypertension"],
      gender: "female",
      height_cm: 162,
    });
  });

  it("redacts both camelCase and snake_case PII variants", () => {
    expect(redactPii({ phoneNumber: "+91…", phone_number: "+91…" })).toEqual({
      phoneNumber: "[redacted]",
      phone_number: "[redacted]",
    });
  });

  it("redacts keys containing 'ssn' or 'passport' anywhere", () => {
    expect(redactPii({ govId_ssn: "X", passport_number: "Y" })).toEqual({
      govId_ssn: "[redacted]",
      passport_number: "[redacted]",
    });
  });

  it("redacts the leading 'Profile for X' line in markdown strings", () => {
    const md = "# Profile for Aarti\n\n## Basics\n- **Name:** Aarti";
    const result = redactPii({ profile: md });
    expect(result).toEqual({
      profile: "# Profile for [redacted]\n\n## Basics\n- **Name:** Aarti",
    });
  });

  it("walks arrays and preserves order", () => {
    const result = redactPii([{ name: "A" }, { name: "B" }]);
    expect(result).toEqual([{ name: "[redacted]" }, { name: "[redacted]" }]);
  });

  it("does not mutate the input", () => {
    const input = { user: { name: "Aarti", age: 34 } };
    const inputCopy = JSON.parse(JSON.stringify(input));
    redactPii(input);
    expect(input).toEqual(inputCopy);
  });

  it("passes through null, undefined, primitives", () => {
    expect(redactPii(null)).toBeNull();
    expect(redactPii(undefined)).toBeUndefined();
    expect(redactPii(42)).toBe(42);
    expect(redactPii(true)).toBe(true);
    expect(redactPii("hello world")).toBe("hello world");
  });

  it("redacts medications fields (clinical PHI)", () => {
    expect(redactPii({ medications: "Metformin 500mg" })).toEqual({
      medications: "[redacted]",
    });
    expect(redactPii({ medications_affecting_diet: "Statins" })).toEqual({
      medications_affecting_diet: "[redacted]",
    });
  });
});
