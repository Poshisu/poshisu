# Closed Beta and Launch Checklist

This is the Stage 7 operating packet for moving Nourish/Poshisu from internal QA to a controlled closed beta. It deliberately separates what engineering can verify in-repo from what requires founder/product owner action with real beta users.

## Beta scope decision

Closed beta is **text-first meal logging plus the trust/readiness surfaces already implemented**. The beta should not imply that every originally planned modality is production-ready.

- **In closed beta scope:** onboarding, authenticated `/chat` text meal logging, confirm-save to Today, Today review/corrections, Trends read-only review, Profile memory inspector, privacy export, guarded delete-account, accessibility-critical navigation, auth/session smoke, rollback/incident playbook.
- **Conditionally in scope:** chat quick-action chips only if they are visible on `/chat` and covered by the accessibility/UAT evidence for that build.
- **Deferred or explicitly out-of-scope for closed beta:** image/camera meal logging, audio/voice meal logging, and file-based meal logging unless a later PR exposes those controls with upload/transcription/validation evidence. Onboarding may continue to label those paths as coming soon.

## Closed beta cohort plan

Target: 10 beta users, onboarded manually by product/founder so feedback is high-signal and supportable.

Minimum cohort metadata to track outside the repo:

- beta user alias, never raw email in committed docs;
- device/browser/OS;
- onboarding completed: yes/no;
- first meal logged via text: yes/no;
- confirm-save completed: yes/no;
- Today entry visible after save: yes/no;
- Profile export/delete controls noticed: yes/no;
- support channel joined: yes/no;
- top friction note;
- go/no-go owner signoff.

## Feedback intake and triage

Use one active channel for the cohort: WhatsApp group, email alias, Linear project, or GitHub Issues. Do not split feedback across multiple uncontrolled inboxes.

Every feedback item should be normalized into this shape before engineering triage:

- `source`: user alias or internal tester;
- `environment`: production or preview URL;
- `build_sha`: Vercel/GitHub SHA when available;
- `route`: `/onboarding`, `/chat`, `/today`, `/trends`, `/profile`, auth, or other;
- `action`: what the tester attempted;
- `expected`: what should have happened;
- `actual`: what happened;
- `evidence`: screenshot/video/log link, with no personal health data or secrets;
- `severity`: blocker | major | minor;
- `frequency`: once | repeatable | many users;
- `owner`: product | engineering | support;
- `decision`: fix before beta expansion | monitor | defer | user education;
- `follow_up`: task/issue/PR link.

Severity rubric:

- **blocker:** prevents signup, onboarding, text meal logging, confirm-save, Today visibility, privacy export/delete, or causes privacy/safety/data-integrity risk.
- **major:** meaningful beta friction, repeated user confusion, accessibility issue, broken non-core surface, observability loss, or deferred modality accidentally appears available.
- **minor:** copy polish, visual polish, one-off low-impact issue, or already-known future-scope request.

## Launch gates

A closed beta launch candidate is ready for a go/no-go review only when every gate below is either `PASS` or explicitly `owner-blocked` with a named owner, date, and rationale. `owner-blocked` is not the same as completed; it is an auditable exception that allows the go/no-go owner to decide whether to proceed with known responsibility and risk.

### Engineering gates

- [x] CI on the launch candidate is green: lint, typecheck, unit/integration tests, prompt evals, build, DB types, scoped E2E. Evidence: PR #93 checks green for launch candidate SHA `dc23344`.
- [x] `pnpm run test:e2e -g accessibility` passes or records only documented local Docker/Supabase skips while GitHub Actions passes the Supabase-backed path. Evidence: Stage 7 accessibility gate and PR #93 scoped E2E remained green.
- [x] `pnpm run test:e2e:smoke` passes for unauthenticated protected-route redirect. Evidence: PR #93 App gates green and local S7-T04A verification passed.
- [x] Production UAT validates onboarding → text meal logging → confirm-save → Today visibility. Evidence: `2026-05-15T16:32:36Z` production sweep on `https://poshisu.vercel.app` passed signup, onboarding, `/chat` text estimate, confirm-save, and `/today` saved meal visibility using alias `internal-uat-001`.
- [x] No open blocker defects from `docs/UAT_VERCEL.md` for text meal logging. Evidence: production text meal UAT passed for alias `internal-uat-001`; no blocker/major text-path defects recorded in this sweep.
- [x] Non-beta modalities are either hidden/disabled/coming-soon or have their own evidence: image/camera meal logging, audio/voice meal logging, file-based meal logging. Evidence: production `/chat` sweep found no exposed usable image, mic/audio, or file upload controls (`image=0`, `mic=0`, `file=0`).
- [x] chat quick-action chips are either implemented and UAT-covered or explicitly outside closed beta scope. Evidence: production `/chat` sweep found no chat chips visible; chips remain outside closed beta scope for this candidate.
- [x] Privacy export and delete-account controls are reachable from Profile and covered by tests. Evidence: production `/profile` sweep saw Privacy & data controls, data export download control, and guarded permanent delete-account area; API/UI tests covered in S7-T03.
- [x] Rollback and incident response owner paths are documented in `RUNBOOK.md`. Evidence: S6-T03 runbook closure and CI parity coverage.
- [x] No hardcoded secrets, tokens, raw beta user emails, or personal health data in committed evidence. Evidence: only alias `internal-uat-001` is committed; local screenshots containing disposable test-account identifiers are not committed.

