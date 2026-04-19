# Nourish — AI Health Coach (Project Instructions for Claude Code)

> This file is the canonical source of truth for how Claude Code should work in this repository. Read it before doing anything. When you change architecture, update this file in the same commit.

---

## What we are building

**Nourish** is an AI-native preventive health coach for Indian users, starting with food logging and nutrition coaching. The MVP is a **Progressive Web App (PWA)** with a chat-first interface, backed by a multi-agent system running on the Anthropic Claude API.

The product's differentiation is interaction quality: logging a meal should feel like sending a WhatsApp message to a friend who happens to be a nutritionist who already knows everything about you. The agent is proactive, contextual, and gets smarter about each user over time through a layered memory system.

## Non-negotiables

1. **Marginal cost of completeness is near zero.** When a feature is in scope, finish it. Tests, types, error handling, accessibility, edge cases — all of it.
2. **Medical safety first.** The agent must never recommend foods that conflict with a user's medical conditions or allergies. This is enforced in `prompts/agents/SAFETY_RULES.md` and in code.
3. **Calorie estimates are ranges, not points.** Indian food has too much variance for false precision. We say "roughly 550-650 kcal" not "583 kcal".
4. **Memory is the moat.** Every interaction should make the agent more useful for that specific user tomorrow. Never lose context.
5. **Privacy is sacred.** Health data is sensitive. Row Level Security on every table. No PII in logs. DPDP Act compliance from day one.
6. **No premature complexity.** If a managed service does the job, use it. We are not building infrastructure.

## Tech stack (locked)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router, TypeScript, Turbopack) | Best PWA story, server components, edge-ready |
| UI | Tailwind CSS v4 + shadcn/ui | Composable, accessible, fast to build |
| Charts | Recharts | React-native, works with shadcn theme |
| Database | Supabase (Postgres + RLS) | Managed, auth included, real-time |
| Auth | Supabase Auth (email + Google OAuth) | Cookie-based SSR auth |
| File storage | Supabase Storage | Meal photos |
| Background jobs | Supabase Edge Functions + pg_cron | Nudges, summaries, memory consolidation |
| LLM | Anthropic Claude API | Vision, tool use, prompt caching |
| Voice transcription | ElevenLabs Scribe v2 | Best Hinglish accuracy, keyterm prompting, already on your subscription |
| Push notifications | Web Push (VAPID) via `web-push` lib | No vendor lock-in |
| Hosting | Vercel | Zero-config Next.js, edge functions |
| Analytics | PostHog | Funnels, retention, cohorts |
| Errors | Sentry | Source maps, perf monitoring |
| Tests | Vitest (unit) + Playwright (e2e) | Fast, modern, TS-native |
| Lint/Format | ESLint + Prettier | Standard |

## Models and routing

We use three Claude tiers. Route aggressively to keep costs sane.

| Agent | Model | Why |
|---|---|---|
| Router (intent classification) | `claude-haiku-4-5` | Fast, cheap, well-bounded task |
| Nutrition Estimator | `claude-sonnet-4-6` | Accuracy matters, vision needed |
| Coach & Insights | `claude-sonnet-4-6` | Analytical depth |
| Memory Consolidation (daily) | `claude-sonnet-4-6` | Pattern extraction |
| Memory Consolidation (weekly synthesis) | `claude-opus-4-6` | Worth the extra spend at low frequency |
| Nudge Generator | `claude-haiku-4-5` | Short templated outputs |
| Onboarding parser | `claude-haiku-4-5` | Structured extraction |
| Meal presentation (Stage 6) | `claude-haiku-4-5` | Formatting computed results for user |

**Always use prompt caching** for system prompts. Caching cuts input costs by 90%.

**Hybrid nutrition pipeline:** The Nutrition Estimator does identification only (Stage 1). Calorie math, micronutrient flagging, and safety checks are deterministic TypeScript in `src/lib/nutrition/`. This makes the numerical output testable, debuggable, and LLM-independent.

**Tracked micronutrients:** In addition to macros (protein, carbs, fat, fiber), we track five critical micronutrients: B12, calcium, vitamin D, potassium, and omega-3. These are computed by the code pipeline, not the LLM.

## Project structure

