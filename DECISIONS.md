# DECISIONS (ADR Log)

Record meaningful architectural and process decisions here.

---

## 2026-05-01 — Standardize execution-tracking documentation files

### Context
The repository needed a consistent way to track active work, handoff state, and architecture/process decisions so contributors and coding agents can coordinate safely.

### Options considered
1. Keep documentation only in ad-hoc PR descriptions.
2. Track everything inside a single monolithic `README.md` section.
3. Create dedicated operational docs (`TASKS.md`, `DECISIONS.md`, `HANDOFF.md`) and optional `BACKLOG.md`.

### Decision
Adopt dedicated lifecycle files at repo root:
- `TASKS.md` for active task tracking with owner and verification command.
- `DECISIONS.md` for ADR-style decisions.
- `HANDOFF.md` for current branch execution context.
- `BACKLOG.md` for unscheduled ideas only.

### Tradeoffs
- **Pros:** clear ownership, easier async collaboration, auditable decision history, reduced context loss.
- **Cons:** additional maintenance overhead and risk of staleness if not updated with each meaningful change.

### Migration path
If the project later adopts an external issue tracker or ADR system, keep these files as mirrors during transition and then replace with links to the source-of-truth system.
