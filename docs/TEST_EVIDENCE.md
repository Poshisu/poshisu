# Test Evidence Ledger

This file is the repo-local audit trail for meaningful automated and manual verification runs. It is intentionally committed so Forge/Hermes and any other codebase agent can recover what was tested, when, why, and with which command.

## Rules

- Add a new dated entry for every task-level verification pass or known-blocked run.
- Include exact commands, pass/fail/blocked status, and the feature/task being verified.
- Do not paste secrets, raw auth tokens, production user emails, or personal health data.
- For large Playwright artifacts, commit only the summary here and keep raw reports in ignored `playwright-report/` or CI artifacts.
- If a failure is accepted temporarily, link the follow-up task in `docs/TASKS.md`.


## 2026-05-15 — S7-T04B-prep Production closed-beta candidate UAT

- **Task:** `S7-T04B-prep` — Deployed beta candidate UAT and evidence capture before real 10-user cohort.
- **Environment:** production `https://poshisu.vercel.app`.
- **Build/SHA:** `dc23344` from merged PR #93 baseline.
- **Tester alias:** `internal-uat-001` using a disposable test account; no raw email committed.
- **Command:** `node /tmp/poshisu_prod_uat.mjs` (one-off Playwright production sweep).
- **Result:** PASS at `2026-05-15T16:32:36Z`.
- **Covered flow:** signup created an immediate session and landed on onboarding; onboarding advanced through name, age, goal, conditions, diet, and meal-time prompts; profile save redirected to `/chat`; `/chat` accepted text meal input; assistant returned a structured meal estimate; confirm-save redirected to `/today`; Today displayed the saved breakfast; `/profile` displayed Privacy & data controls, data export download control, and guarded permanent delete-account area.
- **Scoped modality result:** production `/chat` exposed no usable image/camera, mic/audio, or file upload controls (`image=0`, `mic=0`, `file=0`), so deferred modalities are not accidentally in closed-beta scope. Chat quick-action chips were not visible and remain explicitly outside this beta candidate scope.
- **Console/browser notes:** no page errors; repeated non-blocking browser warning: Permissions-Policy header has unrecognized feature `web-share`.
- **Artifacts:** local screenshots and JSON result captured under `/tmp/poshisu-s7-t04b-uat-2026-05-15T16-32-36-102Z/`; screenshots are intentionally not committed because they include a disposable test account identifier.
- **Remaining owner-blocked gates:** real 10-user beta cohort, support/feedback channel, support owner, privacy/terms/policy approval, Sentry/PostHog/Web Push/backup confirmation, and final go/no-go signoff.

## 2026-05-15 — S7-T04A Closed beta launch checklist

- **Task:** `S7-T04A` — Closed beta launch checklist is documented.
- **Scope verified:** Added `docs/BETA_LAUNCH_CHECKLIST.md` as the beta operating packet with text-first scope, deferred modality handling, cohort plan, feedback triage schema, blocker/major/minor severity rubric, engineering/product/ops launch gates, owner-blocked exception handling, and go/no-go decision template.
- **Honest launch status:** The real 10-user closed beta run is not claimed complete in this PR. `S7-T04B` remains owner-blocked until product/founder recruits/onboards the beta cohort, activates the feedback channel, and records go/no-go evidence.
- **TDD evidence:** Added a docs parity assertion to `src/lib/devex/ci-parity.test.ts`; RED run failed because `docs/BETA_LAUNCH_CHECKLIST.md` did not exist.
- **Focused red command:** `pnpm run test -- src/lib/devex/ci-parity.test.ts --reporter=dot`
- **Focused red result:** FAIL as expected — `docs/BETA_LAUNCH_CHECKLIST.md should exist`.
- **Focused green command:** `pnpm run test -- src/lib/devex/ci-parity.test.ts --reporter=dot`
- **Focused green result:** PASS — `src/lib/devex/ci-parity.test.ts` now passes 6/6 docs parity assertions and the filtered Vitest invocation reported 37 files / 182 tests passed.
- **Reviewer follow-up:** Independent staged-diff review caught a docs contradiction between the new text-first closed beta scope and `docs/MEAL_LOG_MVP_ACCEPTANCE.md`; this PR now marks that file as the future/full multimodal MVP gate and points Stage 7 closed beta scope back to `docs/BETA_LAUNCH_CHECKLIST.md`.
- **Post-review verification command:** `pnpm run test -- src/lib/devex/ci-parity.test.ts --reporter=dot && pnpm run lint && pnpm run typecheck && pnpm run build && pnpm run test:e2e:smoke && git diff --check`
- **Post-review verification result:** PASS — filtered Vitest invocation reported 37 files / 182 tests passed including the expanded beta-scope parity assertion, ESLint passed, TypeScript passed, Next.js production build passed, Chromium unauthenticated `/chat` redirect smoke passed, and whitespace check passed.
- **Relevant files updated:** `docs/BETA_LAUNCH_CHECKLIST.md`, `docs/MEAL_LOG_MVP_ACCEPTANCE.md`, `docs/TASKS.md`, `docs/BUILD_PLAN.md`, `README.md`, `docs/TEST_EVIDENCE.md`, `src/lib/devex/ci-parity.test.ts`.

