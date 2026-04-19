# Skill: Nourish Memory Schema (v2: Two-Tier)

> Load this skill when working on memory-related code. The memory system has two tiers: **structured data** in Postgres tables (zero token cost, always available) and **compact text** in the memories table (budget-capped at 800 tokens per agent call).

---

## Tier 1: Structured data (no LLM tokens)

These tables are queried directly by code — never loaded into agent prompts:

| Table | Purpose | Updated by |
|---|---|---|
| `user_profiles` | Stable profile: age, weight, conditions, allergies, goals | Onboarding, user edits |
| `user_features` | Behavioral features: meal times, oil preference, portion bias, streaks, averages | Memory consolidator (SQL) |
| `correction_log` | Correction history: what the user changed and when | Orchestrator |
| `cooking_multipliers` | Cooking method → calorie/fat multipliers | Seed data |
| `source_multipliers` | Home/restaurant/street → calorie/fat/sodium multipliers | Seed data |

The memory consolidator's primary job is updating `user_features` via SQL — not growing markdown files.

## Tier 2: Compact text (budget-capped)

The `memories` table stores text layers. Agent context is capped at **800 tokens total** and loaded selectively by intent.

## The memories table

```sql
memories (
  id         uuid PK,
  user_id    uuid FK → auth.users,
  layer      text CHECK (profile|patterns|context|semantic|daily|weekly|monthly),
  key        text,                   -- 'main' for singletons, date-based for temporal
  content    text,                   -- markdown or JSON string
  version    int DEFAULT 1,          -- auto-incremented by audit trigger
  expires_at timestamptz NULL,       -- only for 'context' layer
  created_at timestamptz,
  updated_at timestamptz,
  UNIQUE (user_id, layer, key)
)
```

Every update is captured in `memories_history` by the audit trigger before the row changes.

## Layer reference

### `profile` (layer='profile', key='main')

**What:** The user's stable attributes generated from onboarding and updated rarely.
**Format:** Markdown following the canonical format in `ONBOARDING_PARSER.md`.
**Updated by:** Onboarding flow, user edits in the profile page.
**Read by:** Every agent on every interaction.
**Size:** ~500-800 tokens.

**Rules:**
- Only the user or the onboarding flow can modify this.
- The Memory Consolidator NEVER modifies profile.md.
- Changes are rare — a user might update their weight, add a condition, or change a goal.

### `patterns` (layer='patterns', key='main')

**What:** Observed behavioral patterns extracted by the Memory Consolidator.
**Format:** Markdown with sections (Typical meals, Beverages, Cooking context, Portions, Goal tracking, Detected behaviors).
**Updated by:** Memory Consolidator (daily background job).
**Read by:** Nutrition Estimator, Coach, Nudge Generator.
**Size:** ~300-1000 tokens, grows over weeks.

**Rules:**
- Needs at least 2 observations to establish a pattern.
- Older patterns can be summarized if the file grows beyond ~1000 words.
- User can edit or delete individual lines via the memory inspector.
- Date everything: "Started having oats for breakfast (observed 2026-04-18)."

### `context` (layer='context', key='main')

**What:** Temporary state — travel, special diet phase, holiday mode.
**Format:** Short markdown, 1-3 lines.
**Updated by:** User declares it in conversation, or Memory Consolidator detects it.
**Read by:** Every agent on every interaction.
**Size:** 0-100 tokens (often empty).

**Rules:**
- Has an optional `expires_at`. A cron job clears expired contexts hourly.
- Only one active context at a time (latest overwrites).
- User can clear it manually via the profile page.

### `semantic` (layer='semantic', key='main')

**What:** Per-user vocabulary dictionary mapping their personal terms to canonical descriptions.
**Format:** JSON string: `{ "term": "expansion", ... }`
**Updated by:** Nutrition Estimator (when a clarifying Q&A reveals new vocabulary), Memory Consolidator.
**Read by:** Nutrition Estimator (before every meal estimation).
**Size:** Grows slowly, ~100-500 tokens after a month.

**Rules:**
- Terms are normalized to lowercase.
- Expansions include nutritional context where possible: `"my green smoothie" → "spinach, banana, peanut butter, almond milk (~280 kcal)"`.
- Duplicates are overwritten (last definition wins).

### `daily` (layer='daily', key='YYYY-MM-DD')

