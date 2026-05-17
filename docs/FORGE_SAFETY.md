# Forge Safety Contract

This document defines the repository-local guardrails for Forge/Hermes or any remote coding agent operating on `Poshisu/poshisu`.

The goal is to let an agent contribute safely without disturbing an already-advanced build.

## Non-negotiable rules

1. **Never push directly to `main`.**
   - All work must happen on a focused branch.
   - All code changes must go through a pull request.

2. **Never merge without explicit human approval.**
   - Green CI/Vercel is not permission to merge.
   - The agent reports status and waits.

3. **Never touch production secrets or billing/admin settings without explicit approval.**
   - Forbidden unless explicitly requested: `.env*`, Vercel settings, GitHub repo settings, Supabase project settings, payment/billing configuration, production credentials, API keys, OAuth secrets, webhooks, deployment targets.
   - If a task appears to require secrets, stop and ask for a safer path.

4. **No destructive git operations.**
   - Forbidden unless explicitly approved: `git push --force`, `git reset --hard`, deleting branches, rewriting history, mass file deletion, changing default branch, disabling CI.

5. **No broad refactors hidden inside feature work.**
   - Keep diffs small and reviewable.
   - Refactors need their own branch/PR unless essential to the task.

6. **Plan before non-trivial changes.**
   - For product, auth, database, agent, privacy, security, prompt, onboarding, or multi-file changes, first produce a short plan with files touched, risks, tests, and rollback.
   - Wait for approval before implementation unless the user explicitly asked for autonomous execution.

7. **Respect source-of-truth order.**
   - Follow `AGENTS.md` first, then `docs/TASKS.md`, `docs/DECISIONS.md`, `docs/BUILD_PLAN.md`, and the live code.
   - Do not treat planned docs as implemented behavior.

8. **Preserve user data and privacy boundaries.**
   - Do not add telemetry, logging of user health data, prompt contents, auth tokens, or PII without explicit review.
   - Do not paste secrets or raw personal data into PRs, logs, issue comments, or chat.

## Standard branch → PR workflow

1. Sync `main`.
2. Create branch using a clear prefix:
   - `feat/...`
   - `fix/...`
   - `docs/...`
   - `test/...`
   - `chore/...`
3. Make a focused change.
4. Run relevant local checks:
   - `pnpm run lint`
   - `pnpm run typecheck`
   - targeted tests for changed behavior
   - `pnpm run test:e2e ...` when E2E-relevant and local dependencies are available
5. Commit with a conventional commit message.
6. Push branch.
7. Open PR with:
   - summary
   - validation commands/results
   - risk notes
   - rollback plan
   - docs impact
8. Wait for GitHub checks and Vercel preview.
9. Report PR, preview/check status, and any blockers.
10. Do not merge until human approval.

## Required pre-change checklist

Before editing files, the agent must answer internally:

- Is this change in scope for the user's request?
- Does it touch auth, database, privacy, prompts, onboarding copy, or production configuration?
- Does it require a plan and approval first?
- Which docs need to stay in sync?
- What tests prove the change works?
- What is the rollback path?

## Escalation triggers

Stop and ask before proceeding if the task would:

- alter authentication, authorization, RLS, or user identity behavior
- change onboarding questions, consent language, or safety policy
- modify database migrations or production data flows
- introduce or rotate secrets
- change model routing or materially affect API cost
- touch deployment settings, domains, Vercel, Supabase, or GitHub settings
- require force-push, history rewrite, or destructive cleanup
- conflict with existing docs or product direction

## Default safe response when blocked

When blocked by a safety rule, the agent should report:

- what it was trying to do
- which safety rule blocked it
- the safest alternative
- exactly what approval or input is needed

## Human owner controls

Atreya can override a rule for a specific action by giving explicit instruction in chat or in a GitHub review comment. Overrides should be narrow, one-time, and captured in the PR body when relevant.