```
nourish/
├── CLAUDE.md                         # This file
├── README.md                         # Public-facing project overview
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── playwright.config.ts
├── vitest.config.ts
├── .env.local.example
├── .gitignore
│
├── docs/                             # Human-readable docs
│   ├── PRD.md                        # Product requirements
│   ├── ARCHITECTURE.md               # System architecture & data flow
│   ├── BUILD_PLAN.md                 # Step-by-step build phases
│   ├── PROMPTS_GUIDE.md              # How to iterate on agent prompts
│   ├── INTEGRATIONS.md               # Future: Swiggy, WhatsApp, wearables
│   ├── COSTS.md                      # Cost model and optimization
│   └── ONBOARDING_FLOW.md            # Onboarding question sequence
│
├── prompts/                          # Agent system prompts (versioned)
│   ├── agents/
│   │   ├── ROUTER.md                 # Intent classification agent
│   │   ├── NUTRITION_ESTIMATOR.md    # Meal logging agent
│   │   ├── COACH.md                  # Insights and recommendations
│   │   ├── MEMORY_CONSOLIDATOR.md    # Background memory updates
│   │   ├── NUDGE_GENERATOR.md        # Proactive nudges
│   │   ├── ONBOARDING_PARSER.md      # Convert questionnaire → profile.md
│   │   └── SAFETY_RULES.md           # Medical/allergy safety constraints
│   └── reference/
│       ├── IFCT_INDIAN_FOODS.md      # Indian Food Composition Table extract
│       ├── MEAL_TEMPLATES.md         # Common Indian meal patterns
│       └── CONDITION_GUIDELINES.md   # Diet rules for diabetes, PCOS, etc.
│
├── .claude/                          # Claude Code configuration
│   ├── agents/                       # Sub-agents (development helpers)
│   │   ├── code-reviewer.md
│   │   ├── test-writer.md
│   │   ├── prompt-evaluator.md
│   │   ├── db-migration.md
│   │   ├── accessibility-auditor.md
│   │   └── security-reviewer.md
│   └── skills/                       # Custom development skills
│       ├── nourish-conventions/SKILL.md
│       ├── prompt-engineering/SKILL.md
│       ├── memory-schema/SKILL.md
│       └── indian-food-estimation/SKILL.md
│
├── supabase/
│   ├── migrations/                   # SQL migration files
│   │   ├── 0001_init.sql             # Core tables, RLS, indexes
│   │   ├── 0002_memory_system.sql    # Memory tables and triggers
│   │   ├── 0003_nudge_system.sql     # Nudge schedules and queue
│   │   └── 0004_analytics_views.sql  # Materialized views for trends
│   ├── functions/                    # Edge functions
│   │   ├── nudge-dispatcher/
│   │   ├── memory-consolidator/
│   │   └── weekly-summary/
│   └── seed.sql                      # IFCT food data seed
│
└── src/
    ├── app/
    │   ├── (auth)/                   # Login, signup, callback
    │   ├── (onboarding)/             # Onboarding wizard
    │   ├── (app)/                    # Main authenticated app
    │   │   ├── chat/                 # Home: chat interface
    │   │   ├── today/                # Today's logs and totals
    │   │   ├── trends/               # Weekly/monthly analytics
    │   │   └── profile/              # User profile + memory inspector
    │   ├── api/
    │   │   ├── chat/route.ts         # Main message handler (orchestrator)
    │   │   ├── meals/route.ts        # CRUD on meals
    │   │   ├── memory/route.ts       # Memory inspection/edit
    │   │   ├── nudges/ack/route.ts   # User responds to a nudge
    │   │   └── push/subscribe/route.ts # Web Push subscription
    │   ├── layout.tsx
    │   ├── page.tsx                  # Marketing landing
    │   └── manifest.ts               # PWA manifest
    ├── components/
    │   ├── ui/                       # shadcn primitives
    │   ├── chat/                     # Chat-specific components
    │   ├── charts/                   # Radar, line, bar charts
    │   ├── meals/                    # Meal cards, log forms
    │   └── onboarding/               # Wizard steps
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts             # Browser client
    │   │   ├── server.ts             # Server-side client
    │   │   └── middleware.ts         # Auth middleware
    │   ├── claude/
    │   │   ├── client.ts             # Anthropic SDK wrapper
    │   │   ├── prompts.ts            # Prompt loader with caching
    │   │   └── types.ts              # Shared agent types
    │   ├── agents/
    │   │   ├── orchestrator.ts       # Main entry point per message
    │   │   ├── router.ts             # Intent classifier
    │   │   ├── nutrition.ts          # Meal estimation agent
    │   │   ├── coach.ts              # Insights agent
    │   │   └── nudge.ts              # Nudge generator
    │   ├── memory/
    │   │   ├── reader.ts             # Load layered memory for context
    │   │   ├── writer.ts             # Update memory layers
    │   │   ├── consolidator.ts       # Background pattern extraction
    │   │   └── semantic.ts           # Semantic dictionary (user vocab)
    │   ├── nutrition/
    │   │   ├── lookup.ts             # Fuzzy match items against ifct_foods table
    │   │   ├── multipliers.ts        # Load cooking + source multiplier tables
    │   │   ├── calculator.ts         # Compose: lookup × multipliers × calibration → ranges
    │   │   ├── calibration.ts        # User correction history → portion bias
    │   │   ├── micros.ts             # Micronutrient flagging (B12, Ca, D, K, Ω3)
    │   │   ├── targets.ts            # Daily targets per profile
    │   │   └── pipeline.ts           # Orchestrate stages 2-5 of the hybrid pipeline
    │   ├── nudges/
    │   │   ├── scheduler.ts          # Decide what to nudge when
    │   │   ├── push.ts               # Web Push delivery
    │   │   └── policy.ts             # Frequency caps, escalation rules
    │   └── safety/
    │       ├── conditions.ts         # Medical condition rules
    │       └── allergens.ts          # Allergen checks
    └── types/
        └── database.ts               # Generated Supabase types
```

