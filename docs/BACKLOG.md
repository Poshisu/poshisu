# Backlog

> Canonical list of things deliberately deferred — features punted to a
> later phase, credentials and secrets not yet provisioned, infra gaps,
> and tech debt. The same PR that defers an item updates this file.
>
> **Convention.** Every item has: a phase target, a one-line rationale,
> and (where relevant) a `Blocked on:` note. Items are removed from the
> file when shipped or genuinely cancelled — not crossed out.
>
> **Migration to Linear.** Move this file into Linear when (a) a second
> human joins the build, (b) real users start filing bugs, or (c) this
> file crosses ~25 entries.

---

## Critical — must resolve before Phase 1 ships

### Provision `ELEVENLABS_API_KEY` on Vercel + `.env.local`

- **Phase:** 1 (sub-task 4 — `/api/transcribe`)
- **Why:** voice input on the onboarding chat is part of the approved Phase 1 brief
- **Blocked on:** user generating an ElevenLabs API key with Scribe v2 access
- **Scope:** Production + Preview env vars on Vercel; `.env.local` for local

### Provision `SUPABASE_SERVICE_ROLE_KEY` on Vercel Preview

- **Phase:** 1 (immediate — agent_traces writes)
- **Why:** without it on Preview, every agent call we make on the preview deployment skips trace logging silently. We can debug locally but not against the actual preview where users are testing.
- **Blocked on:** copying the existing Production-scoped value to also apply to Preview
- **Workaround in place:** code degrades gracefully, just no traces

### Provision real `NEXT_PUBLIC_SENTRY_DSN`

- **Phase:** 1 (any time before public testing)
- **Why:** currently `TODO_SENTRY_DSN` placeholder. Sentry guard rejects the placeholder, so error capture is silent.
- **Blocked on:** create a Sentry project (free tier OK), copy DSN
- **Side quest:** while there, also set `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (Production scope only) for source-map upload

---

## Credentials & secrets to provision

| Variable | Required by | Scope | Status |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Phase 1 (callAgent) | Prod + Preview | Assumed set — verify before sub-task 6 |
| `ELEVENLABS_API_KEY` | Phase 1 (transcribe route) | Prod + Preview | **Not set** |
| `NEXT_PUBLIC_SENTRY_DSN` | Phase 0.5 → live | Prod + Preview | Placeholder — needs real DSN |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Phase 0.5 source maps | Production only | **Not set** |
| `SUPABASE_SERVICE_ROLE_KEY` | Phase 1 agent_traces, Phase 3 background jobs | Prod + Preview | Set in Prod, **unverified for Preview** |
| `NEXT_PUBLIC_POSTHOG_KEY` | Phase 0.5 (deferred to launch) | Prod + Preview | **Not set** — see "PostHog wiring" below |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Phase 5 (push notifications) | Prod + Preview | **Not set** |
| `NEXT_PUBLIC_APP_URL` | Production canonical origin | **Production only** (deliberate) | Should be set; Preview falls back to `VERCEL_BRANCH_URL` |
| Production SMTP (Resend / Postmark) | Pre-launch | Prod | **Not set** — currently using Supabase free-tier (rate-limited) |

---

## Configuration & ops tasks

### Add Supabase redirect-URL wildcard for previews

- **Phase:** 1 (before any preview testing of Google OAuth)
- **Why:** preview deployments have unique hostnames. OAuth redirects are rejected unless the URL pattern is in Supabase's allow-list.
- **Action:** Supabase Dashboard → Authentication → URL Configuration → add `https://poshisu-git-*-atreya-setucos-projects.vercel.app/callback`

### Re-enable email confirmation before public launch

- **Phase:** Pre-launch
- **Why:** confirmation is currently OFF (turned off during Phase 0 to bypass Supabase free-tier SMTP rate-limit). Production users should confirm their email.
- **Blocked on:** swap in Resend or Postmark SMTP, then re-enable in Supabase Auth settings

### Branch protection on `main`

- **Phase:** 1 (this week)
- **Why:** CI on PRs is set up but not enforced — main can be force-pushed or have unreviewed merges
- **Action:** GitHub repo Settings → Rules → require PR + green CI before merge

### Anthropic API budget alarms

- **Phase:** Pre-launch (or sooner if costs spike)
- **Why:** Phase 1 begins making real API calls. We should alarm at $X/day to catch runaway loops.
- **Blocked on:** decide on the threshold; Anthropic console supports usage alerts

### Re-run code-reviewer / accessibility-auditor on Phase 0.4

- **Phase:** 1 (any session)
- **Why:** the code-reviewer sub-agent rate-limited mid-run during the Phase 0.4 commit. We applied findings from the partial review but the full scan was never completed.
- **Action:** invoke `code-reviewer` against the diff between the pre-Phase-0.4 commit and the Phase 0.4 tip (`f434004..560ac88`). Apply any unaddressed findings.

---

## Tech debt by area

### Security

- **CSP with per-request nonces**
  - Phase: 2 (when streaming chat surface lands)
  - Why deferred: a strict CSP for App Router needs middleware to inject nonces into Next's hydration scripts; tuning against a moving streaming surface is wasted work. We have HSTS, X-Frame-Options, and the rest meanwhile.
  - Acceptance: B+ → A on `securityheaders.com`

