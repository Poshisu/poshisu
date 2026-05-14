# TASKS — Active Execution Plan

_Last updated: 2026-05-06_

## Current phase snapshot
- **Roadmap phase:** Late **Phase 0** / Early **Phase 1**
- **State:** foundation implemented; onboarding + chat intelligence not yet production-complete
- **Execution focus:** restart product delivery with chat-first onboarding and minimal end-to-end logging loop
- `docs/TASKS.md` is source of truth for current execution order; `docs/BUILD_PLAN.md` retains historical prompts.


## Agent Onboarding PR

Use this checklist for Forge/Hermes onboarding governance PRs (first PR in a new execution cycle).

### Required checklist
- [ ] Startup report completed and attached/linked in the PR body.
- [ ] First PR contains **no product code changes** (docs/governance changes only).
- [ ] Branch naming convention is followed (for example: `docs/<scope>-<short-description>` or `chore/<scope>-<short-description>`).
- [ ] Verification commands and outputs are pasted in the PR body.
- [ ] Rollback note is included in the PR body (how to revert safely if governance/docs changes need to be undone).

### Pass criteria
- Human approval is required before Forge can submit any feature PRs after onboarding.

### Fail-closed rule
- If the onboarding report is incomplete or missing, Forge must stop execution and explicitly request clarification before making or submitting additional changes.

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
| P1-001F | Add multimodal onboarding event schema + media placeholders + parser branching | `src/app/(onboarding)/actions.ts`, `src/lib/onboarding/message-events.ts`, `src/lib/onboarding/transcription.ts`, `src/lib/agents/onboarding-parser.ts` | Multimodal event payload validates with Zod; parser path can return extract vs clarify; audio transcript placeholder feeds extraction input path | `pnpm run test -- src/lib/onboarding/message-events.test.ts src/lib/agents/onboarding-parser.test.ts` | done |
| P1-001 | Ship chat-first onboarding entry flow | `src/app/(onboarding)/**`, `src/app/(app)/chat/**` | New user can complete required profile capture in chat without wizard dependency | `pnpm test:e2e -g onboarding` | in_progress |
| P1-001F | Add onboarding confidence labels, contextual chips, and low-confidence clarifier prompts | `src/components/onboarding/ChatOnboardingFlow.tsx`, `src/components/onboarding/ChatOnboardingFlow.test.tsx` | Assistant messages show confidence labels, chips are contextual per question, and ambiguous answers trigger clarifier prompts with low-confidence labeling | `pnpm run test -- src/components/onboarding/ChatOnboardingFlow.test.tsx` | done |
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
| P2-001 | Implement `/api/chat` orchestrator endpoint | `src/app/api/chat/route.ts`, `src/lib/agents/orchestrator.ts` | Authenticated chat request returns structured assistant response | `pnpm test` | done |
| P2-002 | Integrate hybrid nutrition pipeline in request flow | `src/lib/nutrition/**`, `src/lib/safety/**` | Deterministic macro/micro ranges and safety checks executed for meal logs | `pnpm test` | pending |
| P2-003 | Save meal logs + show in Today page | `src/app/(app)/today/page.tsx`, `src/app/chat/confirm/route.ts`, `src/lib/meals/*` | Minimal confirm-save flow persists approved estimate and newly saved meal appears in Today list | `pnpm run test -- src/lib/meals/confirm-save.integration.test.ts` | done |

## Crosswalk: Tactical A–E to Roadmap Phases

| Tactical Task (A–E) | Phase/Milestone mapping (M2/M3 + P1/P2 IDs) | Dependencies | Current status | Exit criteria |
|---|---|---|---|---|
| A — Onboarding contract + schema hardening | M2 · P1-000, P1-001A | `docs/ONBOARDING_FLOW.md` contract freeze, canonical naming alignment | done | Contract is frozen in docs and schema/tests enforce required onboarding fields and validation behavior. |
| B — Chat-first onboarding UX completion | M2 · P1-001, P1-001B, P1-001C, P1-001D, P1-001E, P1-004A | A complete; route guard logic wired to onboarding state | in_progress | New users can complete chat-first onboarding with confirm gate, resilient error/retry UX, and enforced route redirects. |
| C — Onboarding persistence + idempotent completion | M2 · P1-002, P1-002A, P1-002B | A and B complete; parser/action validation and safe write sequencing | in_progress | Confirm action writes profile + memory + onboarding marker atomically/idempotently without inconsistent duplicate writes. |
| D — Chat orchestrator MVP endpoint | M3 · P2-001A, P2-001 | C complete; authenticated API + safe envelope/error contract | pending | `/api/chat` handles authenticated requests through orchestrator routing and returns deterministic, safe client responses. |
| E — Minimum lovable meal logging loop | M3 · P2-002, P2-003 | D complete; nutrition pipeline integration + confirm-save flow | in_progress | User can submit meal input, review estimate, confirm save, and see the saved meal reflected in Today view. |

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
- Hybrid nutrition pipeline remains pending for meal estimation depth and safety checks.
- Build plan contains historical wizard prompts that can confuse contributors if not clearly superseded.
- Core docs now include operational runbooks (`TESTING.md`, `SECURITY.md`, `RUNBOOK.md`); keep them in parity with behavior changes every PR.