### Product/founder gates

- [ ] 10 beta users identified and invite order decided. **Owner-blocked:** product/founder to select cohort and invite order before first live cohort run.
- [ ] First two beta users are personally onboarded before inviting the remaining cohort. **Owner-blocked:** product/founder live onboarding still pending.
- [ ] Feedback channel is active and monitored daily during the first week. **Owner-blocked:** product/founder to nominate WhatsApp/email/Linear/GitHub channel and daily owner.
- [ ] Support response owner is assigned. **Owner-blocked:** support owner not yet named.
- [x] Beta positioning is explicit: text-first meal logging, estimates are approximate, not medical advice. Evidence: this checklist defines beta as text-first and excludes diagnosis/treatment/medical guidance.
- [ ] Privacy/terms/policy links are approved for beta distribution. **Owner-blocked:** product/founder/legal owner to approve externally shared policy links before inviting the real cohort.
- [ ] go/no-go owner signs off before expanding beyond the first cohort. **Owner-blocked:** final signoff pending after cohort feedback.

### Observability and operations gates

- [ ] Sentry receiving events or intentionally no-op with documented reason for beta. **Owner-blocked:** production telemetry owner must confirm or explicitly no-op.
- [ ] PostHog receiving events or intentionally no-op with documented reason for beta. **Owner-blocked:** production analytics owner must confirm or explicitly no-op.
- [ ] Web Push working on target devices or explicitly deferred from beta scope. **Owner-blocked:** product/ops to decide whether Web Push is in first cohort scope.
- [ ] Backup strategy is documented. **Owner-blocked:** ops/founder to confirm Supabase/Vercel backup posture for beta.
- [x] Incident response runbook is documented and linked. Evidence: `RUNBOOK.md` release rollback and incident checklist covered in S6-T03.
- [x] Production smoke checks have a dated evidence entry in `docs/TEST_EVIDENCE.md` or an external tracker. Evidence: S7-T04B-prep production UAT entry added on 2026-05-15.

## Go/no-go decision log

Use this block for each beta release candidate.

```md
### Candidate <YYYY-MM-DD> / <SHA>

- environment:
- build_sha:
- go/no-go owner:
- cohort size:
- engineering gate status: PASS | FAIL | owner-blocked
- product gate status: PASS | FAIL | owner-blocked
- observability/ops gate status: PASS | FAIL | owner-blocked
- blocker count:
- major count:
- known deferrals:
- decision: GO | NO-GO | GO WITH OWNER-BLOCKED EXCEPTIONS
- rationale:
- next review timestamp:
```

## Beta feedback triage board template

```md
### Feedback <ID>

- source:
- environment:
- build_sha:
- route:
- action:
- expected:
- actual:
- evidence:
- severity: blocker | major | minor
- frequency:
- owner:
- decision: fix before beta expansion | monitor | defer | user education
- follow_up:
```

## Deferred or explicitly out-of-scope for closed beta

These are not launch blockers if they remain hidden, disabled, or clearly marked as coming soon:

- image/camera meal logging;
- audio/voice meal logging;
- file-based meal logging;
- Web Push on every device/browser;
- non-English onboarding/chat;
- wearable ingestion;
- diagnosis, treatment planning, medication dosing, or emergency guidance.

If any deferred item is exposed as usable in the UI, it becomes in-scope and must have UAT, accessibility, and safe-error evidence before beta launch.


### Candidate 2026-05-15 / dc23344

- environment: production `https://poshisu.vercel.app`
- build_sha: `dc23344`
- go/no-go owner: product/founder — pending
- cohort size: 1 internal disposable UAT alias validated; 10-user external cohort pending
- engineering gate status: PASS for candidate prep UAT
- product gate status: owner-blocked — cohort selection, support channel, support owner, and policy/link approval pending
- observability/ops gate status: owner-blocked — Sentry/PostHog/Web Push/backup confirmations pending
- blocker count: 0 from production text-path UAT sweep
- major count: 0 from production text-path UAT sweep
- known deferrals: chat quick-action chips outside scope for this candidate; image/camera, audio/voice, file upload, Web Push breadth, non-English, wearables, and medical guidance remain deferred/out of closed beta scope
- decision: GO WITH OWNER-BLOCKED EXCEPTIONS for internal beta-candidate prep only; not a final 10-user cohort GO until product/ops owner-blocked gates are resolved
- rationale: production signup → onboarding → `/chat` text meal estimate → confirm-save → `/today` saved meal visibility → `/profile` privacy/export/delete controls passed for alias `internal-uat-001`; no usable deferred media/file controls were exposed on `/chat`; no console errors were observed beyond repeated non-blocking Permissions-Policy `web-share` warnings.
- next review timestamp: after product/founder selects cohort/support channel and confirms observability/backup posture
