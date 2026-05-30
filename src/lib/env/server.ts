const envAssignmentPattern = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([\s\S]*)$/;

/**
 * Reads a server-side env var and tolerates the common Vercel mistake where the
 * value field is pasted as `NAME=value` instead of only `value`.
 *
 * This intentionally strips only assignments whose left-hand side matches the
 * requested env var name, so arbitrary secret values containing `=` are not
 * modified.
 */
export function readServerEnv(name: string) {
  const raw = process.env[name];
  if (typeof raw !== "string") return undefined;

  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const assignment = envAssignmentPattern.exec(trimmed);
  if (assignment?.[1]?.toUpperCase() === name.toUpperCase()) {
    return assignment[2]?.trim() || undefined;
  }

  return trimmed;
}
