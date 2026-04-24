# Deployment & Operations Runbook

Canonical reference for how Nourish deploys to Vercel, where environment
variables live, and how to triage a failing preview or production request.

---

## Deployment topology

| Environment | Branch | Domain | Purpose |
|---|---|---|---|
| Production | `main` | `poshisu.vercel.app` (and any custom domain) | Live traffic |
| Preview | every non-`main` branch | `poshisu-git-<branch>-<team>.vercel.app` (stable branch alias) and `poshisu-<hash>-<team>.vercel.app` (immutable per-commit) | PR review, smoke testing |
| Development | none | `localhost:3000` | Local dev |

**Immutable deployment-hash URLs are pinned to a specific commit forever.**
Every push produces a new deployment with a new hash. When debugging, always
switch to the branch alias (`poshisu-git-<branch>-<team>.vercel.app`) — it
floats to the latest deploy.

---

## Environment variables

### Where they live

Vercel → Project → Settings → Environment Variables. Each variable has three
independent scopes:

- **Production** — applied to deploys built from `main`.
- **Preview** — applied to deploys built from any other branch.
- **Development** — applied to `vercel dev` sessions (we don't use this; we
  run `pnpm dev` with a local `.env.local`).

**Common failure:** a variable is added with Production scope only. The
production build works; every preview crashes as soon as it touches that
variable. If you see a 500 on a preview but production is fine, check
scopes first.

### Required variables

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Prod + Preview | Same Supabase project across environments is fine during beta; split once we have real users. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Prod + Preview | Anon key. Safe to expose. |
| `SUPABASE_SERVICE_ROLE_KEY` | Prod + Preview | **Server-side only.** Never prefix with `NEXT_PUBLIC_`. |
| `ANTHROPIC_API_KEY` | Prod + Preview | Claude API. Per-env keys recommended long-term so spend is attributable. |
| `ELEVENLABS_API_KEY` | Prod + Preview | Voice transcription. |
| `VAPID_PUBLIC_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Prod + Preview | Same value. Public part of VAPID keypair. |
| `VAPID_PRIVATE_KEY` | Prod + Preview | Server-side only. |
| `NEXT_PUBLIC_APP_URL` | **Prod only** | Canonical production origin, e.g. `https://poshisu.vercel.app`. On previews we deliberately leave this unset — see below. |
| `NEXT_PUBLIC_SENTRY_DSN` | Prod + Preview | Guarded — Sentry no-ops if missing. |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Prod only (build-time) | Source-map upload. |
| `NEXT_PUBLIC_POSTHOG_KEY` | Prod + Preview | Analytics. |

### Why `NEXT_PUBLIC_APP_URL` is Production-only

The origin helper at `src/lib/auth/origin.ts` resolves auth redirect URLs in
this order:

1. `NEXT_PUBLIC_APP_URL` (explicit override)
2. `VERCEL_BRANCH_URL` (stable per-branch alias, auto-injected by Vercel)
3. `VERCEL_URL` (per-deployment hash URL, auto-injected by Vercel)

On production we want deterministic redirect to the canonical domain, so
`NEXT_PUBLIC_APP_URL` is set. On previews we want the OAuth / email
confirmation links to land back on the *preview itself*, not on production,
so we leave `NEXT_PUBLIC_APP_URL` unset and let the Vercel-injected vars
take over.

Covered by unit tests in `src/lib/auth/origin.test.ts`.

---

## Supabase redirect allow-list

For OAuth sign-in and email-confirmation links to actually round-trip, the
resolved origin must be in Supabase → Authentication → URL Configuration →
Redirect URLs. Wildcards are supported.

Minimum entries:

```
https://poshisu.vercel.app/callback
https://poshisu-git-*-<team-slug>.vercel.app/callback
http://localhost:3000/callback
```

Forgetting the wildcard is the most common preview-OAuth failure.

---

## CI

