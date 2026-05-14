# Test Evidence Ledger

This file is the repo-local audit trail for meaningful automated and manual verification runs. It is intentionally committed so Forge/Hermes and any other codebase agent can recover what was tested, when, why, and with which command.

## Rules

- Add a new dated entry for every task-level verification pass or known-blocked run.
- Include exact commands, pass/fail/blocked status, and the feature/task being verified.
- Do not paste secrets, raw auth tokens, production user emails, or personal health data.
- For large Playwright artifacts, commit only the summary here and keep raw reports in ignored `playwright-report/` or CI artifacts.
- If a failure is accepted temporarily, link the follow-up task in `docs/TASKS.md`.

## 2026-05-14 — S6-T01 CI parity gates

- **Task:** `S6-T01` — Finalize CI parity gates.
- **Scope verified:** CI/local parity for lint, typecheck, generated database types, unit/component tests, prompt eval baseline, production build, and a scoped Chromium Playwright smoke.
- **TDD evidence:** Added `src/lib/devex/ci-parity.test.ts`; red run failed because `test:e2e:ci` / `ci:parity` scripts were missing and GitHub Actions did not run the scoped E2E gate through the parity script. Implementation then passed focused/all Vitest and static/build gates.
- **Changed gates:**
  - `.github/workflows/ci.yml` now separates app gates from Docker/Supabase gates so Supabase startup issues do not hide lint/typecheck/test/build signal.
  - The Docker/Supabase job starts the local Supabase stack, exports the runtime local anon key via `supabase status -o env`, runs `pnpm run db:types:check`, installs Chromium, and runs `pnpm run test:e2e:ci`.
  - CI app gates run `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `pnpm run eval:prompts`, and `pnpm run build`.
  - `supabase/config.toml` disables local email confirmations so signup/onboarding E2E can exercise the intended route without SMTP.
  - `package.json` now exposes `pnpm run ci:parity` as the local gate-set mirror, `pnpm run test:e2e:ci` as the Docker/Supabase-backed CI Playwright subset, and `pnpm run test:e2e:smoke` as a no-DB redirect smoke useful in this Hermes environment.
- **Focused test command:** `pnpm run test -- src/lib/devex/ci-parity.test.ts --reporter=dot`
- **Focused/all Vitest result:** PASS — Vitest invocation reported 33 test files / 160 tests passed; `src/lib/devex/ci-parity.test.ts` passed 2/2.
- **Prompt eval result:** PASS — onboarding-parser 3/3, router 3/3, nutrition-estimator 3/3, coach 3/3, safety-adversarial 6/6; overall 18/18 = 100%.
- **Static/build command:** `pnpm run typecheck && pnpm run lint && pnpm run build`
- **Static/build result:** PASS — TypeScript, ESLint, and Next.js production build completed with exit code 0.
- **Scoped no-DB E2E smoke command:** `pnpm run test:e2e:smoke`
- **Scoped no-DB E2E smoke result:** PASS — Chromium ran 1 test: protected `/chat` redirects unauthenticated users to `/login`.
- **Docker-gated CI E2E command:** `pnpm run test:e2e:ci`
- **Docker-gated CI E2E scope:** Chromium auth/onboarding subset, including the redirect smoke and onboarding-tagged journeys; expected to run in GitHub Actions after the local Supabase stack starts.
- **Docker-gated command:** `pnpm run db:types:check`
- **Docker-gated local result:** BLOCKED in this Hermes environment because Docker is not installed (`docker: command not found`). CI initially caught stale generated database types; `src/types/database.ts` was regenerated from the GitHub Actions local Supabase stack artifact and committed. The latest GitHub Actions run is the source of truth for this gate.
- **Relevant files updated:**
  - `.github/workflows/ci.yml`
  - `package.json`
  - `src/lib/devex/ci-parity.test.ts`
  - `scripts/db-types-check.mjs`
  - `src/types/database.ts`
  - `supabase/config.toml`
  - `TESTING.md`
  - `docs/DEPLOYMENT.md`
  - `docs/TASKS.md`
  - `docs/TEST_EVIDENCE.md`
- **Not covered in this run:** full Playwright journey suite and production Vercel smoke; S6-T01 only closes parity gates, not the later env/runbook parity task.

## 2026-05-14 — Production UI dogfood sweep

- **Task:** Broad production UI dogfood pass after targeted route smokes.
- **Target:** `https://poshisu.vercel.app`
- **Scope:** Authenticated Playwright pass over `/login`, `/chat`, `/today`, `/trends`, `/profile`, plus `/onboarding` route-guard behavior; desktop 1440×1000 and mobile 390×844.
- **Result:** PASS for authenticated login and route rendering; findings recorded for product/UI follow-up.
- **Real findings:**
  - High: `/chat` has no visible message composer/free-form input; current production chat page is a minimal meal-confirmation card.
  - Medium: mobile `/trends` fixed bottom nav overlaps content and likely creates horizontal overflow in lower chart cards.
  - Low: repeated Chromium Permissions-Policy warning for unsupported `web-share` directive.
