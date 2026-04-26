/**
 * PII redaction for `agent_traces` request / response payloads.
 *
 * Goal: keep traces useful for debugging agent behaviour (intents, model
 * outputs, tool calls, structured fields like conditions/allergies) while
 * stripping fields that identify the user as a person.
 *
 * Redacted (replaced with "[redacted]"):
 *   - `name`, `first_name`, `last_name`
 *   - `email`
 *   - `phone`, `phone_number`
 *   - `medications`, `medication`, `medications_affecting_diet`
 *   - `address`, `street`, `postal_code`, `pincode`, `zip`
 *   - any string field whose key contains "ssn" or "passport"
 *
 * Kept (intentionally — needed for debugging clinical and product logic):
 *   - `age`, `gender`, `height_cm`, `weight_kg`
 *   - `conditions`, `allergies`, `dietary_pattern`, `dislikes`
 *   - `city`, `meal_times`, `eating_context`, `estimation_preference`
 *   - meal items, calories, macros, model outputs
 *
 * Profile markdown special case: agents sometimes echo back a generated
 * `profile.md` that starts with `# Profile for Aarti`. We rewrite that
 * leading line to `# Profile for [redacted]` so the name doesn't slip in
 * through markdown.
 */

const REDACTED = "[redacted]";

const PII_KEY_EXACT = new Set<string>([
  "name",
  "first_name",
  "last_name",
  "fullName",
  "email",
  "emailAddress",
  "phone",
  "phone_number",
  "phoneNumber",
  "medications",
  "medication",
  "medications_affecting_diet",
  "address",
  "street",
  "postal_code",
  "pincode",
  "zip",
]);

function isPiiKey(key: string): boolean {
  if (PII_KEY_EXACT.has(key)) return true;
  const lower = key.toLowerCase();
  if (lower.includes("ssn")) return true;
  if (lower.includes("passport")) return true;
  return false;
}

function redactString(value: string): string {
  // Rewrite `# Profile for <Name>` to `# Profile for [redacted]` (markdown leak).
  return value.replace(/^(#\s*Profile for\s+)([^\n]+)/m, `$1${REDACTED}`);
}

/**
 * Recursively walk an unknown JSON-like value and redact PII.
 *
 * Returns a new structure — never mutates the input. Functions, symbols,
 * and other non-JSON values are returned as-is (they shouldn't appear in
 * trace payloads but we don't crash if they do).
 */
export function redactPii(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((v) => redactPii(v));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isPiiKey(k)) {
        out[k] = REDACTED;
      } else {
        out[k] = redactPii(v);
      }
    }
    return out;
  }
  return value;
}
