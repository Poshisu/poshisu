<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Operating Spec for Multi-Agent Development

This file defines how any coding agent must operate in this repository.

## 1) Session start protocol (mandatory)
Read these files in this order before changing code:
1. `AGENTS.md`
2. `docs/TASKS.md`
3. `docs/DECISIONS.md`
4. `docs/BUILD_PLAN.md`
5. `README.md`

If any file is stale or missing required context, fix docs first in the same branch.

## 2) Source-of-truth precedence
When information conflicts, resolve with this order:
1. `package.json` (runtime/tool versions)
2. Current code and migrations
3. `docs/ARCHITECTURE.md`
4. `docs/BUILD_PLAN.md`
5. `README.md` and other narrative docs

Never treat planned docs as implemented behavior.

## 3) Delivery model and phase discipline
- The project is currently in **Late Phase 0 / Early Phase 1**.
- **Primary current priority:** ship chat-first onboarding and first end-to-end meal logging loop.
- Planned work must be tagged "planned" until merged and verified.

## 4) Required review lanes (run before every commit)
- `code-reviewer` for all changes
- `security-reviewer` for auth/API/DB/agent/secrets changes
- `accessibility-auditor` for UI changes
- `test-writer` for new behavior requiring tests
- `db-migration` for migration files
- `prompt-evaluator` + `npm run eval:prompts` for prompt changes

## 5) Definition of done for any PR
A change is not done unless:
- behavior is implemented
- tests are added/updated
- security implications reviewed
- docs updated (`README`, `docs/TASKS.md`, `docs/DECISIONS.md`, architecture as needed)
- planned vs implemented labels are accurate

## 6) Documentation parity gate
If behavior changes and docs are not updated in the same PR, the change is **not merge-ready**.

At minimum, update whichever of the following are affected:
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/BUILD_PLAN.md`
- `docs/TASKS.md`
- `docs/DECISIONS.md`
- `.github/PULL_REQUEST_TEMPLATE.md`

## 7) Engineering standards
- TypeScript strict; no unchecked `any`
- Server components by default
- Zod at trust boundaries
- No secrets in code
- RLS for user-scoped tables
- Append-only migrations
- No direct LLM SDK calls outside `src/lib/claude/client.ts`

## 8) Commit and PR hygiene
- Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- Small, reviewable diffs
- Include verification commands and results in PR body
- Include rollback notes for non-trivial behavior changes

## 9) PM/founder escalation triggers
Ask for PM/founder input before implementing when:
- safety policy tradeoffs change user outcomes
- onboarding questions/copy/consent text changes
- cost-impacting model/routing changes are proposed
- data retention/privacy policy changes are required