- **CORS allow-list on /api/transcribe and future /api/chat**
  - Phase: 1 (sub-task 4) and 2
  - Why: same-origin by default, but explicit `Access-Control-Allow-Origin` header would harden against third-party origin abuse if/when we expose any public API
  - Status: not strictly needed since both routes are auth-gated and same-origin, but document the decision

- **Profile page email display**
  - Phase: 3.4 (memory inspector)
  - Why deferred: flagged Moderate by security-reviewer during Phase 0.4. User seeing their own email is fine; but the surface should be reviewed when the memory inspector lands.

- **Dependency vulnerability scanning**
  - Phase: 1 (any session)
  - Action: enable GitHub Dependabot security alerts; add `pnpm audit` to CI as a non-blocking warning step

### Observability

- **PostHog wiring**
  - Phase: Launch
  - Why deferred: zero users currently. Wiring product analytics before traffic is busywork.
  - When: as part of the pre-launch checklist

- **Playwright e2e in CI**
  - Phase: 1 (sub-task 10) or 2
  - Why deferred: needs to run against the deployed Vercel preview URL, not localhost — local won't catch env-scoping bugs (which is exactly the class of bug we want it to catch)
  - Action: add a CI job that waits for Vercel deployment, then runs `playwright test --base-url=$PREVIEW_URL`

- **Map agent_traces → Sentry events**
  - Phase: 2
  - Why: when an agent call fails, we want a single ID that links the user-facing digest, the trace row, and the Sentry event. Currently they're three separate breadcrumbs.

### Testing

- **Unit coverage on `src/lib/agents/`, `src/lib/memory/`, `src/lib/safety/`, `src/lib/nutrition/`**
  - Phase: 2 (built alongside the real implementations)
  - Why deferred: most of these are stubs right now. Tests come with the real code.
  - Bar: 80%+ per CLAUDE.md

- **Prompt eval harness (`npm run eval:prompts`)**
  - Phase: 1 (sub-task 10) start, expanded in Phase 2
  - Why deferred: `scripts/eval-prompts.ts` referenced in package.json but doesn't exist yet. Sub-task 10 builds the minimum viable harness for ONBOARDING_PARSER.
  - Bar: 5+ fixtures per agent, deterministic Vitest assertions on tool-call output shape

- **Performance / load testing**
  - Phase: Pre-launch
  - Why: no users yet

### Documentation

- **`docs/ARCHITECTURE.md` refresh after Phase 1**
  - Phase: end of Phase 1
  - Why: original architecture was written before observability/Sentry/error boundaries existed

- **`docs/PROMPTS_GUIDE.md` expansion**
  - Phase: 1 (after sub-task 1) or 2
  - Why: we now have a real `callAgent`. The guide should document the contract, the caching flag, the trace logging, and how to add a new agent.

### Health / clinical

- **RD review of `prompts/agents/SAFETY_RULES.md`**
  - Phase: Pre-launch
  - Why: this file encodes condition-specific dietary guidance. It should be reviewed and signed off by a registered dietitian before public launch.
  - **NEEDS RD REVIEW** flagged in code

- **Pregnancy trimester nutritional targets**
  - Phase: 3
  - Why: profile generator currently flags pregnancy generically; specific trimester-level calorie/protein targets need RD input

- **IFCT seed data clinical accuracy spot-check**
  - Phase: 2 (alongside Stage 2 lookup)
  - Why: the IFCT extract used as base values should be cross-checked by an RD against the actual ICMR-NIN 2020 RDA tables

---

## Feature deferrals by phase

### Phase 2 (chat + meal logging — the real product)

- 8 progressive onboarding questions (P1–P8) — surface from chat events, not in the wizard
- Memory consolidator (daily Edge Function)
- Real /api/chat orchestrator with streaming
- Photo upload + vision identification
- Voice transcription IN chat (Phase 1 builds the infrastructure for onboarding only)
- Meal corrections + portion bias updating
- Daily targets computation

### Phase 3 (insights, memory, nudges)

- Memory inspector UI on /profile
- Patterns layer consolidation
- Weekly summary background job
- Coach insights surface
- Nudge scheduler + push delivery
- 8 progressive question triggers

### Phase 4 (trends, analytics)

- Recharts radar / line / bar charts
- Weekday vs weekend pattern view
- Macro-balance-over-time view
- "Nudges that moved the needle" analysis

### Phase 5+ (post-MVP)

- Multi-language UI (Hindi, Bengali, Tamil, others)
- Voice answers in onboarding (Phase 1 ships text + voice on chat input only)
- City typeahead with timezone inference
- Swiggy / Zomato integration
- WhatsApp integration
- Wearable integration (HealthKit, Google Fit)
- Family / household sharing
- Coach human-in-the-loop for premium tier

---

## Anti-patterns we caught and corrected (kept here as a reference)

These are not pending — they're done. Documented so future contributors see the rationale.

- **Trusting `Origin` / `Host` headers for auth redirect URLs** — replaced with `trustedAppOrigin()` (`src/lib/auth/origin.ts`) which uses an explicit env var with Vercel system-URL fallback
- **Generic "signup_failed" for every Supabase error** — replaced with `mapSignupError()` and the `?debug=` query param (preview-only)
- **`NEXT_PUBLIC_SENTRY_DSN` truthy-check** — tightened to require `https://` prefix to reject placeholders like `TODO_SENTRY_DSN`
- **Vitest collecting Playwright specs** — explicit `tests/e2e/**` exclude in `vitest.config.ts`