## 2026-05-15 — S7-T03 Privacy/export/delete-account closure

- **Task:** `S7-T03` — Privacy/export/delete-account closure.
- **Scope verified:** Profile now exposes a user-facing “Privacy & data controls” section with a JSON export link and an explicit `DELETE`-guarded account deletion flow.
- **Server implementation:** Added authenticated `/api/privacy/export` and `/api/privacy/delete-account` routes. Export reads only the signed-in Supabase user’s rows across app-owned user data tables, uses schema-safe ordering columns, includes schema/version/timestamp metadata, and redacts push-subscription endpoint/key/auth material. Delete-account requires exact `DELETE` and calls a service-role-only `delete_account_cascade` RPC that transactionally deletes memory rows, clears non-cascading memory audit history created by memory-delete triggers, and deletes the Supabase auth user so FK cascades remove remaining app data.
- **Safety/UX checks:** UI disables destructive deletion until the exact confirmation is typed, uses visible status/error copy with `aria-live`, and returns safe API envelopes without raw backend details or service-role exposure.
- **Focused TDD command:** `pnpm run test -- src/app/api/privacy/export/route.test.ts src/app/api/privacy/delete-account/route.test.ts src/app/\(app\)/profile/ProfileMemoryDashboard.test.tsx --reporter=dot`
- **Focused TDD result:** PASS — privacy export route passed 3/3, delete-account route passed 5/5, Profile privacy controls passed 2 new UI tests, and the filtered Vitest invocation reported 37 files / 181 tests passed.
- **Typecheck command:** `pnpm run typecheck`
- **Typecheck result:** PASS — `tsc --noEmit` completed with exit code 0 after adding the privacy routes and Profile controls.
- **Full local verification command:** `pnpm run lint && pnpm run typecheck && pnpm run test -- --reporter=dot && pnpm run build && pnpm run test:e2e:smoke && git diff --check`
- **Full local verification result:** PASS — ESLint passed, TypeScript passed, Vitest reported 37 files / 181 tests passed, Next.js production build exposed the new `/api/privacy/delete-account` and `/api/privacy/export` routes, Chromium unauthenticated `/chat` redirect smoke passed, and whitespace check passed.
- **Relevant files updated:** `src/app/api/privacy/export/route.ts`, `src/app/api/privacy/export/route.test.ts`, `src/app/api/privacy/delete-account/route.ts`, `src/app/api/privacy/delete-account/route.test.ts`, `src/app/(app)/profile/ProfileMemoryDashboard.tsx`, `src/app/(app)/profile/ProfileMemoryDashboard.test.tsx`, `src/lib/supabase/admin.ts`, `src/types/database.ts`, `supabase/migrations/0011_privacy_account_delete_rpc.sql`, `docs/TASKS.md`, `docs/TEST_EVIDENCE.md`.

## 2026-05-15 — S7-T02 Accessibility gate closure