## Immediate next sprint (speed-to-E2E)

1. **Close Phase 1 onboarding finish line**: complete `P1-001`, `P1-002`, and `P1-003` with a passing onboarding E2E run (`pnpm test:e2e -g onboarding`).
2. **Unblock meal loop quality**: implement `P2-002` hybrid nutrition pipeline integration and verify deterministic safety checks with test coverage.
3. **Run first beta-ready gate**: execute lint, typecheck, unit tests, build, and scoped E2E in CI + Vercel preview and document residual failures in `RUNBOOK.md`.


## End-to-end delivery sequence (from now to launch-ready)

### Stage 1 — Complete Phase 1 (must finish first)
1. Finish `P1-001` onboarding entry flow and pass onboarding E2E (`pnpm test:e2e -g onboarding`).
2. Finish `P1-002` persistence completion and verify profile + memory + onboarding marker writes remain idempotent.
3. Finish `P1-003` failure/recovery UX with accessible loading/empty/error/success states.

### Stage 2 — Complete minimum lovable meal loop (Phase 2 core)
4. Implement `P2-002` hybrid nutrition pipeline integration (`src/lib/nutrition/**`, `src/lib/safety/**`) with deterministic tests.
5. Validate `P2-003` confirm-save-to-Today loop against realistic meal scenarios and safety edge cases.
6. Promote `/api/chat` from MVP to beta-ready by adding production error telemetry, retry policies, and contract tests.

### Stage 3 — Fill API gaps required for a usable product
7. Implement `/api/meals` CRUD routes with auth + RLS integration tests.
8. Implement `/api/memory` read/write routes for profile/pattern transparency surfaces.
9. Implement `/api/push` subscription routes and end-to-end push registration flow.

### Stage 4 — Product surfaces and trust layer
10. Build Today page from placeholder to production-ready state (totals, cards, corrections).
11. Build Trends page with weekly/monthly period views and chart QA.
12. Build Profile memory inspector (profile, patterns, context, semantic dictionary, privacy actions).

### Stage 5 — AI quality, safety, and eval hardening
13. Expand prompt eval harness coverage for onboarding parser, router, nutrition estimator, and coach.
14. Add adversarial tests for prompt injection, hallucination boundaries, and tool misuse.
15. Lock safety policy assertions (allergens, condition conflicts, unsafe recommendation rejection) in deterministic tests.

### Stage 6 — Reliability and ops hardening
16. Finalize CI parity gates: lint, typecheck, unit/integration, build, scoped E2E, db type freshness.
17. Ensure Vercel preview and production env parity (required env docs + smoke checks in RUNBOOK).
18. Add release rollback playbook with data migration rollback guidance and incident checkpoints.

### Stage 7 — Beta readiness and launch gate
19. Run UAT checklist (`docs/UAT_VERCEL.md`) on text/image/audio/file/chips and log defects.
20. Complete accessibility pass (keyboard, labels, live regions, contrast) and fix all critical issues.
21. Complete privacy/export/delete-account flows and verify policy/documentation parity.
22. Run first closed beta with target users, collect telemetry + qualitative feedback, and prioritize final fixes.
23. Execute launch checklist and cut release only after all gates are green and documented.

### PM/founder inputs required to keep sequence unblocked
- Define meal-log MVP acceptance criteria for Stage 2 quality sign-off.
- Provide beta cohort test accounts and UAT scenarios before Stage 7.
- Approve safety/copy/privacy escalations that materially change user outcomes.


## Stage execution tracker (actionable backlog)

Use this as the day-to-day execution board. Only one task should be `in_progress` at a time.

