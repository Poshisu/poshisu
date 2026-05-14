import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("database migrations", () => {
  it("allows memory audit trigger inserts under the authenticated user's RLS context", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/0010_memories_history_insert_policy.sql"),
      "utf8",
    );

    expect(migration).toContain('create policy "memories_history_insert_own"');
    expect(migration).toContain("on public.memories_history");
    expect(migration).toContain("for insert");
    expect(migration).toContain("with check (auth.uid() = user_id)");
  });
});