- **Noise de-scoped:** `_rsc` `net::ERR_ABORTED` prefetch/navigation cancellations and hidden Next server-action input label heuristics were not treated as product bugs without further manual/axe verification.
- **Evidence:** `docs/dogfood/2026-05-14-production-ui/report.md`, `summary.json`, and screenshot artifacts under `docs/dogfood/2026-05-14-production-ui/screenshots/`.
- **Not covered:** full human UX/a11y audit, live model quality, real photo/file/voice flows, or end-to-end free-form chat safety warning because the production chat UI lacks a composer.

## 2026-05-14 — S5-T03 Deterministic safety policy tests

- **Task:** `S5-T03` — Lock deterministic safety policy tests.
- **Scope verified:** Deterministic safety policy behavior for:
  - allergy conflict detection with ingredient synonyms, including groundnut/peanut, tree nuts, and dairy;
  - condition conflict detection for common Indian high-risk foods like jaggery chai, fruit juice, papad, and pickle;
  - hard `blocked` outcome and user-facing `blockingReasons` when declared allergies/conditions conflict with a meal/recommendation;
  - orchestrator fallback safety checks against raw meal text when deterministic food parsing misses an allergen synonym;
  - `safeAlternatives` that avoid the triggered allergen and condition conflict patterns;
  - non-conflicting low-risk meals remain unblocked.
- **Evidence:** TDD red run failed because `blocked`, `blockingReasons`, richer synonym triggers, and `safeAlternatives` did not exist; implementation then passed focused Vitest, prompt eval, static gates, and production build locally.
- **Focused test command:** `pnpm run test -- src/lib/safety/check.test.ts src/lib/agents/orchestrator.test.ts --reporter=dot`
- **Focused test result:** PASS — filtered Vitest invocation reported 32 test files / 158 tests passed; `src/lib/safety/check.test.ts` passed 6/6 and `src/lib/agents/orchestrator.test.ts` passed 6/6.
- **Full local verification command:** `pnpm run test -- src/lib/safety/check.test.ts src/lib/agents/orchestrator.test.ts --reporter=dot && pnpm run eval:prompts && pnpm run typecheck && pnpm run lint && pnpm run build`
- **Prompt eval result:** PASS — onboarding-parser 3/3, router 3/3, nutrition-estimator 3/3, coach 3/3, safety-adversarial 6/6; overall 18/18 = 100%.
- **Static/build result:** PASS — TypeScript, ESLint, and Next.js production build completed with exit code 0.
- **Relevant files updated:**
  - `src/lib/safety/check.ts`
  - `src/lib/safety/check.test.ts`
  - `src/lib/safety/allergens.ts`
  - `src/lib/safety/conditions.ts`
  - `src/lib/agents/orchestrator.ts`
  - `src/lib/agents/orchestrator.test.ts`
  - `docs/TASKS.md`
  - `docs/TEST_EVIDENCE.md`
- **Not covered in this run:** live model diet-coaching behavior, clinician-grade dietary advice, and broad medical personalization; this is deterministic beta safety gating only.

## 2026-05-14 — S5-T02 AI safety adversarial evals