| Seq | Stage | Task ID | Task | Acceptance criteria | Verify command | Status |
|---|---|---|---|---|---|---|
| 1 | Stage 1 | S1-T01 | Close onboarding chat entry flow (`P1-001`) | New user completes mandatory onboarding and is routed to chat via guarded flow | `pnpm run test:e2e -g onboarding` | done |
| 2 | Stage 1 | S1-T02 | Close onboarding persistence (`P1-002`) | Confirm step writes profile + memory + onboarded marker idempotently | `pnpm run test -- src/lib/agents/onboarding-parser.test.ts src/components/onboarding/ChatOnboardingFlow.test.tsx` | done |
| 3 | Stage 1 | S1-T03 | Close onboarding failure/recovery (`P1-003`) | Loading/error/retry states are accessible and deterministic | `pnpm run test -- src/components/onboarding/ChatOnboardingFlow.test.tsx && pnpm run test:e2e -g onboarding` | done |
| 4 | Stage 2 | S2-T01 | Implement hybrid nutrition pipeline integration (`P2-002`) | Deterministic macro/micro + safety checks wired into request flow | `pnpm run test -- src/lib/nutrition src/lib/safety` | done |
| 5 | Stage 2 | S2-T02 | Validate confirm-save meal loop (`P2-003` hardening) | User can confirm estimate and see saved meal in Today with regression coverage | `pnpm run test -- src/lib/meals/confirm-save.integration.test.ts` | done |
| 6 | Stage 2 | S2-T03 | Harden `/api/chat` beta contract | Safe envelopes, retry/fallback behavior, and trace logging verified | `pnpm run test -- src/app/api/chat` | done |
| 7 | Stage 3 | S3-T01 | Implement `/api/meals` CRUD | Auth + RLS enforced on create/read/update/delete | `pnpm run test -- src/app/api/meals` | done |
| 8 | Stage 3 | S3-T02 | Implement `/api/memory` read/write | Profile and pattern updates available with permission checks | `pnpm run test -- src/app/api/memory` | done |
| 9 | Stage 3 | S3-T03 | Implement `/api/push` subscription lifecycle | Subscribe/unsubscribe and delivery eligibility stored correctly | `pnpm run test -- src/app/api/push` | done |
| 10 | Stage 4 | S4-T01 | Productionize Today page | Daily totals/cards/edit flows stable on mobile + desktop | `pnpm run test -- src/app/(app)/today` | done |
| 11 | Stage 4 | S4-T02 | Productionize Trends page | Weekly/monthly charts and insight cards render with empty/error states | `pnpm run test -- src/app/(app)/trends` | done |
| 12 | Stage 4 | S4-T03 | Build profile memory inspector | User can inspect/edit memory layers safely with audit context | `pnpm run test -- src/app/(app)/profile` | done |
| 13 | Stage 5 | S5-T01 | Expand prompt eval coverage | Eval set covers onboarding/router/nutrition/coach with baseline tracking | `pnpm run eval:prompts` | todo |
| 14 | Stage 5 | S5-T02 | Add AI safety adversarial tests | Prompt injection/hallucination/tool misuse checks pass thresholds | `pnpm run eval:prompts` | todo |
| 15 | Stage 5 | S5-T03 | Lock deterministic safety policy tests | Allergen/condition safeguards block unsafe outputs | `pnpm run test -- src/lib/safety` | todo |
| 16 | Stage 6 | S6-T01 | Finalize CI parity gates | CI runs lint/typecheck/unit/build/scoped E2E/db-types gate reliably | `pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build` | todo |
| 17 | Stage 6 | S6-T02 | Vercel env + runbook parity | Preview/prod env docs complete with smoke checks and rollback notes | `rg -n "env|smoke|rollback" RUNBOOK.md README.md` | todo |
| 18 | Stage 6 | S6-T03 | Release rollback + incident checklist | Non-trivial deploy rollback steps documented and testable | `rg -n "rollback|incident" RUNBOOK.md` | todo |
| 19 | Stage 7 | S7-T01 | Execute full UAT checklist | Text/image/audio/file/chips pass criteria recorded with defects | `rg -n "Pass|Fail|build_id" docs/UAT_VERCEL.md` | todo |
| 20 | Stage 7 | S7-T02 | Accessibility gate closure | Keyboard/labels/live regions/contrast critical issues resolved | `pnpm run test:e2e -g accessibility` | todo |
| 21 | Stage 7 | S7-T03 | Privacy/export/delete-account closure | Data export and account deletion flows implemented + documented | `pnpm run test -- src/app/(app)/profile` | todo |
| 22 | Stage 7 | S7-T04 | Closed beta and launch checklist | Beta feedback triaged and launch checklist fully green | `rg -n "launch checklist|beta" docs/BUILD_PLAN.md docs/TASKS.md` | todo |

