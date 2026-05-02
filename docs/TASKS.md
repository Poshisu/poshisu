# TASKS — Active Execution Plan

_Last updated: 2026-05-01_

## Current phase snapshot
- **Roadmap phase:** Late **Phase 0** / Early **Phase 1**
- **State:** foundation implemented; onboarding + chat intelligence not yet production-complete
- **Execution focus:** restart product delivery with chat-first onboarding and minimal end-to-end logging loop

## Milestone plan

### M1 — Documentation and execution system hardening (current)
Status: `in_progress`

| ID | Task | Files | Acceptance criteria | Verify | Status |
|---|---|---|---|---|---|
| DOC-001 | Finalize doc source-of-truth alignment | `README.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, `docs/BUILD_PLAN.md` | Next.js/runtime/version and planned-vs-implemented wording are consistent | `rg -n "Next\.js|planned|implemented" README.md docs/ARCHITECTURE.md CLAUDE.md docs/BUILD_PLAN.md` | done |
| DOC-002 | Maintain ADR log with key historical decisions | `docs/DECISIONS.md` | ADR template present + backfilled core decisions | `rg -n "ADR Template|## 2026-" docs/DECISIONS.md` | done |
| DOC-003 | Maintain active task ledger | `docs/TASKS.md` | Current phase + task table + owner/dependency visibility | `rg -n "Current phase snapshot|Milestone plan|Dependencies" docs/TASKS.md` | done |
| DOC-004 | Define Phase 1 onboarding product spec and copy contract | `docs/BUILD_PLAN.md`, `docs/TASKS.md`, `docs/PRD.md` | Mandatory/optional fields, completion rule, non-goals, UX states, consent and safety copy are explicit and consistent | `rg -n "onboarding product-spec contract|Exact consent copy|Exact safety copy|Phase 1 explicit non-goals|Required onboarding UX states" docs/BUILD_PLAN.md docs/TASKS.md docs/PRD.md` | done |

### M2 — Phase 1 completion (chat-first onboarding)
Status: `pending`

| ID | Task | Files | Acceptance criteria | Verify | Status |
|---|---|---|---|---|---|
| P1-001 | Ship chat-first onboarding entry flow | `src/app/(onboarding)/**`, `src/app/(app)/chat/**` | New user can complete required profile capture in chat without wizard dependency | `pnpm test:e2e -g onboarding` | pending |
| P1-002 | Persist onboarding-derived profile and safety fields | `src/lib/agents/*`, `src/lib/memory/*`, `supabase/migrations/*` | Profile memory row + core structured fields saved with validation | `pnpm test` | pending |
| P1-003 | Add onboarding failure/recovery UX states | `src/app/(onboarding)/**`, `src/components/**` | Loading/error/retry states implemented and accessible | `pnpm test && pnpm test:e2e -g onboarding` | pending |

### M3 — Phase 2 slice (minimum lovable meal logging)
Status: `pending`

| ID | Task | Files | Acceptance criteria | Verify | Status |
|---|---|---|---|---|---|
| P2-001 | Implement `/api/chat` orchestrator endpoint | `src/app/api/chat/route.ts`, `src/lib/agents/orchestrator.ts` | Authenticated chat request returns structured assistant response | `pnpm test` | pending |
| P2-002 | Integrate hybrid nutrition pipeline in request flow | `src/lib/nutrition/**`, `src/lib/safety/**` | Deterministic macro/micro ranges and safety checks executed for meal logs | `pnpm test` | pending |
| P2-003 | Save meal logs + show in Today page | `src/app/(app)/today/page.tsx`, DB access modules | Newly logged meal appears in Today with summary cards | `pnpm test:e2e -g meal` | pending |

## Dependencies on PM/founder (you)

1. Validate final legal/compliance wording for approved consent and safety copy before production release.
2. Provide **acceptance criteria for MVP meal log** (what is "good enough" for first beta users).
3. Confirm **risk posture** for fail-closed limiter and deferred CSP rollout in early beta.
4. Provide **test accounts and QA scenarios** for first realistic UAT pass.

## Blockers / risks
- No completed end-to-end chat logging flow yet (`/api/chat` still planned).
- Build plan contains historical wizard prompts that can confuse contributors if not clearly superseded.
- Core docs exist but several operational files (`HANDOFF.md`, `TESTING.md`, `SECURITY.md`) are still missing as first-class runbooks.
