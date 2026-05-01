# Nourish — System Architecture

## High-level diagram

```
                     ┌─────────────────────────────────────┐
                     │            User (Browser)            │
                     │   PWA: Chat / Today / Trends / Me   │
                     └──────────────┬──────────────────────┘
                                    │ HTTPS
                                    ▼
                     ┌─────────────────────────────────────┐
                     │       Next.js 15 (Vercel Edge)       │
                     │  Server Components + Route Handlers  │
                     │  - /api/chat       (planned orchestrator)    │
                     │  - /api/meals      (planned CRUD)            │
                     │  - /api/memory     (planned read/edit)       │
                     │  - /api/push       (planned subscribe)       │
                     └──┬───────────────┬─────────────┬─────┘
                        │               │             │
                        ▼               ▼             ▼
              ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
              │  Anthropic   │  │  Supabase   │  │  ElevenLabs  │
              │  Claude API  │  │  Postgres   │  │  Scribe v2   │
              │              │  │  + Auth     │  │              │
              │  - Sonnet 4.6│  │  + Storage  │  │              │
              │  - Haiku 4.5 │  │  + RLS      │  │              │
              │  - Opus 4.6  │  │             │  │              │
              └──────────────┘  └──────┬──────┘  └──────────────┘
                                       │
                          ┌────────────┼────────────┐
                          ▼            ▼            ▼
              ┌──────────────────┐ ┌──────────┐ ┌──────────────┐
              │  Edge Functions  │ │ pg_cron  │ │   Storage    │
              │  - nudge         │ │ schedule │ │  meal photos │
              │  - consolidator  │ │          │ │              │
              │  - summary       │ │          │ │              │
              └──────────────────┘ └──────────┘ └──────────────┘
                          │
                          ▼
              ┌──────────────────┐
              │   Web Push (VAPID)│
              │   → User devices │
              └──────────────────┘
```

## Route implementation status

| Planned Route | Implemented? | File Path | Notes |
|---|---|---|---|
| `/api/chat` | No (planned) | _Not implemented yet_ | Planned orchestrator route for chat and meal logging flows. |
| `/api/meals` | No (planned) | _Not implemented yet_ | Planned meals CRUD route. |
| `/api/memory` | No (planned) | _Not implemented yet_ | Planned memory read/edit route. |
| `/api/push` | No (planned) | _Not implemented yet_ | Planned push subscription route. |
| `/(auth)/callback` | Yes | `src/app/(auth)/callback/route.ts` | Implemented auth callback route handler. |

## Request flow: user logs a meal

```
User: [photo of thali]
  │
  ▼
PWA chat component
  │ - Optimistically shows "Got it, analyzing…"
  │ - Uploads photo to Supabase Storage
  │ - (Planned) POST /api/chat { type: "meal_photo", photo_url, user_msg }
  ▼
/api/chat route (planned, Next.js Server)
  │ - Auth check (Supabase session cookie)
  │ - Load minimal user context (id, profile_summary)
  │ - Call orchestrator.handleMessage(msg)
  ▼
Orchestrator (src/lib/agents/orchestrator.ts)
  │ 1. Call Router agent (Haiku)
  │      → returns { intent: "log_meal", confidence: 0.97 }
  │ 2. Load compact memory context for user
  │      → profile summary from user_profiles + user_features tables
  │      → semantic dictionary (budget-capped)
  │      → current context if active
  │ 3. STAGE 1: Call Nutrition Estimator agent (Sonnet, vision)
  │      → returns { items with portions + cooking method + source }
  │      → identification only, NO calorie numbers
  │ 4. If confidence < 0.5 OR clarifying_q present:
  │      → return question to user, do NOT proceed
  │ 5. STAGE 2: Code lookup — fuzzy match items against ifct_foods table
  │ 6. STAGE 3: Code adjustment — apply cooking_multipliers ×
  │      source_multipliers × user portion_bias from user_features
  │      → compute calorie, macro, and micronutrient ranges
  │ 7. STAGE 4: Code micronutrient flagging — check B12, calcium,
  │      vitamin D, potassium, omega-3 vs daily targets
  │ 8. STAGE 5: Code safety check — allergens + conditions
  │ 9. STAGE 6: Call Haiku for warm user-facing message
  │ 10. Save meal to DB, log trace to agent_traces
  ▼
PWA chat component
  │ - Replaces "analyzing…" with confirmation card
  │ - Card has: dish name(s), ranges, edit/correct buttons
  │ - Updates Today view via realtime subscription
```

## Memory architecture (two-tier)

The memory system has two tiers: **structured data** (always available, zero tokens) and **compact text** (variable, budget-capped). This avoids the prompt-bloat problem of loading ever-growing markdown into every agent call.

### Tier 1: Structured data (Postgres, zero context tokens)

| Table | What | Updated by |
|---|---|---|
| `user_profiles` | Stable attributes: age, weight, conditions, allergies, goals, dietary pattern | Onboarding, user edits |
| `user_features` | Behavioral features: typical meal times, oil preference, portion bias, streak, daily averages | Memory consolidator (SQL updates) |
| `correction_log` | History of user corrections to estimates | Orchestrator on correction |
| `cooking_multipliers` | Deterministic cooking method → calorie multipliers | Admin / seed data |
| `source_multipliers` | Restaurant vs home → calorie multipliers | Admin / seed data |