### Current active task
- **Next to execute:** `S5-T01` (Expand prompt eval coverage).
- **Owner:** Engineering
- **Dependencies:** `S4-T03` Profile memory inspector is productionized with focused component and loader tests.

### S4-T03 closure status (2026-05-14)
- `/profile` now renders through `ProfileMemoryDashboard`, with user-scoped memory layer cards, inline save for safe singleton layers, read-only treatment for temporal/semantic layers, empty state, and recent audit history.
- `loadProfileMemoryInspector` scopes `memories` and `memories_history` queries to the authenticated user, maps database rows into a stable view model, and sorts layers in a predictable product order.
- Inline saves are intentionally limited to `profile/main` and `patterns/main` via the existing authenticated `/api/memory` write contract.
- Focused test evidence is recorded in `docs/TEST_EVIDENCE.md`.

### S4-T02 closure status (2026-05-14)
- `/trends` now renders through `TrendsDashboard`, with Week / Month / 3-Month period tabs, summary cards, calorie trend chart, macro distribution chart, period radar, macro averages, streak card content, insight cards, and empty state.
- `loadTrendsData` scopes confirmed meal rows to the authenticated user and selected IST period, then aggregates daily kcal/protein/carbs/fat/fiber, consistency %, averages, and current/longest streaks.
- Focused test evidence is recorded in `docs/TEST_EVIDENCE.md`.

### S4-T01 closure status (2026-05-14)
- `/today` now renders through `TodayDashboard`, with production summary cards, daily kcal range/lead totals, macro totals, meal cards, empty state, correction CTAs, assumptions, confidence, and safety flags.
- `loadTodayMeals` now scopes the Supabase query to the authenticated user and current IST day bounds, selects nutrition/detail fields needed by the UI, orders by latest logged meal, and redirects unauthenticated users via the page.
- `/today` uses the same IST calendar-date source for query bounds, date labels, and previous/next navigation, including UTC midnight boundary regression coverage.
- Focused test evidence is recorded in `docs/TEST_EVIDENCE.md`.

### S3-T03 closure status (2026-05-14)
- `/api/push` returns the configured public VAPID key and fails closed when push is not configured.
- `/api/push/subscribe` validates HTTPS browser `PushSubscription` payloads, requires auth, cleans up same-endpoint ownership from other users, and upserts by `user_id + endpoint`.
- `/api/push/unsubscribe` validates endpoints, requires auth, deletes only the signed-in user's matching endpoint, and is idempotent when absent.
- Focused test evidence is recorded in `docs/TEST_EVIDENCE.md`.


### S3-T01 closure status (2026-05-12)
- `/api/meals` collection route is implemented with authenticated `GET` and `POST` handlers.
- `/api/meals/[id]` item route is implemented with authenticated `PATCH` and `DELETE` handlers.
- Route tests cover safe envelopes, request IDs, validation failure, user scoping, cross-user 404 behavior, and unauthenticated rejection.

### S3-T02 closure status (2026-05-12)
- `/api/memory` route is implemented with authenticated `GET` and `PUT` handlers.
- Default `GET` returns the signed-in user's `profile/main` and `patterns/main`; filtered reads support valid memory layers and keys.
- `PUT` writes are intentionally restricted to `profile/main` and `patterns/main`, with server-side `user_id` scoping and RLS-backed Supabase access.
- Route tests cover safe envelopes, validation failures, user scoping, unauthorized rejection, disallowed write layers, and storage error sanitization.


### S1-T01 execution checklist

1. Confirm local prerequisites:
   - Supabase local stack running
   - Playwright browsers installed
   - required env vars present in `.env.local`
2. Run scoped static checks first:
   - `pnpm run lint`
   - `pnpm run typecheck`
3. Run onboarding-focused unit coverage:
   - `pnpm run test -- src/components/onboarding/ChatOnboardingFlow.test.tsx src/lib/auth/onboardingState.test.ts`
4. Run onboarding E2E gate:
   - `pnpm run test:e2e -g onboarding`
5. If E2E fails, triage by layer:
   - route guard redirect mismatch
   - onboarding confirm/persist path
   - transient UI state timing (loading/retry)