- **Task:** `S7-T02` — Accessibility gate closure.
- **Baseline failure:** `pnpm run test:e2e -g accessibility` previously exited `1` with `Error: No tests found`, so the documented accessibility gate did not actually exercise the product.
- **Scope verified:** Playwright accessibility release gate now covers public auth error states, signed-out protected onboarding behavior, and the authenticated onboarding → chat → meal estimate → `/today`/`/trends`/`/profile` route set when the Supabase E2E stack is available.
- **UX/a11y checks:** Tests assert headings/landmarks, explicit form/input labels, inline auth alerts, visible keyboard focus, protected-route redirect UX, disabled “coming soon” media controls, chat transcript/quick-prompt/composer labels, live `role="status"` estimating state, confirm-save CTA visibility, and primary navigation presence.
- **Proof artifacts:** Accessibility tests force Playwright trace/video on and attach full-page screenshots named for each state (`login-accessible-error-state`, `signup-accessible-error-state`, `onboarding-protected-login-state`, `onboarding-authenticated-accessible-state`, `chat-keyboard-ready-state`, `chat-estimate-confirm-save-state`, `today-accessible-route-state`, `trends-accessible-route-state`, `profile-accessible-route-state`). CI uploads `playwright-report/` and `test-results/` as `playwright-e2e-proof-<run_id>` for reviewable recordings and traces.
- **Implementation:** Added `tests/e2e/accessibility.spec.ts`, labeled the onboarding answer input, configured Playwright's local web server with `NEXT_PUBLIC_APP_URL`, and expanded `test:e2e:ci` plus GitHub Actions artifact upload so the gate runs with the Supabase-backed CI environment.
- **Local focused command:** `pnpm run test:e2e -g accessibility`
- **Local focused result:** PASS — 6 tests discovered across Chromium and Mobile Chrome; 4 passed and 2 authenticated Supabase-backed journeys skipped locally because Docker/Supabase is unavailable in this Hermes environment.
- **Full local verification command:** `pnpm run lint && pnpm run test -- --reporter=dot && pnpm run build && pnpm run test:e2e -g accessibility && pnpm run test:e2e:ci && git diff --check`
- **Full local verification result:** PASS — ESLint passed, Vitest reported 35 files / 171 tests passed, production build passed, accessibility grep discovered and ran 6 desktop/mobile tests with 4 pass + 2 local Supabase skips, and `test:e2e:ci` ran 5 Chromium tests with 3 pass + 2 local Supabase skips. GitHub Actions remains authoritative for the authenticated proof path because local Docker/Supabase is unavailable in this Hermes environment.
- **Docker-gated CI expectation:** `pnpm run test:e2e:ci` runs Chromium auth/onboarding plus accessibility coverage after `supabase start`; authenticated tests are skipped only when the local Supabase health endpoint is unavailable.
- **Relevant files updated:** `.github/workflows/ci.yml`, `package.json`, `playwright.config.ts`, `tests/e2e/auth.spec.ts`, `tests/e2e/accessibility.spec.ts`, `src/components/onboarding/ChatOnboardingFlow.tsx`, `docs/TASKS.md`, `docs/TEST_EVIDENCE.md`.

## 2026-05-15 — S7-UAT-D01 Authenticated chat text meal composer

- **Task:** `S7-UAT-D01` — Restore/build authenticated `/chat` text meal composer.
- **Scope verified:** Core text meal logging flow from authenticated `/chat` through `/api/chat` structured blocks to server-validated confirm-save.
- **TDD evidence:** Added `src/app/(app)/chat/ChatMealLogger.test.tsx`, expanded orchestrator/API route expectations, and added `src/app/chat/confirm/route.test.ts` before replacing the static `/chat` card and hardening confirm-save.
- **Implementation:**
  - `/chat` now renders `ChatMealLogger`, an accessible client composer with transcript, meal message textarea, Send button, loading and retry/error states, quick prompt chips, and a confirm-save card.
  - `/api/chat` now returns orchestrator `blocks` in the response envelope and stores the confirm payload/safety flags in assistant-message metadata.
  - `handleMessage` meal candidates now include `confirmPayload`; `/chat/confirm` reads that server-stored candidate by authenticated `candidateId` instead of trusting a client-supplied JSON payload.
  - The auth/onboarding E2E flow now sends a real meal text through `/chat`, saves the returned estimate, and validates `/today` shows the breakfast entry.
