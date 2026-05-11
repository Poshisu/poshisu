# Forge Mode Requirements

## Purpose
Forge mode standardizes how contributors and coding agents prepare changes before opening edit PRs.

## Mandatory pre-PR artifact
Before any edit PR is opened, Forge **must** create and complete:

- `docs/templates/REMOTE_ONBOARDING_REPORT.md`

The report must be filled with repository-specific findings and include section-level **evidence pointers** (exact file paths read) in every section.

## Enforcement
- PRs that do not include a completed remote onboarding report are not merge-ready.
- If repository understanding changes materially during implementation, update the report in the same PR.