6. Exit criteria for `S1-T01` done:
   - onboarding E2E passes in CI
   - non-onboarded and onboarded redirect behavior is deterministic
   - failures/retries do not bypass confirm gate

### S1-T03 closure status (2026-05-11)
- Loading/error/retry onboarding states now have deterministic unit test coverage.
- Retry UX and pending-save disabled states were validated in `ChatOnboardingFlow` tests.


## Testing ownership model (team-run, PM verifies via Vercel UI)

### Team responsibilities (engineering + QA automation)
- Run all local/internal automated checks on every task PR: install, lint, typecheck, unit tests, integration tests, build, and scoped E2E.
- Capture command outputs in PR body and flag pass/fail/blocked status before requesting PM review.
- Triage and fix failures without asking PM to run local commands.
- Deploy Preview to Vercel and provide the preview URL + focused test script for PM flow checks.

### PM responsibilities (no local testing)
- Verify expected user flows in Vercel Preview UI only (onboarding/chat/today/trends/profile as relevant to task).
- Report UX or behavior mismatches from preview interaction (screenshots + step numbers).
- Provide product sign-off decisions when behavior is acceptable for the stage gate.

### Standard automated test command set (team-run)
1. `pnpm install --frozen-lockfile`
2. `pnpm run lint`
3. `pnpm run typecheck`
4. `pnpm run test`
5. `pnpm run build`
6. `pnpm run test:e2e -g onboarding` (or task-scoped E2E target)
7. `pnpm run db:types:check` (when DB-related files touched)
8. `pnpm run eval:prompts` (when prompt/agent behavior touched)

### Vercel UI verification flow
1. Engineer posts Vercel preview URL + exact test steps tied to task acceptance criteria.
2. PM validates only visible behavior in preview UI (no CLI/local setup).
3. PM logs pass/fail against checklist and returns any UX/flow defects.
4. Engineer resolves defects and reposts updated preview for re-check.

### Immediate next execution queue
- **Current active:** `S4-T03` build profile memory inspector
- **Next:** `S5-T01` expand prompt eval coverage
- **Then:** `S5-T02` add AI safety adversarial tests

### Dependencies requiring PM/founder action
- Define Stage 2 meal-log MVP acceptance criteria before `S2-T01` sign-off.
- Provide first beta test account matrix and scenario priorities before Stage 7 UAT gate.
- Approve safety/copy/privacy changes when escalated by engineering.


## Phase status snapshot (as of 2026-05-09)

| Phase | Status | Remaining work to close phase |
|---|---|---|
| Phase 0 (Foundation) | mostly done | keep CI/doc parity stable and maintain DB type freshness gate |
| Phase 1 (Onboarding) | **in progress** | close `S1-T03` (onboarding failure/recovery UX deterministic completion) |
| Phase 2 (Chat & Meal Logging) | partial | close `S2-T01`, `S2-T02`, `S2-T03` (hybrid nutrition + meal confirm/save reliability + chat contract hardening) |
| Phase 3 (Memory) | partial/planned | close `S3-T02` plus profile memory editing and visibility contract completion |
| Phase 4 (Trends) | planned | close `S4-T02` trends charts/insights production readiness |
| Phase 5 (Nudges) | planned | close `S3-T03` + downstream nudges delivery and policy hardening |
| Phase 6 (Polish/Beta) | planned | close `S5-*`, `S6-*`, and `S7-*` gates before launch |

### Remaining tasks to finish Phase 1 specifically
1. `S1-T03` — close onboarding failure/recovery UX with accessible deterministic states.

### Remaining phases and task groups (post-Phase 1)
- **Phase 2:** `S2-T01`, `S2-T02`, `S2-T03`
- **Phase 3:** `S3-T01`, `S3-T02`, `S3-T03`
- **Phase 4:** `S4-T01`, `S4-T02`, `S4-T03`
- **Phase 5:** `S5-T01`, `S5-T02`, `S5-T03`
- **Phase 6/Launch readiness:** `S6-T01`, `S6-T02`, `S6-T03`, `S7-T01`, `S7-T02`, `S7-T03`, `S7-T04`


### S1-T01 closure status (2026-05-11)
- `Onboarding E2E gate` is now green in CI and S1-T01 is closed.
- Local environment limitations (browser download restrictions) remain documented for reference only; CI is the source-of-truth gate for onboarding E2E pass/fail.