- **Focused test command:** `pnpm run test -- src/app/\(app\)/chat/ChatMealLogger.test.tsx src/lib/agents/orchestrator.test.ts src/app/api/chat/route.test.ts src/app/chat/confirm/route.test.ts --reporter=dot`
- **Focused test result:** PASS — Vitest reported 35 test files / 171 tests passed in this filtered invocation; the new chat composer test passed 3/3, `/chat/confirm` route test passed 4/4, and the orchestrator preserves full confirm source text while truncating only the UI summary.
- **Static/build command:** `pnpm run lint && pnpm run typecheck && pnpm run build`
- **Static/build result:** PASS — ESLint, TypeScript, and Next.js production build completed with exit code 0 after confirm-save hardening.
- **Scoped E2E smoke command:** `pnpm run test:e2e:smoke`
- **Scoped E2E smoke result:** PASS — Chromium protected `/chat` unauthenticated redirect smoke passed (`1 passed`).
- **Not covered in this run:** live Vercel authenticated browser UAT after deployment, chat quick-action chips beyond local prompt chips, image/photo, audio/voice, and file upload modalities.
- **Relevant files updated:** `src/app/(app)/chat/page.tsx`, `src/app/(app)/chat/ChatMealLogger.tsx`, `src/app/(app)/chat/ChatMealLogger.test.tsx`, `src/app/api/chat/route.ts`, `src/app/api/chat/route.test.ts`, `src/app/chat/confirm/route.ts`, `src/app/chat/confirm/route.test.ts`, `src/lib/agents/orchestrator.ts`, `src/lib/agents/orchestrator.test.ts`, `tests/e2e/auth.spec.ts`, `docs/TASKS.md`, `docs/TEST_EVIDENCE.md`.

## 2026-05-15 — S7-T01 Vercel UAT checklist execution

- **Task:** `S7-T01` — Execute full UAT checklist.
- **Target:** `https://poshisu.vercel.app`.
- **Build/merge SHA:** `42d36814c211746e59b60232b4d8fcf41508ae37`.
- **Scope verified:** Production UAT pass/fail evidence for text, image, audio, file, and chips per `docs/UAT_VERCEL.md`.
- **Manual browser evidence:** Hermes Browserbase Chromium with disposable UAT account; raw email redacted from committed evidence.
- **PASS:** `/login` rendered with no browser JS errors; unauthenticated `/chat` redirected to `/login`; disposable signup entered onboarding; onboarding completed and redirected to `/chat`; default confirm-save wrote a meal visible on `/today`.
- **PASS:** onboarding quick-action chips (`None`, `Vegetarian`, `09:00 13:00 19:00`) populated the answer composer and advanced setup after Send.
- **FAIL/blocker:** authenticated `/chat` has no text composer/message input, so the text meal UAT case could not be executed.
- **FAIL/major:** image/camera, audio/voice, file, and chat-surface chip controls are unavailable in production UI; onboarding explicitly shows `Photo upload coming soon`, `Camera coming soon`, `File upload coming soon`, and `Voice coming soon`; `/chat` shows none of these controls beyond the default confirm-save CTA.
- **Screenshot evidence:** `docs/uat/2026-05-15-s7-t01/screenshots/01-onboarding-disabled-modalities.png`, `02-chat-no-composer.png`, `03-today-saved-meal.png`.
- **Unauthenticated probe:** `curl`/Python confirmed `/`, `/login`, and `/chat`; `/chat` final URL was `/login` with HTTP 200 after redirect and Vercel request IDs captured locally.
- **Verification command:** `rg -n "Pass|Fail|PASS|FAIL|build_id" docs/UAT_VERCEL.md && test -f docs/uat/2026-05-15-s7-t01/screenshots/01-onboarding-disabled-modalities.png && test -f docs/uat/2026-05-15-s7-t01/screenshots/02-chat-no-composer.png && test -f docs/uat/2026-05-15-s7-t01/screenshots/03-today-saved-meal.png && git diff --check`.
- **Result:** PASS — UAT execution is complete under the checklist exit rule because each failed modality has triage fields and linked evidence.
- **Relevant files updated:** `docs/UAT_VERCEL.md`, `docs/TASKS.md`, `docs/TEST_EVIDENCE.md`, `docs/uat/2026-05-15-s7-t01/screenshots/*`.

