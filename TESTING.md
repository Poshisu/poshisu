# TESTING.md

This document defines how we test Nourish today, including exact commands, test layers, fixture strategy, and failure triage.

## 1) Test layers

### Layer A — Static checks (fastest)
Purpose: catch syntax, typing, and style issues before runtime.

- Type checking: `pnpm run typecheck`
- Linting: `pnpm run lint`

### Layer B — Unit/component tests
Purpose: validate pure logic and UI behavior in isolation.

- Command: `pnpm run test`
- Targeted tests (example):
  - `pnpm run test -- src/lib/onboarding/schema.test.ts`
  - `pnpm run test -- src/components/onboarding/ChatOnboardingFlow.test.tsx`

### Layer C — End-to-end tests
Purpose: validate user journeys across routing, auth boundaries, and UI integration.

- Full suite: `pnpm run test:e2e`
- Scoped run (example): `pnpm run test:e2e -g onboarding`

### Layer D — Prompt evaluation (for prompt or agent changes)
Purpose: detect regressions in LLM behavior and prompt contract quality.

- Command: `pnpm run eval:prompts`
- Run whenever any file under `prompts/agents/` or prompt-dependent routing logic changes.

## 2) Recommended execution order

Run checks in this order locally before every commit:

1. `pnpm install --frozen-lockfile`
2. `pnpm run typecheck`
3. `pnpm run lint`
4. `pnpm run test`
5. `pnpm run test:e2e` (or a scoped subset for in-progress feature work)
6. `pnpm run eval:prompts` (required for prompt changes)

## 3) Fixtures and test data

### Principles
- Use realistic but fake data only.
- Never use production data, real credentials, or personal health data.
- Prefer deterministic fixtures with explicit timestamps to avoid flaky tests.

### Current fixture sources
- Unit/component fixtures: colocated in test files or test helper modules under `src/**`.
- E2E fixtures: Playwright test data and seeded/local Supabase state.
- Database baseline: `supabase/seed.sql` and append-only migration chain in `supabase/migrations/`.

### Fixture conventions
- Keep fixture names domain-specific (e.g., `onboardingAnswersValid`, `mealLogAmbiguousPortion`).
- Include edge-case fixtures for:
  - Missing required onboarding values
  - Out-of-range meal times
  - Contradictory safety/condition input
  - Network and server-action error states

## 4) Failure triage runbook

When a check fails, triage in this order:

1. **Classify the failing layer**
   - Static (`typecheck`/`lint`)
   - Unit/component (`vitest`)
   - E2E (`playwright`)
   - Prompt eval

2. **Re-run just the failing scope**
   - Example: `pnpm run test -- path/to/failing.test.ts`
   - Example: `pnpm run test:e2e -g "failing scenario name"`

3. **Check recent changes at trust boundaries**
   - Zod schemas and inferred TS types
   - Auth/session route guards
   - RLS-aware DB reads/writes
   - Server actions and error wrappers
   - Prompt contract/tool schema alignment

4. **Look for non-determinism and env drift**
   - Timezone/date assumptions
   - Missing env vars
   - Seed/migration mismatch
   - Flaky async waits in UI tests

5. **Decide disposition**
   - Fix now (default)
   - Quarantine with explicit TODO + task entry (only if blocker is external)

## 5) Common failure patterns and quick diagnostics

- Type errors after schema changes:
  - Run `pnpm run typecheck` and inspect changed schema/type files first.
- Playwright auth failures:
  - Verify local auth callbacks and Supabase session setup.
- Migration-related test failures:
  - Re-check migration ordering and seed expectations.
- Prompt regressions:
  - Run `pnpm run eval:prompts`, inspect changed prompt wording and output schema assumptions.

## 6) CI parity expectation

Local checks should mirror CI expectations:
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- Playwright workflow for E2E

If CI fails while local passes, capture:
- failing command
- failing test name
- environment difference
- immediate mitigation in `docs/TASKS.md`


## 7) Vercel deployment UAT (manual)

For modality-focused manual UAT on Vercel (text/image/audio/file/chips), use `docs/UAT_VERCEL.md` as the canonical checklist and pass/fail reporting template.