The code pipeline reads these tables directly — no LLM involved, no tokens spent.

### Tier 2: Compact text (memories table, budget-capped)

| Layer | Key pattern | Max size | Loaded when |
|---|---|---|---|
| `profile` | `main` | ~500 tokens | Memory inspector only (structured data used for agents) |
| `patterns` | `main` | ~400 tokens (compact summary, not full history) | Recommendations, coaching |
| `context` | `main` | ~100 tokens (or empty) | Every interaction |
| `semantic` | `main` | ~300 tokens (JSON dictionary) | Meal logging |
| `daily` | `YYYY-MM-DD` | ~500 tokens per day | Consolidator input, today view |
| `weekly` | `YYYY-Www` | ~400 tokens | Trends, coaching |
| `monthly` | `YYYY-MM` | ~400 tokens | Trends, coaching |

The memory loader enforces a **hard budget of 800 tokens** for the text context injected into any agent call. It selects only the layers relevant to the current intent:

```ts
loadMemoryContext(userId, {
  intent: 'log_meal',     // → loads semantic + context only (~400 tokens)
  intent: 'recommend',    // → loads patterns + context + today summary (~600 tokens)
  intent: 'insights',     // → loads patterns + weekly/monthly (~700 tokens)
})
```

### Storage

The `memories` table stores the text layers:

```sql
create table memories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  layer        text not null check (layer in ('profile','patterns','context','semantic','daily','weekly','monthly')),
  key          text not null,           -- e.g. '2026-04-15' for daily, 'main' for profile
  content      text not null,           -- the markdown body
  version      int not null default 1,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (user_id, layer, key)
);
```

Versioning is handled by an audit trigger that copies old versions to `memories_history` before update.

### Loading strategy

The orchestrator builds the agent's context using a selector:

```ts
const ctx = await loadMemoryContext(userId, {
  layers: ['profile', 'patterns', 'context', 'semantic'],
  recentDailies: 3,
});
```

This returns a single composed markdown blob, ~2-4k tokens, that goes into the system prompt for the specialist agent. It is **cached** with `cache_control: { type: 'ephemeral' }` so subsequent requests within the cache TTL pay the 90% discount.

For long-range questions ("how was last month?"), the Coach agent additionally loads the relevant `weekly/` and `monthly/` rows.

## Agent topology

Hub-and-spoke with a Router orchestrator. See `prompts/agents/` for the full system prompts.

```
                       ┌─────────────┐
                       │   Router    │  Haiku
                       │ (Intent +   │
                       │  Routing)   │
                       └──────┬──────┘
                              │
        ┌─────────────┬───────┼───────┬─────────────┐
        ▼             ▼       ▼       ▼             ▼
 ┌────────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌────────────┐
 │  Nutrition │ │  Coach & │ │ Onboard│ │ General  │ │   Memory   │
 │  Estimator │ │ Insights │ │ Parser │ │   Chat   │ │   Updater  │
 │   (Sonnet, │ │ (Sonnet) │ │ (Haiku)│ │ (Haiku)  │ │   (Haiku)  │
 │   vision)  │ │          │ │        │ │          │ │            │
 └────────────┘ └──────────┘ └────────┘ └──────────┘ └────────────┘
```

**Background agents (not user-triggered):**

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ Memory Consolidator │    │  Nudge Dispatcher   │    │   Weekly Summary    │
│  Daily 02:00 IST    │    │  Every 15 min       │    │  Sunday 22:00 IST   │
│  (Sonnet)           │    │  (Haiku)            │    │  (Sonnet/Opus)      │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Data flow: nudges

```
pg_cron every 15 min
  ↓
Edge Function: nudge-dispatcher
  ↓
For each user with nudges_enabled:
  - Load profile + patterns + today's logging state
  - Check quiet hours, frequency caps
  - Apply policy rules → decide if a nudge is due
  - If due: call Nudge Generator (Haiku) → message text
  - Insert into nudge_queue table
  - Send Web Push to user's devices
  - On user response: insert chat message, mark nudge ack'd
```

## Security model

- **Auth:** Supabase Auth with cookie-based SSR sessions. Middleware (`src/lib/supabase/middleware.ts`) refreshes tokens on every request.
- **RLS:** Every user-scoped table has policies like `auth.uid() = user_id`. Service role key is **never** exposed to the client.
- **Server-only secrets:** Anthropic key, ElevenLabs key, VAPID private key, Supabase service role — all in server environment, never bundled.
- **Input validation:** Zod schemas at every API boundary.
- **Rate limiting:** Plan is per-user limits on `/api/chat` (60/hour), `/api/meals` (120/hour), backed by Supabase and a `rate_limits` table when these routes are implemented.
- **CSP headers:** Set in `next.config.ts`. No inline scripts in production.
- **Audit log:** `agent_traces` records every LLM call with user_id, intent, model, tokens used, latency, and a redacted request/response.

## Observability

- **Sentry** for errors and performance traces. Source maps uploaded via `@sentry/nextjs` plugin during build.
- **PostHog** for product analytics. Key events: `signup`, `onboarding_complete`, `meal_logged`, `nudge_received`, `nudge_responded`, `recommendation_requested`.
- **`agent_traces` table** for LLM-specific observability — token counts, latencies, costs, prompt versions.
- **Supabase Logs** for database queries.
