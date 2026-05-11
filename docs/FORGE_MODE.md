# FORGE_MODE — Hermes/Codespaces Startup Prompt Contract

## Purpose
This file is the **single source of truth** for the startup prompt used in Hermes/Forge (Codespaces) sessions.

Use this when launching a fresh agent session so execution, documentation parity, and quality gates remain consistent with repo operating rules.

## Non-negotiables
- Treat the startup prompt block below as versioned code.
- Copy/paste the startup prompt **exactly as written** (no edits, no omissions).
- Any change to this file must include a matching rationale entry in `docs/DECISIONS.md`.
- If this file conflicts with repo policy, `AGENTS.md` + source-of-truth precedence still applies.

## Standard workflow
1. Start a new Hermes/Forge session in Codespaces at the repo root.
2. Paste the startup prompt from the section below exactly.
3. Require the agent to run session-start reads in this order:
   - `AGENTS.md`
   - `docs/TASKS.md`
   - `docs/DECISIONS.md`
   - `docs/BUILD_PLAN.md`
   - `README.md`
4. Execute work in small, reviewable commits.
5. Before commit, run required review lanes + relevant tests.
6. Update docs in the same PR for behavior/process changes.

## Startup prompt text (copy/paste exactly)
```text
You are working in the Nourish repository.

Follow these rules strictly:
1) Read in order before any code changes:
   - AGENTS.md
   - docs/TASKS.md
   - docs/DECISIONS.md
   - docs/BUILD_PLAN.md
   - README.md
2) Use package.json as source of truth for versions and scripts.
3) Keep scope PR-sized and use conventional commits.
4) If behavior or process changes, update docs in the same PR (README, TASKS, DECISIONS, and others as affected).
5) Run required review lanes before commit:
   - code-reviewer (all changes)
   - security-reviewer (auth/API/DB/agent/secrets)
   - accessibility-auditor (UI)
   - test-writer (new behavior needing tests)
   - db-migration (migration files)
   - prompt-evaluator + npm run eval:prompts (prompt changes)
6) Never treat planned docs as implemented behavior.
7) Before final handoff, report exact verification commands and pass/fail status.

First response requirements:
- Provide a short repo understanding summary.
- List assumptions and risks.
- Provide a step-by-step implementation plan.
- Provide a first-task onboarding report using the template in docs/FORGE_MODE.md.
```

## First-task onboarding report template
Use this in the first substantive response of a new Hermes/Forge session.

```md
## First-task onboarding report

### Repo understanding
- Current phase:
- Active priority:
- Relevant source-of-truth files reviewed:

### Task interpretation
- Requested outcome:
- In-scope:
- Out-of-scope:

### Assumptions
1.
2.

### Risks
- Product/UX:
- Technical:
- Security/privacy:
- Delivery:

### Plan
1.
2.
3.

### Verification plan
- Commands:
- Expected outcomes:

### Documentation impact
- Files to update:
- Planned vs implemented labeling impact:
```

## Output format requirements
For each meaningful task response, keep this order:
1. ELI5
2. Goal / interpretation
3. Risks and assumptions
4. Recommended approach
5. Architecture / flow
6. Implementation plan
7. Verification plan
8. Pitfalls and fixes
9. Final next steps

Also include:
- Exact commands for checks/tests.
- Explicit pass/fail/blocked results.
- File references for all changed docs/code.
