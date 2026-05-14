# Test Evidence Ledger

This file is the repo-local audit trail for meaningful automated and manual verification runs. It is intentionally committed so Forge/Hermes and any other codebase agent can recover what was tested, when, why, and with which command.

## Rules

- Add a new dated entry for every task-level verification pass or known-blocked run.
- Include exact commands, pass/fail/blocked status, and the feature/task being verified.
- Do not paste secrets, raw auth tokens, production user emails, or personal health data.
- For large Playwright artifacts, commit only the summary here and keep raw reports in ignored `playwright-report/` or CI artifacts.
- If a failure is accepted temporarily, link the follow-up task in `docs/TASKS.md`.

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
- **Fix:** Onboarding completion now uses `.maybeSingle()` for the public user row, creates the missing `users` row from authenticated user metadata/email when absent, then proceeds with `user_profiles`, `memories`, and `onboarded_at` writes.
- **Regression coverage added:** `src/app/(onboarding)/actions.test.ts` now covers the missing public user-row path and verifies onboarding completes after creating the row.
- **Verification command:** `pnpm run test -- src/app/\(onboarding\)/actions.test.ts --reporter=dot && pnpm run typecheck && pnpm run lint && pnpm run build`
- **Verification result:** PASS — Vitest invocation reported 28 test files / 139 tests passed; TypeScript, ESLint, and Next.js production build completed with exit code 0.
- **Live smoke status:** pending redeploy of this fix, then repeat onboarding completion and `/trends` smoke on the Vercel app.

