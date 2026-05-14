     1|# Test Evidence Ledger
     2|
     3|This file is the repo-local audit trail for meaningful automated and manual verification runs. It is intentionally committed so Forge/Hermes and any other codebase agent can recover what was tested, when, why, and with which command.
     4|
     5|## Rules
     6|
     7|- Add a new dated entry for every task-level verification pass or known-blocked run.
     8|- Include exact commands, pass/fail/blocked status, and the feature/task being verified.
     9|- Do not paste secrets, raw auth tokens, production user emails, or personal health data.
    10|- For large Playwright artifacts, commit only the summary here and keep raw reports in ignored `playwright-report/` or CI artifacts.
    11|- If a failure is accepted temporarily, link the follow-up task in `docs/TASKS.md`.
    12|
    13|## 2026-05-14 — S3-T03 push subscription lifecycle
    14|
    15|- **Task:** `S3-T03` — Implement `/api/push` subscription lifecycle.
    16|- **Scope verified:** API route handlers and request/response contracts for:
    17|  - `GET /api/push`
    18|  - `POST /api/push/subscribe`
    19|  - `POST /api/push/unsubscribe`
    20|- **Evidence:** Vitest run completed locally.
    21|- **Command:** `pnpm run test -- src/app/api/push`
    22|- **Result:** PASS — 24 test files / 129 tests passed in this filtered run invocation.
    23|- **Static verification commands:** `pnpm run typecheck && pnpm run lint`
    24|- **Static verification result:** PASS — TypeScript `tsc --noEmit` and `eslint src` completed with exit code 0.
    25|- **Build command:** `pnpm run build`
    26|- **Build result:** PASS — Next.js 16.2.4 production build compiled successfully and listed `/api/push`, `/api/push/subscribe`, and `/api/push/unsubscribe` as dynamic routes.
    27|- **Relevant focused tests added:**
    28|  - `src/app/api/push/route.test.ts`
    29|  - `src/app/api/push/subscribe/route.test.ts`
    30|  - `src/app/api/push/unsubscribe/route.test.ts`
    31|- **Behavior covered:**
    32|  - Public VAPID key returns only when configured; missing key fails closed with `PUSH_NOT_CONFIGURED`.
    33|  - Authenticated subscribe upserts by `user_id + endpoint` and stores browser delivery material (`endpoint`, `p256dh`, `auth`, `user_agent`, `last_used_at`).
    34|  - Duplicate subscribe updates an existing user+endpoint instead of creating duplicates.
    35|  - Same push endpoint is cleaned up from other users before current ownership is saved.
    36|  - Invalid/non-HTTPS payloads and malformed JSON are rejected before storage writes/deletes.
    37|  - Unauthenticated/auth-error subscribe/unsubscribe attempts return `UNAUTHORIZED`.
    38|  - Unsubscribe deletes only the authenticated user's matching endpoint and is idempotent when absent.
    39|  - Storage failures return safe envelopes without leaking raw database errors.
    40|- **Not covered in this run:** live browser permission flow, real Web Push delivery to Chrome/iOS, Vercel preview smoke test.
    41|
    42|## 2026-05-14 — S4-T01 Today page productionization
    43|
    44|- **Task:** `S4-T01` — Productionize Today page.
    45|- **Scope verified:** Server loader and rendered Today dashboard for:
    46|  - authenticated daily meal query scoped to current IST day and signed-in user;
    47|  - empty state;
    48|  - daily kcal lead/range totals;
    49|  - macro total cards;
    50|  - meal cards with correction CTAs, assumptions, confidence, and safety flags.
    51|- **Evidence:** Vitest run plus static and production build gates completed locally.
    52|- **Command:** `pnpm run test -- src/app/\(app\)/today/TodayDashboard.test.tsx src/lib/meals/today.test.ts && pnpm run typecheck && pnpm run lint && pnpm run build`
    53|- **Result:** PASS — Vitest invocation reported 26 test files / 133 tests passed; TypeScript, ESLint, and Next.js production build completed with exit code 0.
    54|- **Relevant focused tests added:**
    55|  - `src/app/(app)/today/TodayDashboard.test.tsx`
    56|  - `src/lib/meals/today.test.ts`
    57|- **Behavior covered:**
    58|  - Dashboard renders mobile/desktop-friendly summary grids using real meal nutrition fields.
    59|  - Empty Today state sends the user to Chat to log a meal.
    60|  - Kcal lead/range and macro cards aggregate across meals.
    61|  - Meal cards expose correction actions via `/chat?mealId=...&mode=correct`.
    62|  - Loader and page date labels use one IST calendar-date source, including UTC midnight boundary regression coverage.
    63|- **Not covered in this run:** live Vercel browser smoke test with a real Supabase session; visual regression screenshots; actual edit/delete UI beyond correction-link routing.
    64|
    65|## 2026-05-14 — S4-T02 Trends page productionization
    66|
    67|- **Task:** `S4-T02` — Productionize Trends page.
    68|- **Scope verified:** Server loader and rendered Trends dashboard for:
    69|  - Week / Month / 3-Month period tabs;
    70|  - authenticated confirmed-meal query scoped to selected IST period and signed-in user;
    71|  - daily kcal/protein/carbs/fat/fiber aggregation;
    72|  - consistency, average kcal/protein/fiber, and current/longest streak summary;
    73|  - calorie trend, macro distribution, and period radar chart-style panels;
    74|  - insight cards and honest empty state.
    75|- **Evidence:** TDD red run failed because `src/lib/trends.ts` and `TrendsDashboard` did not exist; implementation then passed Vitest plus static and production build gates locally.
    76|- **Focused test command:** `pnpm run test -- src/app/\(app\)/trends/TrendsDashboard.test.tsx src/lib/trends.test.ts`
    77|- **Focused test result:** PASS — 28 test files / 137 tests passed in this filtered run invocation.
    78|- **Static/build commands:** `pnpm run typecheck && pnpm run lint && pnpm run build`
    79|- **Static/build result:** PASS — TypeScript, ESLint, and Next.js production build completed with exit code 0 and listed `/trends` as dynamic route.
    80|- **Relevant focused tests added:**
    81|  - `src/app/(app)/trends/TrendsDashboard.test.tsx`
    82|  - `src/lib/trends.test.ts`
    83|- **Behavior covered:**
    84|  - Dashboard renders period navigation, summary cards, charts, streaks, insights, and empty state.
    85|  - Loader queries confirmed meals by `user_id`, `user_confirmed`, selected IST `logged_at` bounds, and ascending `logged_at` order.
    86|  - Invalid period/date params fall back to Week and current IST calendar date.
    87|- **Not covered in this run:** live Vercel browser smoke test with a real Supabase session; visual regression screenshots; Coach-agent generated narrative insights; materialized analytics-view refresh behavior.
    88|
    89|## 2026-05-14 — Post-review hardening after S4-T02
    90|
    91|- **Scope verified:** Review-follow-up fixes before final deploy:
    92|  - Today loader now filters to `user_confirmed = true`, matching Trends and confirmed-meal analytics semantics.
    93|  - Push subscribe now returns the standard safe error envelope if the admin cleanup client cannot be configured, instead of throwing an uncaught server error.
    94|- **Command:** `pnpm run test -- src/app/\(app\)/trends/TrendsDashboard.test.tsx src/lib/trends.test.ts src/lib/meals/today.test.ts src/app/api/push/subscribe/route.test.ts src/lib/meals/confirm-save.integration.test.ts && pnpm run typecheck && pnpm run lint && pnpm run build`
    95|- **Result:** PASS — Vitest invocation reported 28 test files / 138 tests passed; TypeScript, ESLint, and Next.js production build completed with exit code 0.
    96|- **Production smoke status:** Login to `https://poshisu.vercel.app` with the local E2E account succeeds, but authenticated `/trends` redirects to `/onboarding`. Completing onboarding in production hits a server-side 500, so visual `/trends` smoke remains blocked until Vercel logs/access or an already-onboarded smoke account is available.
    97|
    98|## 2026-05-14 — Onboarding completion 500 regression
    99|
   100|- **Issue:** Live onboarding completion on `https://poshisu.vercel.app/onboarding` returned HTTP 500 on submit after the confirmation checkbox was checked.
   101|- **Likely root cause fixed:** `completeOnboardingAction` assumed a matching `public.users` row already existed for the authenticated Supabase user. If the auth trigger/backfill missed that row, the initial `.single()` lookup failed and onboarding could not complete.
   102|- **Fix:** Onboarding completion now uses `.maybeSingle()` for the public user row, creates the missing `users` row with a server-only Supabase admin client from authenticated user metadata/email when absent, then proceeds with `user_profiles`, `memories`, and `onboarded_at` writes.
   103|- **Regression coverage added:** `src/app/(onboarding)/actions.test.ts` now covers the missing public user-row path and verifies onboarding completes after creating the row.
   104|- **Verification command:** `pnpm run test -- src/app/\(onboarding\)/actions.test.ts --reporter=dot && pnpm run typecheck && pnpm run lint && pnpm run build`
   105|- **Verification result:** PASS — Vitest invocation reported 28 test files / 139 tests passed; TypeScript, ESLint, and Next.js production build completed with exit code 0.
   106|- **Live smoke status:** pending redeploy of this fix, then repeat onboarding completion and `/trends` smoke on the Vercel app.
   107|
   108|

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
