# TASKS — Active Execution Plan

_Last updated: 2026-05-05_

## Current phase snapshot
- **Roadmap phase:** Late **Phase 0** / Early **Phase 1**
- **State:** foundation implemented; onboarding + chat intelligence not yet production-complete
- **Execution focus:** restart product delivery with chat-first onboarding and minimal end-to-end logging loop

## Milestone plan

### M1 — Documentation and execution system hardening (current)
Status: `in_progress`

| ID | Task | Files | Acceptance criteria | Verify | Status |
|---|---|---|---|---|---|
| DOC-001 | Finalize doc source-of-truth alignment | `README.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, `docs/BUILD_PLAN.md` | Next.js/runtime/version and planned-vs-implemented wording are consistent | `rg -n "Next\.js|planned|implemented" README.md docs/ARCHITECTURE.md CLAUDE.md docs/BUILD_PLAN.md` | done |
| DOC-002 | Maintain ADR log with key historical decisions | `docs/DECISIONS.md` | ADR template present + backfilled core decisions | `rg -n "ADR Template|## 2026-" docs/DECISIONS.md` | done |
| DOC-003 | Maintain active task ledger | `docs/TASKS.md` | Current phase + task table + owner/dependency visibility | `rg -n "Current phase snapshot|Milestone plan|Dependencies" docs/TASKS.md` | done |
| DOC-004 | Add core operational docs (`TESTING.md`, `SECURITY.md`, `RUNBOOK.md`) and cross-link in README | `TESTING.md`, `SECURITY.md`, `RUNBOOK.md`, `README.md`, `docs/TASKS.md` | New docs exist with actionable commands/checklists and README links to all three files | `rg -n "TESTING.md|SECURITY.md|RUNBOOK.md" README.md docs/TASKS.md && test -f TESTING.md && test -f SECURITY.md && test -f RUNBOOK.md` | done |

### M1.1 — Developer workflow hardening (DB type generation)
Status: `done`

| ID | Task | Files | Acceptance criteria | Verify | Status |
|---|---|---|---|---|---|
| DEVEX-DBTYPES-001 | Add reproducible DB type generation + stale check in CI | `package.json`, `scripts/db-types-check.mjs`, `.github/workflows/ci.yml`, `README.md` | Contributors can regenerate with `pnpm db:types` and CI fails when `src/types/database.ts` is stale | `pnpm run db:types:check` | done |

### M2 — Phase 1 completion (chat-first onboarding)
Status: `pending`

| ID | Task | Files | Acceptance criteria | Verify | Status |
|---|---|---|---|---|---|
| P1-000 | Freeze Phase 1 onboarding contract (chat-first, English-only MVP) | `docs/ONBOARDING_FLOW.md`, `docs/TASKS.md`, `docs/BUILD_PLAN.md` | Mandatory vs progressive fields finalized, conversational tone locked, canonical field naming and completion criteria documented | `rg -n "chat-first|English-only|mandatory fields|medications_affecting_diet|Phase 1 completion" docs/TASKS.md docs/BUILD_PLAN.md docs/ONBOARDING_FLOW.md` | done |
| P1-001A | Define onboarding schema + type contract with validation rules | `src/lib/onboarding/types.ts`, `src/lib/onboarding/schema.ts`, `src/lib/onboarding/schema.test.ts` | Canonical `OnboardingAnswers` type and Zod schema implemented with conditional goal rules and meal-time validation | `pnpm run typecheck && pnpm run test -- src/lib/onboarding/schema.test.ts` | done |
| P1-001B | Build chat-first onboarding UI skeleton with checkpoint progression | `src/app/(onboarding)/onboarding/page.tsx`, `src/components/onboarding/ChatOnboardingFlow.tsx`, `src/components/onboarding/ChatOnboardingFlow.test.tsx` | Conversational checkpoint flow exists with progress indicator, basic validation, and navigation states | `pnpm run typecheck && pnpm run test -- src/components/onboarding/ChatOnboardingFlow.test.tsx` | done |
| P1-001C | Add onboarding recovery UX + required review/confirm gate | `src/components/onboarding/ChatOnboardingFlow.tsx`, `src/components/onboarding/ChatOnboardingFlow.test.tsx` | Loading/error/retry scaffolding exists and user cannot enter chat without explicit review confirmation | `pnpm run typecheck && pnpm run test -- src/components/onboarding/ChatOnboardingFlow.test.tsx` | done |
| P1-001D | Integrate onboarding parser preview action with retry-safe error handling | `src/app/(onboarding)/actions.ts`, `src/lib/agents/onboarding-parser.ts`, `src/components/onboarding/ChatOnboardingFlow.tsx` | Confirm step validates payload server-side and requests profile markdown generation; parser failures surface user-retry message | `pnpm run typecheck && pnpm run test -- src/lib/agents/onboarding-parser.test.ts src/components/onboarding/ChatOnboardingFlow.test.tsx` | done |
| P1-001E | Replace static step form UX with conversational chat onboarding thread | `src/components/onboarding/ChatOnboardingFlow.tsx`, `src/components/onboarding/ChatOnboardingFlow.test.tsx` | Users answer onboarding prompts in a chat transcript with free-text replies and a chat-native summary confirmation step | `pnpm run typecheck && pnpm run test -- src/components/onboarding/ChatOnboardingFlow.test.tsx` | done |
| P1-001 | Ship chat-first onboarding entry flow | `src/app/(onboarding)/**`, `src/app/(app)/chat/**` | New user can complete required profile capture in chat without wizard dependency | `pnpm test:e2e -g onboarding` | in_progress |
| P1-002A | Persist onboarding profile + memory rows + onboarded state in one server action | `src/app/(onboarding)/actions.ts`, `src/lib/agents/onboarding-parser.ts` | Confirm action writes `user_profiles`, `memories(profile/patterns)`, and `users.onboarded_at` after schema validation | `pnpm run typecheck && pnpm run test -- src/components/onboarding/ChatOnboardingFlow.test.tsx src/lib/agents/onboarding-parser.test.ts` | done |
| P1-002 | Persist onboarding-derived profile and safety fields | `src/lib/agents/*`, `src/lib/memory/*`, `supabase/migrations/*` | Profile memory row + core structured fields saved with validation | `pnpm test` | in_progress |
| P1-002B | Harden onboarding completion idempotency + structured retry-safe writes | `src/app/(onboarding)/actions.ts`, `docs/TASKS.md`, `docs/DECISIONS.md` | Duplicate submits do not create inconsistent state; write-step logs emitted with safe metadata; partial-write path returns retry guidance | `pnpm run typecheck && pnpm run lint` | done |
| P1-004A | Enforce onboarding route guards from `users.onboarded_at` | `src/app/(app)/layout.tsx`, `src/app/(onboarding)/onboarding/page.tsx`, `src/lib/auth/onboardingState.ts` | Non-onboarded users are redirected to onboarding; onboarded users are redirected away from onboarding to chat | `pnpm run typecheck && pnpm run test -- src/lib/auth/onboardingState.test.ts` | done |
| P1-003 | Add onboarding failure/recovery UX states | `src/app/(onboarding)/**`, `src/components/**` | Loading/error/retry states implemented and accessible | `pnpm test && pnpm test:e2e -g onboarding` | in_progress |
| P1-005 | Introduce shared design tokens and apply to onboarding/chat/home card surfaces | `src/app/globals.css`, `src/components/onboarding/ChatOnboardingFlow.tsx`, `src/app/(app)/*/page.tsx`, `docs/ARCHITECTURE.md` | Color/radius/shadow/type tokens defined centrally and consumed by onboarding chat, coach/home top card, progress cards, and folder/report cards with conventions documented | `pnpm run typecheck && pnpm run lint` | done |

### M3 — Phase 2 slice (minimum lovable meal logging)
Status: `pending`

| ID | Task | Files | Acceptance criteria | Verify | Status |
|---|---|---|---|---|---|
| P2-001A | Implement minimal orchestrator routing contract (`handleMessage`) with typed response blocks | `src/lib/agents/orchestrator.ts`, `src/lib/agents/orchestrator.test.ts` | `handleMessage(userId, message)` validates payload and routes only `meal_log_candidate` vs fallback guidance | `pnpm run test -- src/lib/agents/orchestrator.test.ts` | done |
| P2-001 | Implement `/api/chat` orchestrator endpoint | `src/app/api/chat/route.ts`, `src/lib/agents/orchestrator.ts` | Authenticated chat request returns structured assistant response | `pnpm test` | pending |
| P2-002 | Integrate hybrid nutrition pipeline in request flow | `src/lib/nutrition/**`, `src/lib/safety/**` | Deterministic macro/micro ranges and safety checks executed for meal logs | `pnpm test` | pending |
| P2-003 | Save meal logs + show in Today page | `src/app/(app)/today/page.tsx`, `src/app/chat/confirm/route.ts`, `src/lib/meals/*` | Minimal confirm-save flow persists approved estimate and newly saved meal appears in Today list | `pnpm run test -- src/lib/meals/confirm-save.integration.test.ts` | in_progress |

## Dependencies on PM/founder (you)

Resolved for Phase 1 kickoff:
- Conversational tone approved for onboarding copy.
- English-only UX approved for Phase 1 MVP.

Still needed:
1. Provide **acceptance criteria for MVP meal log** (what is "good enough" for first beta users).
2. Provide **test accounts and QA scenarios** for first realistic UAT pass.

Decisions now locked:
- Onboarding requires all three meal anchors during setup (default 09:00, 13:00, 19:00).
- Profile review/confirm screen is required before entering chat.
- Canonical field naming remains `medications_affecting_diet` (UI copy can stay conversational).

## Blockers / risks
- No completed end-to-end chat logging flow yet (`/api/chat` still planned).
- Build plan contains historical wizard prompts that can confuse contributors if not clearly superseded.
- Core docs now include operational runbooks (`TESTING.md`, `SECURITY.md`, `RUNBOOK.md`); keep them in parity with behavior changes every PR.
