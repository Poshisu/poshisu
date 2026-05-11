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
4. Deploy app (Vercel or configured target).
5. Run smoke checks on critical routes:
   - auth/login
   - onboarding entry
   - app shell/chat page load
6. Verify background job schedules remain healthy (if migrations touched jobs/functions).

## 3) Rollback steps

Use fastest safe rollback for user-impacting incidents.

### App rollback
1. Roll back to previous known-good deployment in hosting platform.
2. Re-run smoke checks.
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

### Incident E: Background job failures
Symptoms:
- nudges/summaries/memory consolidation not running

Diagnostics:
1. Check scheduled job status in Supabase.
2. Inspect function logs for auth/runtime errors.
3. Verify secrets/config for edge functions.

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

1. Repo root means the top folder that contains `package.json` (in this repo: `/workspace/poshisu`).
2. Open Supabase dashboard → your project → **Settings** → **API**.
3. Copy these two values:
   - `Project URL`
   - `anon public key`
4. In repo root, create or edit `.env.local` and add:
   - `NEXT_PUBLIC_SUPABASE_URL=<Project URL>`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon public key>`
5. Save file and restart dev/test web server.
6. Re-run onboarding E2E: `pnpm run test:e2e -g onboarding`.

Security notes:
- These two are public client values (safe for browser/runtime exposure).
- Never put service-role keys in `NEXT_PUBLIC_*` variables.


### GitHub vs local vs Vercel env placement
- `.env.local` is local only and is intentionally gitignored (not pushed to GitHub).
- GitHub repository secrets/variables are for GitHub Actions CI runs.
- Vercel Project Environment Variables are for Vercel preview/production runtime.
- You usually set the same public Supabase values in all three places as needed.


### Exact copy-paste values for this project

Add these exact pairs (same in local, GitHub Actions, and Vercel project envs):

- `NEXT_PUBLIC_SUPABASE_URL` = `https://mdfsaxnlrhhqnynkiawn.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_YLywT4DEANbGGSYhD1zUZg_8tVHPNE4`

### GitHub Actions clicks (exact)
1. Open repo → **Settings** → **Secrets and variables** → **Actions**.
2. Click **Variables** tab (preferred for public non-sensitive values).
3. Click **New repository variable** and create:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://mdfsaxnlrhhqnynkiawn.supabase.co`
4. Click **New repository variable** again and create:
   - Name: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Value: `sb_publishable_YLywT4DEANbGGSYhD1zUZg_8tVHPNE4`
5. Re-run the failed GitHub Action workflow from the Actions tab.

### Vercel clicks (exact)
1. Open Vercel project → **Settings** → **Environment Variables**.
2. Click **Add Environment Variable**.
3. Add:
   - Key: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://mdfsaxnlrhhqnynkiawn.supabase.co`
   - Environments: **Production, Preview, Development**
4. Add another variable:
   - Key: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Value: `sb_publishable_YLywT4DEANbGGSYhD1zUZg_8tVHPNE4`
   - Environments: **Production, Preview, Development**
5. Trigger **Redeploy** for the latest preview deployment so new env vars are picked up.


### Which GitHub workflow to re-run
- Re-run the **CI** workflow (left sidebar in Actions shows only `CI`).
- On Actions page, open the latest failed run for your branch/PR.
- Click **Re-run jobs** (or **Re-run failed jobs**).
- If multiple recent runs failed, re-run the newest one first (older failures can be ignored after a newer green run).