- **Task:** `S5-T02` — Add AI safety adversarial tests.
- **Scope verified:** Deterministic adversarial prompt-eval suite for:
  - shared safety-rule override hierarchy against conflicting user instructions;
  - router prompt-contract classification-only behavior under prompt-injection/tool-misuse attempts;
  - coach hallucination boundaries when data is insufficient;
  - nutrition-estimator boundaries against calorie/macro/micronutrient hallucination;
  - output-format/tool-call constraints across router, nutrition estimator, and onboarding parser;
  - self-harm/safety-concern routing prompt coverage.
- **Evidence:** TDD red run failed because the `safety-adversarial` suite and required case IDs did not exist; implementation then passed focused Vitest, prompt eval, static gates, and production build locally.
- **Focused test command:** `pnpm run test -- src/lib/evals/prompt-evals.test.ts --reporter=dot`
- **Focused test result:** PASS — Vitest invocation reported 32 test files / 153 tests passed in this filtered run invocation.
- **Prompt eval command:** `pnpm run eval:prompts`
- **Prompt eval result:** PASS — onboarding-parser 3/3, router 3/3, nutrition-estimator 3/3, coach 3/3, safety-adversarial 6/6; overall 18/18 = 100%.
- **Static/build commands:** `pnpm run typecheck && pnpm run lint && pnpm run build`
- **Static/build result:** PASS — TypeScript, ESLint, and Next.js production build completed with exit code 0.
- **Relevant files updated:**
  - `src/lib/evals/prompt-evals.ts`
  - `src/lib/evals/prompt-evals.test.ts`
  - `docs/TASKS.md`
  - `docs/TEST_EVIDENCE.md`
- **Behavior covered:** `pnpm run eval:prompts` now fails closed if any adversarial prompt-safety case falls below threshold and prints the failed suite/case through the existing CLI failure reporting.
- **Not covered in this run:** live LLM jailbreak scoring or runtime self-harm/orchestrator routing behavior; deterministic allergen/condition policy tests are deferred to `S5-T03`.

## 2026-05-14 — S5-T01 Prompt eval coverage

- **Task:** `S5-T01` — Expand prompt eval coverage.
- **Scope verified:** Deterministic prompt-eval harness and baseline tracking for:
  - onboarding parser extraction/clarification contract;
  - router/orchestrator meal vs fallback behavior;
  - deterministic nutrition-estimator confidence/range fallbacks;
  - coach prompt grounding/recommendation contract and current agent intent return.
- **Evidence:** TDD red run failed because `src/lib/evals/prompt-evals.ts` did not exist; implementation then passed focused Vitest, prompt eval, static gates, and production build locally.
- **Focused test command:** `pnpm run test -- src/lib/evals/prompt-evals.test.ts --reporter=dot`
- **Focused test result:** PASS — Vitest invocation reported 32 test files / 152 tests passed in this filtered run invocation.
- **Prompt eval command:** `pnpm run eval:prompts`
- **Prompt eval result:** PASS — onboarding-parser 3/3, router 3/3, nutrition-estimator 3/3, coach 3/3; overall 12/12 = 100%.
- **Static/build commands:** `pnpm run typecheck && pnpm run lint && pnpm run build`
- **Static/build result:** PASS — TypeScript, ESLint, and Next.js production build completed with exit code 0.
- **Relevant files added/updated:**
  - `src/lib/evals/prompt-evals.ts`
  - `src/lib/evals/prompt-evals.test.ts`
  - `scripts/eval-prompts.ts`
  - `package.json` / `pnpm-lock.yaml` (`tsx` script runner)
- **Behavior covered:** The prompt-eval script now exits non-zero on threshold failure and prints stable per-suite baseline output suitable for commit messages and future prompt-change comparisons.
- **Not covered in this run:** live LLM scoring; adversarial prompt-injection/hallucination/tool-misuse evals are deferred to `S5-T02`.

## 2026-05-14 — S4-T03 Profile memory inspector

- **Task:** `S4-T03` — Build profile memory inspector.
- **Scope verified:** Server loader and rendered profile memory dashboard for:
  - authenticated user-scoped reads from `memories` and `memories_history`;
  - stable layer ordering and layer metadata mapping;
  - profile/pattern singleton inline edits through `/api/memory`;
  - read-only handling for temporal/context/semantic layers;
  - empty memory state;
  - recent audit snapshot display.
