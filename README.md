# Nourish

**An AI-native preventive health coach for India, starting with food logging.**

Nourish is a Progressive Web App with a chat-first interface powered by a multi-agent system running on the Anthropic Claude API. The product's differentiation is interaction quality: logging a meal should feel like sending a WhatsApp message to a friend who happens to be a nutritionist who already knows everything about you.

## What's in this repository

This is a **working codebase with the foundation implemented** plus the complete project artifact set used to continue building the Nourish MVP.

> **Status as of 2026-05-03:** Foundation is implemented and running; onboarding, chat intelligence, and advanced coaching modules are still in progress.

## Current Implementation Status

### ✅ Implemented

- Core Next.js app structure and deployable PWA shell
- Supabase schema and migration set for core product domains
- Scheduled edge functions for nudges, memory consolidation, and summaries
- Agent prompt system scaffolding and reference nutrition data
- Foundational docs, architecture, and build-plan artifacts

### 🚧 In progress

- End-to-end onboarding UX and progressive profiling flows
- Production-grade chat orchestration and multi-agent routing integration
- Meal logging UX polish (text/photo/voice) and estimator quality tuning
- Trends/insights product surfaces and personalized coaching logic
- Nudge UX refinement, reliability hardening, and beta-readiness QA

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
| `TESTING.md` | Testing layers, exact commands, fixtures, and failure triage playbook. |
| `SECURITY.md` | Auth/RLS model, validation boundaries, LLM risk controls, and security checklist. |
| `RUNBOOK.md` | Deploy checks, rollback procedures, and incident diagnostics. |

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
| `supabase/migrations/0007_hybrid_pipeline_and_fixes.sql` | Adds hybrid nutrition pipeline schema and supporting data fixes |
| `supabase/migrations/0008_security_definer_hardening.sql` | Hardens SECURITY DEFINER functions and privilege boundaries |
| `supabase/seed.sql` | IFCT food data seed (~30 common Indian foods) |

**Migration dependency order (run in exact sequence):** `0001_init.sql` → `0002_memory_system.sql` → `0003_nudge_system.sql` → `0004_analytics_views.sql` → `0005_rate_limits.sql` → `0006_schedules.sql` → `0007_hybrid_pipeline_and_fixes.sql` → `0008_security_definer_hardening.sql`.

**Important:** The migration list is append-only. Never edit committed migration files; always add a new migration and update this list whenever a new migration is added.

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

## Roadmap

The original phase-by-phase build plan remains the source of truth for what comes next.

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


### Database type generation workflow

`src/types/database.ts` is generated from your local Supabase schema and should never be edited manually.

1. Start local Supabase services (`pnpm supabase start`).
2. Regenerate types after any migration change: `pnpm db:types`.
3. Before opening a PR that touches DB access code, verify generated types are current: `pnpm db:types:check`.

CI enforces this with the same `db:types:check` command and fails when committed types are stale.

## Tech stack

Next.js 16.2.4 · TypeScript · Tailwind CSS v4 · shadcn/ui · Recharts · Supabase · Claude API (Haiku/Sonnet/Opus) · ElevenLabs Scribe v2 · Web Push · Vercel · PostHog · Sentry · Vitest · Playwright


## Route implementation status

| Planned Route | Implemented? | File Path | Notes |
|---|---|---|---|
| `/api/chat` | Yes (MVP) | `src/app/api/chat/route.ts` | Authenticated text-only MVP with validation, per-user rate limiting, deterministic fallback, and safe error envelopes. |
| `/api/meals` | No (planned) | _Not implemented yet_ | Planned meals CRUD API route. |
| `/api/memory` | No (planned) | _Not implemented yet_ | Planned memory read/edit API route. |
| `/api/push` | No (planned) | _Not implemented yet_ | Planned push subscription API route. |
| `/(auth)/callback` | Yes | `src/app/(auth)/callback/route.ts` | Implemented auth callback route handler. |

## Feature Maturity

This snapshot clarifies build maturity so product and engineering planning stay aligned.

- **Chat:** Placeholder shell
- **Today:** Placeholder shell
- **Trends:** Placeholder shell
- **Profile memory inspector:** Not implemented yet
- **Auth and app shell:** Implemented baseline

## Tech stack

Runtime version policy: use `package.json` as the canonical source of truth for framework/runtime versions in docs (including Next.js and React).

App Router compatibility note (Next.js 16): new work should follow App Router conventions and avoid relying on legacy Pages Router patterns unless explicitly required.

## Cost

~$0.56 per active user per month at 1,000 DAU (optimized). See `docs/COSTS.md`.

## License

Private. All rights reserved.
