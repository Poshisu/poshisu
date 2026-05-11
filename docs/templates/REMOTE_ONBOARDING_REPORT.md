# Remote Onboarding Report Template

> Use this report before making any edit PR to document repository understanding and reduce implementation risk.

## Instructions
- Complete every section below before proposing code or documentation edits.
- **Evidence pointers are required in every section**: include exact file paths you read, and when useful include line anchors or command output references.
- Prefer primary source files (e.g., `package.json`, actual route/source files, CI configs, deployment configs) over secondary narrative docs.
- Mark unknowns explicitly under **Open questions/blockers**.

## Architecture
- Summarize the currently implemented architecture (not planned-only items).
- Include key runtime boundaries (web app, APIs, DB, agents/functions, background jobs).
- Add a short data flow from user action to persistence and response.
- **Evidence pointers (required):**
  - `...`

## Framework/package manager
- Identify framework version(s), runtime(s), and package manager from source-of-truth files.
- Note any version-policy statements and mismatches between docs vs code.
- **Evidence pointers (required):**
  - `...`

## Run/build/test commands
- List the canonical local commands for install, dev, lint, typecheck, unit/integration tests, e2e, and build.
- Call out environment prerequisites and known caveats.
- **Evidence pointers (required):**
  - `...`

## CI/Vercel setup
- Summarize CI workflow(s), required checks, and branch/PR expectations.
- Document Vercel-related setup and preview/production expectations if present.
- **Evidence pointers (required):**
  - `...`

## Risky areas
- Identify likely failure hotspots (security, migrations, auth, agent safety, data integrity, flaky tests, deploy risk).
- Classify each risk by severity and likely impact.
- **Evidence pointers (required):**
  - `...`

## Recommended AGENTS improvements
- Propose concrete AGENTS.md improvements that would reduce onboarding ambiguity or execution risk.
- Keep recommendations actionable and scoped.
- **Evidence pointers (required):**
  - `...`

## Open questions/blockers
- List ambiguities, missing credentials/services, unclear ownership, and dependencies requiring PM/founder input.
- Note what can proceed safely despite each blocker.
- **Evidence pointers (required):**
  - `...`
