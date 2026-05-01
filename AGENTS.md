<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Session start protocol (mandatory)
At the start of every work session, read these files in this exact order:
1. `AGENTS.md`
2. `TASKS.md`
3. `DECISIONS.md`
4. `HANDOFF.md`

## Source-of-truth precedence
When information conflicts, resolve it using this precedence order (highest first):
1. `package.json`
2. Current implementation in code
3. Architecture documents (e.g., `ARCHITECTURE.md`)
4. README copy and other narrative docs

## Pre-merge consistency checks (required)
Before merge, verify and reconcile consistency across:
- **Versions**: dependency/runtime versions align across `package.json`, lockfiles, CI, and docs.
- **Routes**: documented routes match actual app/router/API route definitions.
- **Migrations**: schema/migration files align with code and deployment expectations.
- **Docs**: README and project docs reflect the implemented behavior (no stale claims).

## Mandatory documentation files and update triggers
Keep these files current. Update them whenever their trigger condition is met:
- `README.md`: setup/run/test/build/deploy commands or developer workflow changes.
- `TASKS.md`: scope, status, sequencing, or acceptance criteria changes.
- `DECISIONS.md`: any meaningful architecture/stack/tradeoff decision.
- `HANDOFF.md`: end-of-session status, blockers, risks, and next actions.
- `ARCHITECTURE.md`: component boundaries, data flow, integrations, or infra changes.
- `CHANGELOG.md`: user-visible or operationally significant changes.
- `TESTING.md`: test strategy, commands, fixtures, or coverage expectations change.
- `SECURITY.md`: auth model, threat model, secrets handling, or security controls change.

If a file does not yet exist but its trigger is met, create it in the same change set.

## Planned vs implemented features
Any feature not yet shipped in code must be explicitly labeled **"planned"** in all docs and status trackers.
Do not describe planned work as implemented.