- **Evidence:** TDD red run failed because `src/lib/memory/inspector.ts` and `ProfileMemoryDashboard` did not exist; implementation then passed Vitest plus static and production build gates locally.
- **Focused test command:** `pnpm run test -- src/lib/memory/inspector.test.ts src/app/'(app)'/profile/ProfileMemoryDashboard.test.tsx --reporter=dot`
- **Focused test result:** PASS — Vitest invocation reported 31 test files / 148 tests passed in this filtered run invocation.
- **Static/build commands:** `pnpm run typecheck && pnpm run lint && pnpm run build`
- **Static/build result:** PASS — TypeScript, ESLint, and Next.js production build completed with exit code 0 and listed `/profile` as a dynamic route.
- **Relevant focused tests added:**
  - `src/lib/memory/inspector.test.ts`
  - `src/app/(app)/profile/ProfileMemoryDashboard.test.tsx`
- **Behavior covered:**
  - Loader returns `null` user with empty memory state for unauthenticated sessions so the page can redirect.
  - Loader scopes both memory and history queries by `user_id`.
  - Dashboard renders memory cards, version badges, read-only labels, expiry context, editable text areas for safe singleton layers, successful inline save status, and audit history.
- **Not covered in this run:** destructive privacy/export/delete-account flows beyond this inspector slice.
- **Production smoke:** PASS after push on `https://poshisu.vercel.app` using the local E2E account — login redirected to `/chat`, authenticated `/profile` loaded the new Memory inspector, memory/audit copy was visible, the old placeholder copy was absent, and no browser console/page errors were captured.

## 2026-05-14 — S3-T03 push subscription lifecycle

- **Task:** `S3-T03` — Implement `/api/push` subscription lifecycle.
- **Scope verified:** API route handlers and request/response contracts for:
  - `GET /api/push`
  - `POST /api/push/subscribe`
  - `POST /api/push/unsubscribe`
- **Evidence:** Vitest run completed locally.
- **Command:** `pnpm run test -- src/app/api/push`
- **Result:** PASS — 24 test files / 129 tests passed in this filtered run invocation.
- **Static verification commands:** `pnpm run typecheck && pnpm run lint`
- **Static verification result:** PASS — TypeScript `tsc --noEmit` and `eslint src` completed with exit code 0.
- **Build command:** `pnpm run build`
- **Build result:** PASS — Next.js 16.2.4 production build compiled successfully and listed `/api/push`, `/api/push/subscribe`, and `/api/push/unsubscribe` as dynamic routes.
- **Relevant focused tests added:**
  - `src/app/api/push/route.test.ts`
  - `src/app/api/push/subscribe/route.test.ts`
  - `src/app/api/push/unsubscribe/route.test.ts`
- **Behavior covered:**
  - Public VAPID key returns only when configured; missing key fails closed with `PUSH_NOT_CONFIGURED`.
  - Authenticated subscribe upserts by `user_id + endpoint` and stores browser delivery material (`endpoint`, `p256dh`, `auth`, `user_agent`, `last_used_at`).
  - Duplicate subscribe updates an existing user+endpoint instead of creating duplicates.
  - Same push endpoint is cleaned up from other users before current ownership is saved.
  - Invalid/non-HTTPS payloads and malformed JSON are rejected before storage writes/deletes.
  - Unauthenticated/auth-error subscribe/unsubscribe attempts return `UNAUTHORIZED`.
  - Unsubscribe deletes only the authenticated user's matching endpoint and is idempotent when absent.
  - Storage failures return safe envelopes without leaking raw database errors.
- **Not covered in this run:** live browser permission flow, real Web Push delivery to Chrome/iOS, Vercel preview smoke test.

## 2026-05-14 — S4-T01 Today page productionization

- **Task:** `S4-T01` — Productionize Today page.
- **Scope verified:** Server loader and rendered Today dashboard for:
  - authenticated daily meal query scoped to current IST day and signed-in user;
  - empty state;
  - daily kcal lead/range totals;
  - macro total cards;
  - meal cards with correction CTAs, assumptions, confidence, and safety flags.
