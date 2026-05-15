# RUNBOOK.md

Operational runbook for deploying and supporting Nourish in its current phase.

## 1) Deploy checks (pre-deploy)

Run these checks before any deployment:

1. `pnpm install --frozen-lockfile`
2. `pnpm run typecheck`
3. `pnpm run lint`
4. `pnpm run test`
5. `pnpm run build`
6. `pnpm run test:e2e` (full or risk-scoped suite)
7. `pnpm run eval:prompts` (required if prompt/agent behavior changed)

Database checks:
- Confirm migrations are append-only and ordered.
- Confirm any new RLS policies exist and match ownership model.

Documentation checks:
- README and docs parity updated for behavior changes.
- `docs/TASKS.md` statuses reflect actual implementation state.

## 2) Deployment procedure (baseline)

1. Merge reviewed PR to main branch.
2. Ensure CI passes for lint/type/test/build (and E2E where configured).
3. Apply pending Supabase migrations in sequence.
4. Confirm Vercel Preview/Production env vars match the matrix in [Vercel environment parity](#vercel-environment-parity).
5. Deploy app through Vercel.
6. Run the preview or production smoke checklist below before calling the release healthy.
7. Verify background job schedules remain healthy if migrations touched Supabase jobs/functions.

## 3) Rollback steps

Use fastest safe rollback for user-impacting incidents.

### App rollback
1. Roll back to previous known-good deployment in Vercel.
2. Re-run the relevant Vercel smoke checks in [Vercel environment parity](#vercel-environment-parity).
3. Announce incident status and expected recovery timeline.

### Database rollback strategy
- Migrations are append-only; do not edit or delete applied migrations.
- If a migration introduces issues:
  1. Stop/mitigate affected app behavior.
  2. Ship a forward-fix migration to restore expected behavior.
  3. Validate RLS and data integrity after fix.

### Prompt/agent rollback
1. Revert prompt or agent routing change.
2. Re-run `pnpm run eval:prompts`.
3. Confirm key user flows before re-deploy.

## 4) Common incidents and diagnostics

### Incident A: Login/session failures
Symptoms:
- users stuck in auth redirects
- protected routes inaccessible after sign-in

Diagnostics:
1. Check auth callback route behavior.
2. Verify Supabase auth environment variables.
3. Confirm cookie/session handling in middleware and server client.
4. Check `NEXT_PUBLIC_APP_URL` against the actual Vercel deployment host; host drift can break auth/session redirects.

### Incident B: Cross-user data exposure concern
Symptoms:
- user sees unexpected records

Diagnostics:
1. Audit affected table RLS policies immediately.
2. Validate ownership filters in server/API layer.
3. Review recent migrations touching policies/functions.

Immediate action:
- disable or gate impacted endpoint/feature until containment.

### Incident C: Chat/API cost spike or abuse pattern
Symptoms:
- sudden rise in LLM calls or infra cost
- elevated latency/error rate

Diagnostics:
1. Inspect rate limiter behavior and logs.
2. Check fail-closed safeguards and recent config changes.
3. Sample request traces for abuse signatures.

Immediate action:
- tighten limits and block abusive patterns; preserve legitimate traffic where possible.

### Incident D: Onboarding action failures
Symptoms:
- onboarding confirm fails or loops

Diagnostics:
1. Verify server action validation path.
2. Confirm parser response shape assumptions.
3. Check DB writes to profile/memory/onboarded flags.
4. Confirm Anthropic and Supabase server env vars are present in the affected Vercel environment.

### Incident E: Background job failures
Symptoms:
- nudges/summaries/memory consolidation not running

Diagnostics:
1. Check scheduled job status in Supabase.
2. Inspect function logs for auth/runtime errors.
3. Verify secrets/config for Supabase edge functions.

## 5) Minimal incident response template

When incident is active, track:
- Start time (UTC)
- Impacted user segment
- Symptoms
- Suspected layer (UI/API/DB/Auth/LLM/Infra)
- Mitigation taken
- Current status
- Next update ETA

After resolution, file follow-up tasks in `docs/TASKS.md` and decision notes in `docs/DECISIONS.md` when architectural changes are needed.

## Supabase public env setup (for onboarding E2E + local preview)

Use this when Playwright/web server fails with: "Your project's URL and Key are required to create a Supabase client".

1. Repo root means the top folder that contains `package.json`.
2. Open Supabase dashboard → your project → **Settings** → **API**.
3. Copy these two values:
   - `Project URL`
   - `anon public key` / publishable key
4. In repo root, create or edit `.env.local` and add:
   - `NEXT_PUBLIC_SUPABASE_URL=<Project URL>`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon/publishable key>`
5. Save file and restart dev/test web server.
6. Re-run onboarding E2E: `pnpm run test:e2e -g onboarding`.

Security notes:
- These two are public client values, but keep real project-specific values out of docs and chat; use placeholders in committed files.
- Never put service-role keys in `NEXT_PUBLIC_*` variables.

### GitHub vs local vs Vercel env placement
- `.env.local` is local only and is intentionally gitignored; never push it.
- GitHub repository secrets/variables are for GitHub Actions CI runs.
- Vercel Project Environment Variables are for Vercel Preview/Production runtime.
- Supabase Edge Function secrets are managed separately through Supabase, not Vercel.
- Keep public Supabase values consistent across local, GitHub Actions, and Vercel when they target the same Supabase project.

### GitHub Actions setup
1. Open repo → **Settings** → **Secrets and variables** → **Actions**.
2. Put public browser values in **Variables** where possible:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Put any secret server/build values in **Secrets** only.
4. Re-run the newest failed **CI** workflow from the Actions tab after changes.

## Vercel environment parity

S6-T02 requires Vercel Preview and Production to have explicit, documented env parity. Configure through Vercel → Project → **Settings** → **Environment Variables**, then redeploy because existing deployments do not automatically pick up changed env values.

### Required Vercel environment matrix

Core public browser/runtime values — set in both **Preview** and **Production**:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL for the target environment. Use the preview/staging Supabase project if one exists; otherwise document that Preview intentionally points at the beta project.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase anon/publishable key for the same Supabase project as the URL.

Origin value — intentionally **Production only** unless a human is debugging a specific preview-origin issue:
- `NEXT_PUBLIC_APP_URL`: Canonical production app origin. Leave this unset on Preview so `src/lib/auth/origin.ts` can use Vercel-injected `VERCEL_BRANCH_URL` / `VERCEL_URL` and route auth/email redirects back to the active preview. If this is set on Preview, it can pin redirects to production or a stale deployment and break auth/session smoke tests.

Conditional public browser/runtime values — set in Preview and Production when the corresponding feature/tooling is enabled:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Browser-visible push public key when push subscription UI is tested; omit only if push is intentionally disabled for the environment.
- `NEXT_PUBLIC_POSTHOG_KEY`: Browser analytics project key. Optional for dev-only previews, but if omitted the smoke owner should record analytics as not covered.
- `NEXT_PUBLIC_POSTHOG_HOST`: PostHog host, normally `https://app.posthog.com` unless self-hosted.
- `NEXT_PUBLIC_SENTRY_DSN`: Public Sentry DSN. Optional for local dev; recommended for Preview and Production so client errors are visible.

Server-only/runtime secrets — set in both **Preview** and **Production** as encrypted Vercel env vars:
- `SUPABASE_SERVICE_ROLE_KEY`: Server/admin Supabase key. Never prefix with `NEXT_PUBLIC_`; never expose in client bundles, logs, PR bodies, screenshots, or chat.
- `ANTHROPIC_API_KEY`: Claude API key for agent/parser/orchestrator paths.
- `ELEVENLABS_API_KEY`: ElevenLabs Scribe key for voice transcription when voice is in-scope.
- `VAPID_PRIVATE_KEY`: Web Push private key. Must pair with the public VAPID key.
- `VAPID_SUBJECT`: Contact subject for web-push, for example `mailto:<support-email>` or app URL.
- `POSTHOG_PRIVATE_KEY`: Server-side PostHog capture key if server events are enabled.

Build/observability values — set where source maps or release tracking are enabled:
- `SENTRY_AUTH_TOKEN`: Build-time source-map upload token. Use Vercel encrypted env vars and restrict token scope in Sentry.
- `SENTRY_ORG`: Sentry org slug.
- `SENTRY_PROJECT`: Sentry project slug.

Vercel-provided values — do not set manually unless debugging a platform issue:
- `VERCEL_ENV`
- `VERCEL_URL`
- `VERCEL_BRANCH_URL`
- `VERCEL_GIT_COMMIT_SHA`

Supabase Edge Function secrets — configure in Supabase, not Vercel:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

### Preview smoke checks

Run these after every Vercel Preview deployment that changes env handling, auth, onboarding, chat, meals, memory, push, telemetry, or build/runtime config.

Unauthenticated checks:
1. Open the Preview URL in a clean browser context.
2. Visit `/login` and confirm the auth UI renders without server/client error overlays.
3. Visit `/chat`; expected result is redirect to `/login` for unauthenticated users.
4. Visit `/api/push`; expected result is either a public-key response when push is configured or a safe `PUSH_NOT_CONFIGURED` envelope when intentionally disabled.

Authenticated checks with a non-production test account:
1. Sign in on the Preview URL.
2. Confirm `/chat`, `/today`, `/trends`, and `/profile` render without console errors that block use.
3. For onboarding-impacting changes, complete the signup → onboarding → chat route once with a disposable Preview test account.
4. For meal-loop-impacting changes, log a simple text meal, confirm it, and verify it appears on `/today`.
5. Record what was not covered, especially photo/voice/file/chips if no manual UAT was run.

CLI/browser evidence to attach to PR when applicable:
- `pnpm run test:e2e:smoke` locally or in CI for unauthenticated redirect coverage.
- Preview URL, deployment ID/commit SHA, and a short pass/fail note.
- Screenshots only when useful; never include secrets or real user health data.

### Production smoke checks

Run after merge and production deployment, using a production-safe test account and no real user data.

Required checks:
1. Confirm production deployment SHA matches the merged commit.
2. Open `/login`; auth page renders without fatal console errors.
3. Visit `/chat` unauthenticated; expected redirect to `/login`.
4. Sign in with the production-safe test account.
5. Load `/chat`, `/today`, `/trends`, and `/profile`.
6. If the release touches onboarding/chat/meal persistence, run the smallest production-safe path that proves the change without storing sensitive real-user data.
7. Confirm Sentry/PostHog did not show a new burst of errors immediately after deploy when those tools are configured.

Production smoke must not:
- use personal health details;
- print or screenshot env values;
- use service-role keys from a terminal;
- mutate real user accounts for testing.

### Vercel rollback notes

Use Vercel rollback when a deploy is user-impacting and a safe forward fix is not faster.

1. In Vercel → Project → Deployments, find the last known-good Production deployment.
2. Use **Promote to Production** / rollback to restore the known-good build.
3. Re-run the Production smoke checks above.
4. If the incident was caused by env drift, fix the env value first, then **Redeploy** the intended commit rather than rolling forward with stale runtime config.
5. If migrations were part of the release, do not assume app rollback reverts database state. Use the database rollback strategy above and ship an append-only forward-fix migration if needed.
6. Preserve incident notes: bad deployment URL/SHA, rollback target URL/SHA, first failing smoke step, mitigation time, and follow-up task.

Rollback does not replace root-cause cleanup. After users are stable, update `docs/TASKS.md`, `docs/TEST_EVIDENCE.md`, or `docs/DECISIONS.md` if the fix changes process or architecture.

### Which workflow to re-run after env fixes
- Re-run the **CI** workflow for GitHub Actions failures.
- For Vercel env changes, trigger **Redeploy** for the affected Preview or Production deployment; editing env vars alone is not enough.
- If multiple recent runs failed, re-run the newest one first. Older failures can be ignored after a newer green run and matching Vercel smoke pass.
