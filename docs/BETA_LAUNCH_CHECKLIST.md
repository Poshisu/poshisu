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

- [ ] CI on the launch candidate is green: lint, typecheck, unit/integration tests, prompt evals, build, DB types, scoped E2E.
- [ ] `pnpm run test:e2e -g accessibility` passes or records only documented local Docker/Supabase skips while GitHub Actions passes the Supabase-backed path.
- [ ] `pnpm run test:e2e:smoke` passes for unauthenticated protected-route redirect.
- [ ] Production or preview UAT validates onboarding → text meal logging → confirm-save → Today visibility.
- [ ] No open blocker defects from `docs/UAT_VERCEL.md` for text meal logging.
- [ ] Non-beta modalities are either hidden/disabled/coming-soon or have their own evidence: image/camera meal logging, audio/voice meal logging, file-based meal logging.
- [ ] chat quick-action chips are either implemented and UAT-covered or explicitly outside closed beta scope.
- [ ] Privacy export and delete-account controls are reachable from Profile and covered by tests.
- [ ] Rollback and incident response owner paths are documented in `RUNBOOK.md`.
- [ ] No hardcoded secrets, tokens, raw beta user emails, or personal health data in committed evidence.

### Product/founder gates

- [ ] 10 beta users identified and invite order decided.
- [ ] First two beta users are personally onboarded before inviting the remaining cohort.
- [ ] Feedback channel is active and monitored daily during the first week.
- [ ] Support response owner is assigned.
- [ ] Beta positioning is explicit: text-first meal logging, estimates are approximate, not medical advice.
- [ ] Privacy/terms/policy links are approved for beta distribution.
- [ ] go/no-go owner signs off before expanding beyond the first cohort.

### Observability and operations gates

- [ ] Sentry receiving events or intentionally no-op with documented reason for beta.
- [ ] PostHog receiving events or intentionally no-op with documented reason for beta.
- [ ] Web Push working on target devices or explicitly deferred from beta scope.
- [ ] Backup strategy is documented.
- [ ] Incident response runbook is documented and linked.
- [ ] Production smoke checks have a dated evidence entry in `docs/TEST_EVIDENCE.md` or an external tracker.

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