- **Evidence:** Vitest run plus static and production build gates completed locally.
- **Command:** `pnpm run test -- src/app/\(app\)/today/TodayDashboard.test.tsx src/lib/meals/today.test.ts && pnpm run typecheck && pnpm run lint && pnpm run build`
- **Result:** PASS — Vitest invocation reported 26 test files / 133 tests passed; TypeScript, ESLint, and Next.js production build completed with exit code 0.
- **Relevant focused tests added:**
  - `src/app/(app)/today/TodayDashboard.test.tsx`
  - `src/lib/meals/today.test.ts`
- **Behavior covered:**
  - Dashboard renders mobile/desktop-friendly summary grids using real meal nutrition fields.
  - Empty Today state sends the user to Chat to log a meal.
  - Kcal lead/range and macro cards aggregate across meals.
  - Meal cards expose correction actions via `/chat?mealId=...&mode=correct`.
  - Loader and page date labels use one IST calendar-date source, including UTC midnight boundary regression coverage.
- **Not covered in this run:** live Vercel browser smoke test with a real Supabase session; visual regression screenshots; actual edit/delete UI beyond correction-link routing.

## 2026-05-14 — S4-T02 Trends page productionization

- **Task:** `S4-T02` — Productionize Trends page.
- **Scope verified:** Server loader and rendered Trends dashboard for:
  - Week / Month / 3-Month period tabs;
  - authenticated confirmed-meal query scoped to selected IST period and signed-in user;
  - daily kcal/protein/carbs/fat/fiber aggregation;
  - consistency, average kcal/protein/fiber, and current/longest streak summary;
  - calorie trend, macro distribution, and period radar chart-style panels;
  - insight cards and honest empty state.
- **Evidence:** TDD red run failed because `src/lib/trends.ts` and `TrendsDashboard` did not exist; implementation then passed Vitest plus static and production build gates locally.
- **Focused test command:** `pnpm run test -- src/app/\(app\)/trends/TrendsDashboard.test.tsx src/lib/trends.test.ts`
- **Focused test result:** PASS — 28 test files / 137 tests passed in this filtered run invocation.
- **Static/build commands:** `pnpm run typecheck && pnpm run lint && pnpm run build`
- **Static/build result:** PASS — TypeScript, ESLint, and Next.js production build completed with exit code 0 and listed `/trends` as dynamic route.
- **Relevant focused tests added:**
  - `src/app/(app)/trends/TrendsDashboard.test.tsx`
  - `src/lib/trends.test.ts`
- **Behavior covered:**
  - Dashboard renders period navigation, summary cards, charts, streaks, insights, and empty state.
  - Loader queries confirmed meals by `user_id`, `user_confirmed`, selected IST `logged_at` bounds, and ascending `logged_at` order.
  - Invalid period/date params fall back to Week and current IST calendar date.
- **Not covered in this run:** live Vercel browser smoke test with a real Supabase session; visual regression screenshots; Coach-agent generated narrative insights; materialized analytics-view refresh behavior.

## 2026-05-14 — Post-review hardening after S4-T02

- **Scope verified:** Review-follow-up fixes before final deploy:
  - Today loader now filters to `user_confirmed = true`, matching Trends and confirmed-meal analytics semantics.
  - Push subscribe now returns the standard safe error envelope if the admin cleanup client cannot be configured, instead of throwing an uncaught server error.
- **Command:** `pnpm run test -- src/app/\(app\)/trends/TrendsDashboard.test.tsx src/lib/trends.test.ts src/lib/meals/today.test.ts src/app/api/push/subscribe/route.test.ts src/lib/meals/confirm-save.integration.test.ts && pnpm run typecheck && pnpm run lint && pnpm run build`
- **Result:** PASS — Vitest invocation reported 28 test files / 138 tests passed; TypeScript, ESLint, and Next.js production build completed with exit code 0.
- **Production smoke status:** Login to `https://poshisu.vercel.app` with the local E2E account succeeds, but authenticated `/trends` redirects to `/onboarding`. Completing onboarding in production hits a server-side 500, so visual `/trends` smoke remains blocked until Vercel logs/access or an already-onboarded smoke account is available.

## 2026-05-14 — Onboarding completion 500 regression