## 2026-05-15 — S6-T03 Release rollback + incident checklist

- **Task:** `S6-T03` — Release rollback + incident checklist.
- **Scope verified:** Non-trivial release rollback and incident response steps in `RUNBOOK.md`.
- **TDD evidence:** Added a docs parity assertion in `src/lib/devex/ci-parity.test.ts`; red run failed because `RUNBOOK.md` did not yet contain a dedicated `## Release rollback and incident checklist` section with severity gates, app/env/database/prompt rollback paths, incident command, and post-incident evidence fields.
- **Focused red command:** `pnpm run test -- src/lib/devex/ci-parity.test.ts --reporter=dot`
- **Focused red result:** FAIL as expected — `release rollback and incident checklist > documents testable rollback paths, incident command, and post-incident evidence` failed on missing `## Release rollback and incident checklist`.
- **Fix:** `RUNBOOK.md` now contains testable checklists for severity/decision gates, app rollback, environment rollback/redeploy, database forward-fix, prompt/agent rollback, incident command, and post-incident evidence.
- **Task ledger:** `docs/TASKS.md` marks `S6-T03` done and moves the active task pointer to `S7-T01`.
- **Focused green command:** `pnpm run test -- src/lib/devex/ci-parity.test.ts --reporter=dot`
- **Focused green result:** PASS after docs update.
- **Full local verification command:** `pnpm run lint && pnpm run typecheck && pnpm run test -- src/lib/devex/ci-parity.test.ts --reporter=dot && pnpm run build && pnpm run test:e2e:smoke && git diff --check && rg -n "rollback|incident" RUNBOOK.md`
- **Full local verification result:** PASS — exact command completed locally before commit.
- **Not covered in this run:** live rollback execution in Vercel/Supabase; this is the documented rollback/incident checklist task, not an incident simulation.
- **Relevant files updated:** `RUNBOOK.md`, `docs/TASKS.md`, `docs/TEST_EVIDENCE.md`, `src/lib/devex/ci-parity.test.ts`.

## 2026-05-15 — S6-T02 Vercel env + runbook parity

- **Task:** `S6-T02` — Vercel env + runbook parity.
- **Scope verified:** Preview/Production env docs, smoke checks, and Vercel rollback notes.
- **TDD evidence:** Added a docs parity assertion in `src/lib/devex/ci-parity.test.ts`; red run failed because `RUNBOOK.md` did not yet contain the required Vercel parity sections and `README.md` did not link the parity contract.
- **Focused red command:** `pnpm run test -- src/lib/devex/ci-parity.test.ts --reporter=dot`
- **Focused red result:** FAIL as expected — `Vercel runbook parity > documents preview and production env setup, smoke checks, and rollback notes` failed on missing `## Vercel environment parity`.
- **Fix:** `RUNBOOK.md` now documents required Vercel Preview/Production public vars, server-only secrets, build/observability values, Vercel-provided vars, Supabase Edge Function secret placement, Preview smoke checks, Production smoke checks, and rollback notes. Real project-specific env values were replaced with placeholders/generic setup guidance.
- **README parity:** `README.md` now links to `RUNBOOK.md#vercel-environment-parity` and records minimum release discipline for env edits, redeploys, smoke evidence, and secret hygiene.
- **Task ledger:** `docs/TASKS.md` marks `S6-T02` done and moves the active task pointer to `S6-T03`.
- **Focused green command:** `pnpm run test -- src/lib/devex/ci-parity.test.ts --reporter=dot`
- **Focused green result:** PASS after docs update.
- **Full local verification command:** `pnpm run lint && pnpm run typecheck && pnpm run test -- src/lib/devex/ci-parity.test.ts --reporter=dot && pnpm run build && pnpm run test:e2e:smoke && git diff --check && rg -n "env|smoke|rollback" RUNBOOK.md README.md`
- **Full local verification result:** PASS — exact command completed locally before commit.
- **Not covered in this run:** authenticated live Vercel Preview/Production browser smoke, because S6-T02 is the runbook/docs parity task rather than a deployed behavior change.
- **Relevant files updated:** `RUNBOOK.md`, `README.md`, `docs/TASKS.md`, `docs/TEST_EVIDENCE.md`, `src/lib/devex/ci-parity.test.ts`.

