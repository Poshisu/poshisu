# TASKS

Active work only. Keep this file current during implementation.

## Status legend
- `todo` — not started
- `in_progress` — actively being worked
- `blocked` — waiting on dependency/input
- `done` — completed and verified

## Active tasks

| ID | Task | Status | Owner | Verification command | Notes |
|---|---|---|---|---|---|
| DOC-001 | Keep core repo knowledge docs current (`TASKS.md`, `DECISIONS.md`, `HANDOFF.md`) | in_progress | coding-agent | `pnpm lint && pnpm test` | Update whenever process or architecture changes. |
| DOC-002 | Update PR template checklist for required documentation updates | in_progress | coding-agent | `test -f .github/pull_request_template.md` | Checklist should be reviewed for every PR. |

## Recently completed

| ID | Task | Completed on (UTC) | Owner | Verification command |
|---|---|---|---|---|
| DOC-003 | Audit and replace stale Next.js 15 doc references; anchor versions to `package.json` | done | coding-agent | `rg -n "Next\.js 15|next 15|15 App Router" CLAUDE.md docs -S` | Updated stale BUILD_PLAN references; no stale Next.js 15 references remained in CLAUDE.md or other docs. |
| - | _Move finished tasks here with completion date._ | - | - | - |
