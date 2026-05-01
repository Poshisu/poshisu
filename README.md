# Nourish

**An AI-native preventive health coach for India, starting with food logging.**

Nourish is a Progressive Web App with a chat-first interface powered by a multi-agent system running on the Anthropic Claude API. The product's differentiation is interaction quality: logging a meal should feel like sending a WhatsApp message to a friend who happens to be a nutritionist who already knows everything about you.

## What's in this repository

This is a **complete project artifact set** — everything you need to build the Nourish MVP using Claude Code. It is not a codebase (yet). It is the blueprint that produces the codebase.

### Documents

| File | What it is |
|---|---|
| `CLAUDE.md` | **Start here.** The master project file for Claude Code. Stack, conventions, structure, commands. |
| `docs/PRD.md` | Product requirements: vision, personas, scope, metrics, risks. |
| `docs/ARCHITECTURE.md` | System architecture: data flow, memory layers, agent topology, security model. |
| `docs/BUILD_PLAN.md` | **The build plan.** Six phases of step-by-step Claude Code prompts. Copy-paste and go. |
| `docs/ONBOARDING_FLOW.md` | Onboarding question sequence: 6 mandatory, 8 progressive contextual. |
| `docs/INTEGRATIONS.md` | Future plans: Swiggy/Zomato scraping, WhatsApp, wearables. |
| `docs/COSTS.md` | Detailed cost model: per-interaction, per-user, at scale, with optimizations. |
| `docs/PROMPTS_GUIDE.md` | How to write, test, and iterate on agent prompts. |

### Agent system prompts

| File | Agent | Model |
|---|---|---|
| `prompts/agents/SAFETY_RULES.md` | Loaded by every user-facing agent | — |
| `prompts/agents/ROUTER.md` | Intent classification | Haiku 4.5 |
| `prompts/agents/NUTRITION_ESTIMATOR.md` | Meal estimation (the core) | Sonnet 4.6 |
| `prompts/agents/COACH.md` | Insights and recommendations | Sonnet 4.6 |
| `prompts/agents/MEMORY_CONSOLIDATOR.md` | Background memory updates | Sonnet 4.6 |
| `prompts/agents/NUDGE_GENERATOR.md` | Push notification messages | Haiku 4.5 |
| `prompts/agents/ONBOARDING_PARSER.md` | Questionnaire → profile.md | Haiku 4.5 |

### Reference data

| File | What |
|---|---|
| `prompts/reference/IFCT_INDIAN_FOODS.md` | Indian Food Composition Table extract: ~50 common foods with per-100g values |
| `prompts/reference/MEAL_TEMPLATES.md` | Common Indian meal patterns with calorie estimates |
| `prompts/reference/CONDITION_GUIDELINES.md` | Diet rules for diabetes, PCOS, hypertension, etc. |

### Database schema

| File | What |
|---|---|
| `supabase/migrations/0001_init.sql` | Core tables: users, profiles, messages, meals, water_logs, agent_traces, ifct_foods |
| `supabase/migrations/0002_memory_system.sql` | Memory tables with audit trigger and versioning |
| `supabase/migrations/0003_nudge_system.sql` | Nudge schedules, queue, push subscriptions |
| `supabase/migrations/0004_analytics_views.sql` | Materialized views for trends queries |
| `supabase/migrations/0005_rate_limits.sql` | Per-user rate limiting |
| `supabase/migrations/0006_schedules.sql` | pg_cron job schedules for all background tasks |
| `supabase/seed.sql` | IFCT food data seed (~30 common Indian foods) |

### Edge functions

| File | Schedule | Purpose |
|---|---|---|
| `supabase/functions/nudge-dispatcher/index.ts` | Every 15 min | Evaluate and send nudges |
| `supabase/functions/memory-consolidator/index.ts` | Daily 02:00 IST | Update patterns and semantic memory |
| `supabase/functions/weekly-summary/index.ts` | Sunday 22:00 IST | Generate weekly/monthly summaries |

### Claude Code sub-agents (`.claude/agents/`)

| Agent | Model | Purpose |
|---|---|---|
| `code-reviewer.md` | Sonnet | Pre-commit code review: security, performance, accessibility |
| `test-writer.md` | Sonnet | Write Vitest + Playwright tests for new features |
| `prompt-evaluator.md` | Sonnet | Run prompt eval harness, block merges on regression |
| `db-migration.md` | Sonnet | Create safe, append-only Supabase migrations |
| `accessibility-auditor.md` | Sonnet | WCAG 2.2 AA audit |
| `security-reviewer.md` | Sonnet | Security review: RLS, auth, LLM injection, PII |

### Custom skills (`.claude/skills/`)

| Skill | Purpose |
|---|---|
| `nourish-conventions/SKILL.md` | Code patterns, file naming, import order, component structure |
| `prompt-engineering/SKILL.md` | How to write, cache, and iterate on agent prompts |
| `memory-schema/SKILL.md` | Memory table schema, layer rules, read/write patterns |
| `indian-food-estimation/SKILL.md` | Indian food domain knowledge: portions, oil, cooking methods |

## How to use this

### Prerequisites

- Node.js 20+
- pnpm
- Supabase account (free tier is fine)
- Anthropic API key
- Vercel account (free tier is fine)
- ElevenLabs account (for voice transcription — Scribe v2)

### Getting started

1. **Open Claude Code** in an empty directory.
2. **Copy `CLAUDE.md`** into the root. This is the context Claude Code needs.
3. **Open `docs/BUILD_PLAN.md`** and start with Phase 0, Prompt 0.1.
4. **Copy-paste each prompt** into Claude Code. Let it work. Review. Move on.
5. **Use sub-agents** as specified: `code-reviewer` before commits, `test-writer` after features, `prompt-evaluator` after prompt changes.

### Build timeline

| Phase | Time | What you get |
|---|---|---|
| 0 — Foundation | 1 week | Deployed PWA shell with auth, DB, CI |
| 1 — Onboarding | 1 week | Signup → progressive onboarding → profile |
| 2 — Chat & Logging | 2 weeks | Text/photo/voice meal logging with estimates |
| 3 — Memory | 1 week | Layered memory, semantic dictionary, consolidator |
| 4 — Trends | 1 week | Today view, trends charts, insights |
| 5 — Nudges | 1 week | Proactive check-ins with Web Push |
| 6 — Polish | 1 week+ | Empty states, a11y, privacy, beta users |

## Tech stack

Next.js 16.2.4 · TypeScript · Tailwind CSS v4 · shadcn/ui · Recharts · Supabase · Claude API (Haiku/Sonnet/Opus) · ElevenLabs Scribe v2 · Web Push · Vercel · PostHog · Sentry · Vitest · Playwright


Runtime version policy: use `package.json` as the canonical source of truth for framework/runtime versions in docs (including Next.js and React).

App Router compatibility note (Next.js 16): new work should follow App Router conventions and avoid relying on legacy Pages Router patterns unless explicitly required.

## Cost

~$0.56 per active user per month at 1,000 DAU (optimized). See `docs/COSTS.md`.

## License

Private. All rights reserved.