- **Issue:** Live onboarding completion on `https://poshisu.vercel.app/onboarding` returned HTTP 500 on submit after the confirmation checkbox was checked.
- **Likely root cause fixed:** `completeOnboardingAction` assumed a matching `public.users` row already existed for the authenticated Supabase user. If the auth trigger/backfill missed that row, the initial `.single()` lookup failed and onboarding could not complete.
- **Fix:** Onboarding completion now uses `.maybeSingle()` for the public user row, creates the missing `users` row with a server-only Supabase admin client from authenticated user metadata/email when absent, then proceeds with `user_profiles`, `memories`, and `onboarded_at` writes.
- **Regression coverage added:** `src/app/(onboarding)/actions.test.ts` now covers the missing public user-row path and verifies onboarding completes after creating the row.
- **Verification command:** `pnpm run test -- src/app/\(onboarding\)/actions.test.ts --reporter=dot && pnpm run typecheck && pnpm run lint && pnpm run build`
- **Verification result:** PASS — Vitest invocation reported 28 test files / 139 tests passed; TypeScript, ESLint, and Next.js production build completed with exit code 0.
- **Live smoke status:** pending redeploy of this fix, then repeat onboarding completion and `/trends` smoke on the Vercel app.


## 2026-05-14 — Onboarding memory audit RLS production fix

- **Issue:** Vercel production logs for `POST /onboarding` showed `OnboardingPersistenceError: Failed to save profile memory: new row violates row-level security policy for table "memories_history"` with digest `3643993725`.
- **Root cause:** `public.memories` has an audit trigger that snapshots previous memory versions into `public.memories_history` on update/delete. `memories_history` had RLS enabled with only a SELECT policy, so onboarding retries that upserted an existing `profile/main` memory attempted to insert an audit row and were rejected by RLS.
- **Fix:** Added migration `supabase/migrations/0010_memories_history_insert_policy.sql` creating `memories_history_insert_own` so authenticated users can insert audit snapshots for their own `user_id`.
- **Regression coverage added:** `src/lib/db/migrations.test.ts` asserts the migration grants `for insert` on `public.memories_history` with `with check (auth.uid() = user_id)`.
- **Verification command:** `pnpm run test -- src/lib/db/migrations.test.ts src/app/\(onboarding\)/actions.test.ts --reporter=dot && pnpm run typecheck && pnpm run lint && pnpm run build`
- **Verification result:** PASS — Vitest invocation reported 29 test files / 140 tests passed; TypeScript, ESLint, and Next.js production build completed with exit code 0.
- **Production action needed:** Apply the migration to the production Supabase database, then redeploy/smoke-test onboarding and `/trends`.

## 2026-05-14 — Onboarding final-validation recovery hardening

- **Issue:** The final onboarding confirmation step could block a valid profile when the conditions answer was typed as `no`/natural no-condition phrasing, and client-side schema failures used a generic non-actionable message.
- **Fix:** `ChatOnboardingFlow` now normalizes common no-condition/no-diet answers before schema validation, formats Zod validation failures into field-specific recovery guidance instead of the generic “I still need a few details...” message, and disables unfinished photo/camera/file/voice affordances with coming-soon copy instead of pretending placeholder capture is active.
- **Regression coverage added:** `src/components/onboarding/ChatOnboardingFlow.test.tsx` covers exact `no`, natural `no medical conditions`, field-specific age validation recovery, and disabled coming-soon states for unfinished media capture.
- **Verification command:** `pnpm run test -- src/components/onboarding/ChatOnboardingFlow.test.tsx --reporter=dot && pnpm run typecheck && pnpm run lint && pnpm run build`
- **Verification result:** PASS — Vitest invocation reported 29 test files / 143 tests passed; TypeScript, ESLint, and Next.js production build completed with exit code 0.
- **Review:** Subagent review found no blockers; follow-up hardening for natural no-condition variants and non-highlighted copy was applied before final verification.
- **Production smoke:** PASS after push on `https://poshisu.vercel.app` using the local E2E account — login redirected to `/chat`, authenticated `/trends` loaded, visiting `/onboarding` as an onboarded user route-guarded back to `/chat`, no browser console/page errors were captured, and the generic validation error string was not present.