## 2026-05-15 — S6-T01 Supabase env quote-stripping follow-up

- **Task:** `S6-T01` follow-up — fix CI E2E startup failure caused by quoted `supabase status -o env` values.
- **Failure reproduced from CI:** GitHub Actions run `25878547690` failed in `DB types and scoped E2E` at `Scoped auth/onboarding E2E` with `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL` because `NEXT_PUBLIC_SUPABASE_URL` was receiving a literal quoted URL.
- **TDD evidence:** Added quote-stripping coverage in `src/lib/devex/ci-parity.test.ts`; red run failed because neither `.github/workflows/ci.yml` nor `ci:parity` stripped surrounding quotes from Supabase env values.
- **Fix:** CI and local parity now strip surrounding quotes from `API_URL` and `ANON_KEY` before exporting `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Non-Docker fallback verification:** Docker remains unavailable locally (`docker: command not found`), so a sample `/tmp/poshisu-supabase.env` with quoted values was parsed through the same `grep | cut | sed` pipeline; result PASS (`quote_strip_fallback_ok`, URL unquoted, key length only recorded).
- **Focused red command:** `pnpm run test -- src/lib/devex/ci-parity.test.ts`
- **Focused red result:** FAIL as expected — `strips quoted values emitted by Supabase env export before setting app env vars` failed before implementation.
- **Focused green command:** `pnpm run test -- src/lib/devex/ci-parity.test.ts`
- **Focused green result:** PASS — 33 test files / 161 tests passed; `src/lib/devex/ci-parity.test.ts` passed 3/3.
- **Full local non-Docker command:** `pnpm install --frozen-lockfile && pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run eval:prompts && pnpm run build && pnpm run test:e2e:smoke`
- **Full local non-Docker result:** PASS — lint, typecheck, Vitest 33 files / 161 tests, prompt eval 18/18, Next.js production build, and Chromium smoke 1/1 all passed.
- **Docker-gated local result:** BLOCKED locally because Docker is not installed; GitHub Actions remains authoritative for Supabase-local `db:types:check` and onboarding E2E.
- **CI follow-up:** PR #86 run `25901338178` proved quote stripping worked (`NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321`) but exposed a scoped E2E race: the onboarding test submitted all chat answers without waiting for each next prompt, then timed out waiting for the confirmation checkbox.
- **E2E stabilization fix:** `tests/e2e/auth.spec.ts` now waits for the next onboarding prompt/review summary after every answer before proceeding, and the scoped smoke answer stays on the maintain/wellness path so schema-required lose/gain target fields are not omitted. The Docker/Playwright CI job now aligns `NEXT_PUBLIC_APP_URL` and `PLAYWRIGHT_BASE_URL` on `http://localhost:3000` to avoid localhost-vs-127.0.0.1 auth cookie drift after redirects.
- **E2E stabilization verification:** `pnpm run lint && pnpm run typecheck && pnpm run test -- src/lib/devex/ci-parity.test.ts && pnpm run build && pnpm run test:e2e:smoke && git diff --check` PASS locally. Earlier full non-Docker background verification also finished with exit 0.
- **Relevant files updated:** `.github/workflows/ci.yml`, `package.json`, `src/lib/devex/ci-parity.test.ts`, `tests/e2e/auth.spec.ts`, `docs/TASKS.md`, `docs/TEST_EVIDENCE.md`.

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