**What:** Everything that happened today — every meal, water log, conversation snippet.
**Format:** Markdown with timestamped entries.
**Updated by:** Orchestrator appends after each interaction.
**Read by:** Memory Consolidator (yesterday's log), Coach (for recent questions), Today view.
**Size:** ~500-2000 tokens per day.

**Rules:**
- Append-only during the day.
- The orchestrator appends a new entry after each meal log or significant interaction.
- Not the raw chat history — a curated summary of what happened.
- Old daily logs (>90 days) can be archived or summarized.

**Format example:**
```markdown
# 2026-04-15

## Meals
- 08:30 — Breakfast: poha with curd, 1 cup chai with sugar (~380 kcal, P:8g C:55g F:10g)
- 13:15 — Lunch: rajma chawal with salad (~620 kcal, P:18g C:100g F:10g)
- 17:00 — Snack: apple (~80 kcal)
- 20:30 — Dinner: 2 rotis + palak paneer + curd (~540 kcal, P:22g C:55g F:25g)

## Water
- Total: 2000ml (8 glasses)

## Notes
- User mentioned starting gym from next week.
- Corrected lunch portion: "more like 2 cups of rice."
- New vocabulary: "my usual chai" = "tea with full-fat milk and 1 tsp sugar"

## Totals
- Calories: ~1620 kcal (target: 1800)
- Protein: ~48g (target: 90g) — ⚠️ low
- Fiber: ~18g (target: 30g) — low
```

### `weekly` (layer='weekly', key='YYYY-Www')

**What:** Weekly aggregate summary with insights, generated by the weekly-summary Edge Function.
**Format:** Markdown with stats and insight cards.
**Updated by:** Weekly summary cron (Sunday 22:00 IST).
**Read by:** Coach (for trends questions), Trends view.
**Size:** ~500-1000 tokens.

### `monthly` (layer='monthly', key='YYYY-MM')

**What:** Monthly aggregate, same structure as weekly but over 30 days.
**Updated by:** Monthly summary cron (1st of month).
**Read by:** Coach, Trends view.

## Loading memory for agents

The standard loading function:

```ts
async function loadMemoryContext(
  userId: string,
  options: {
    layers: MemoryLayer[];   // which layers to include
    recentDailies?: number;  // how many recent daily logs (default 0)
    weeklyKeys?: string[];   // specific weekly summaries
    monthlyKeys?: string[];  // specific monthly summaries
  }
): Promise<string> {
  // 1. Fetch the requested layers from the memories table
  // 2. Compose them into a single markdown string
  // 3. Return the composed context
}
```

The composed output looks like:

```markdown
## User Profile
{profile.md content}

## Observed Patterns
{patterns.md content}

## Current Context
{context.md content or "No active context."}

## Semantic Dictionary
{semantic entries formatted as a readable list}

## Recent Activity (last 3 days)
{daily logs, summarized}
```

This composed string goes into the system prompt as a non-cached content block (it changes per user).

## Writing to memory

### Appending to daily log

```ts
async function appendToDailyLog(userId: string, entry: string): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: existing } = await supabase
    .from('memories')
    .select('content')
    .eq('user_id', userId)
    .eq('layer', 'daily')
    .eq('key', today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('memories')
      .update({ content: existing.content + '\n' + entry })
      .eq('user_id', userId)
      .eq('layer', 'daily')
      .eq('key', today);
  } else {
    await supabase
      .from('memories')
      .insert({
        user_id: userId,
        layer: 'daily',
        key: today,
        content: `# ${today}\n\n${entry}`,
      });
  }
}
```

### Upserting a layer

```ts
async function upsertMemory(
  userId: string,
  layer: MemoryLayer,
  key: string,
  content: string,
  changedBy: string = 'system',
): Promise<void> {
  // Set the changed_by for the audit trigger
  await supabase.rpc('set_config', { key: 'app.changed_by', value: changedBy });

  await supabase
    .from('memories')
    .upsert(
      { user_id: userId, layer, key, content },
      { onConflict: 'user_id,layer,key' },
    );
}
```

## Data retention

| Layer | Retention | Archive strategy |
|---|---|---|
| profile | Forever | Versioned in history |
| patterns | Forever (but summarized) | Trim to ~1000 words if it grows |
| context | Until expired or cleared | Auto-deleted by cron |
| semantic | Forever | Prune if >200 entries |
| daily | 90 days active | After 90 days, delete (weekly/monthly still have the aggregates) |
| weekly | 1 year | Archive to cold storage after 1 year |
| monthly | Forever | Small, keep all |

## Testing memory

Key test scenarios:
1. **First-day scaffold:** Onboarding creates profile + empty patterns. Daily log is created on first meal.
2. **Consolidation:** After day 3, patterns should have at least meal timing observations.
3. **Semantic growth:** After a clarifying Q&A, the semantic dictionary should have the new entry.
4. **Context lifecycle:** Set → read → expire → gone.
5. **History audit:** Update patterns → old version in memories_history.
6. **User edit:** User edits a pattern line → version incremented, history captured with `changed_by: 'user'`.
7. **Concurrent writes:** Two meal logs in quick succession both append to the daily log (no lost writes).