## Conventions

### Code style
- **TypeScript strict mode** everywhere. No `any` without a `// @ts-expect-error: <reason>` comment.
- **Server Components by default.** Only use `"use client"` when you need interactivity.
- **Server Actions** for mutations from forms. **Route handlers** only when an external system needs to call us (webhooks, push subscriptions).
- **Zod** for all input validation at API boundaries.
- **Named exports only.** No default exports except where Next.js requires them (pages, layouts, route handlers).
- **One component per file.** Filename matches export name in PascalCase.

### Database
- **Every table has Row Level Security enabled.** Always.
- **Every user-scoped table has a `user_id uuid references auth.users(id) on delete cascade`.**
- **Every table has `created_at timestamptz default now()` and `updated_at timestamptz default now()`** with a trigger to maintain `updated_at`.
- **Use `gen_random_uuid()` for IDs** (built into Postgres 13+).
- **Migrations are append-only.** Never edit a committed migration. Add a new one.

### Agents
- **Every agent has its system prompt in `prompts/agents/`** as a markdown file. The TypeScript code loads it at startup and passes it to the API with `cache_control` set.
- **Every agent call goes through `src/lib/claude/client.ts`.** No direct Anthropic SDK calls scattered around the codebase.
- **Every agent response is logged** (with PII redacted) to a `agent_traces` table for debugging and prompt iteration.
- **The Router is the only entry point** from the main chat API route. All specialist agents are invoked by the Router or by background jobs.

### Testing
- **Unit tests** for all `lib/` code. Vitest. Aim for 80%+ coverage on `lib/agents`, `lib/memory`, `lib/safety`.
- **E2E tests** for the critical flows: signup → onboarding → log first meal → see it in Today.
- **Prompt evaluation harness:** `npm run eval:prompts` runs the agent against a fixed set of test cases and reports accuracy. Run before merging any prompt change.

### Commits and PRs
- **Conventional commits.** `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
- **Small, atomic PRs.** Easier to review, easier to revert.
- **Always run** `npm run lint && npm run typecheck && npm run test` before pushing.
- **Use the `code-reviewer` sub-agent before opening any PR.**

## Key environment variables

See `.env.local.example` for the full list. The critical ones:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server-side only
ANTHROPIC_API_KEY=                  # Server-side only
ELEVENLABS_API_KEY=                  # Server-side only (used for Scribe v2 STT)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=                  # Server-side only
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=                  # Build-time only
NEXT_PUBLIC_APP_URL=                # e.g. https://nourish.app
```

## How to work in this repo with Claude Code

1. **Always read this file first.** It is the canonical context.
2. **Use the appropriate sub-agent** for the task: `code-reviewer` before commits, `test-writer` after features, `prompt-evaluator` after prompt changes, `db-migration` for schema changes.
3. **When in doubt, write a test.** It's cheaper than debugging in production.
4. **When changing an agent prompt, run `npm run eval:prompts`** and include the before/after numbers in the commit message.
5. **Never put secrets in code.** Use environment variables. The `.env.local.example` file documents what's needed; `.env.local` is gitignored.
6. **When you finish a task, leave the codebase in a shippable state.** Lint clean, types clean, tests passing.

## Where to find things

- **Product spec:** `docs/PRD.md`
- **System architecture:** `docs/ARCHITECTURE.md`
- **The build plan, phase by phase:** `docs/BUILD_PLAN.md` (this is what you execute against)
- **All agent prompts:** `prompts/agents/`
- **Database schema:** `supabase/migrations/`
- **Sub-agents you can delegate to:** `.claude/agents/`