`.github/workflows/ci.yml` runs on every push and PR to `main`:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test` (unit, Vitest)
4. `pnpm build` (with dummy Supabase URL + key — see the workflow for why)

Playwright e2e is not yet in CI. It runs locally with `pnpm test:e2e`.
When we add it to CI, it will run against the deployed Vercel preview URL
rather than localhost — that way it catches env-scoping issues like the
one this runbook was written for.

---

## Triage: request is failing in production or preview

### 1. Identify what kind of failure

- **500 on page render:** the page or middleware threw. Usually env-var or
  database-connectivity.
- **500 on a `text/x-component` POST:** a Server Action threw. Next.js
  masks the real error behind an opaque `digest` on the wire. To see the
  actual error:
  - Open the app — the dev/preview build of `src/app/error.tsx` surfaces
    the real message inline.
  - Or check Vercel → Deployments → the failing deploy → Logs. The
    `withServerActionLogging` wrapper writes `[server-action:<name>]`
    entries with full stack traces.
  - Or check Sentry — every action throw is captured with a
    `serverAction` tag.
- **Redirects loop between `/login` and a protected page:** session cookie
  isn't being set. Usually a `NEXT_PUBLIC_SUPABASE_URL` mismatch between
  what the middleware uses and what the browser was issued from.

### 2. Map a digest back to a root cause

The digest that users see (e.g. `464254539`) is deterministic within a
deployment: Next.js hashes the error message. Correlate:

1. Copy the digest from the "This page couldn't load" page.
2. In Vercel Runtime Logs, search for the digest — Next prints it next to
   the original stack.
3. In Sentry, the digest is not a queryable field yet, but the action tag
   plus timestamp narrows it instantly.

### 3. Common causes

| Symptom | Likely cause | Fix |
|---|---|---|
| GET any page 500s, production is fine | Env var not scoped to Preview | Settings → Environment Variables → tick Preview on missing vars → redeploy. |
| Signup form 500s, page renders fine | `NEXT_PUBLIC_APP_URL` threw in a Server Action on preview | Already fixed via `src/lib/auth/origin.ts` fallback — confirm the deploy is post-commit `64c0f0e`. |
| OAuth callback lands on `/login?error=oauth_callback_failed` | Preview URL not in Supabase allow-list | Add the wildcard pattern above. |
| Signup says "check your inbox" but no email arrives | Supabase free-tier SMTP rate limit (3–4/hour) | For dev: turn off Email → Confirm email in Supabase. For prod: swap in Resend/Postmark SMTP. |
| Session dropped after a minute | Supabase project URL differs between middleware and server client | Check that both reads go through `process.env.NEXT_PUBLIC_SUPABASE_URL`. |

### 4. Rolling back

Vercel → Deployments → previous green deploy → ⋯ → Promote to Production.
Migrations are append-only so rollback never requires a DB revert.

---

## Security headers

Every response carries six static headers applied via `next.config.ts` →
`headers()` (values defined in `src/lib/http/securityHeaders.ts`):

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years incl. subdomains |
| `X-Content-Type-Options` | `nosniff` | Disable MIME sniffing |
| `X-Frame-Options` | `DENY` | Clickjacking protection (legacy path) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Cross-origin referrer hardening |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolate browsing context |
| `Permissions-Policy` | explicit allow-list | Camera + microphone from self; everything else denied |

Verify live by curling any route: `curl -sI https://your-deploy.vercel.app/login`.

### CSP follow-up (Phase 1+)

A proper Content-Security-Policy is deliberately **not** in this set. Next.js
App Router injects inline hydration scripts which require per-request nonces
generated in middleware (`src/proxy.ts`). Adding that is a separate, ~1-day
task best done once the chat surface is live — otherwise we'd be tuning CSP
against a moving target.

Tracked as a Phase 1 chore. Interim mitigations in place:
- HSTS forces TLS, preventing MITM injection.
- `X-Frame-Options: DENY` covers clickjacking.
- `Referrer-Policy` covers URL leakage.
- All Server Action inputs are Zod-validated.
- Supabase RLS prevents data exfiltration even on XSS.

---

## Local development

```bash
cp .env.local.example .env.local   # fill in the values
pnpm install
pnpm dev                            # or pnpm dev:light on memory-constrained machines
```

Before committing: `pnpm lint && pnpm typecheck && pnpm test`. CI will
re-run these on push; running locally first saves a round trip.
