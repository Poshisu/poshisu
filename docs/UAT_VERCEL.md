# UAT_VERCEL.md

This runbook defines a fast, repeatable User Acceptance Testing (UAT) pass for Vercel preview/production deployments, focused on meal logging modalities.

## 1) Scope and prerequisites

- Scope: manual validation of chat meal logging across:
  - text
  - image
  - audio
  - file upload
  - quick-action chips
- Environment: Vercel Preview (recommended) or Production.
- Tester prerequisites:
  - Test account with onboarding completed.
  - Browser with DevTools access.
  - Access to application logs (Vercel + product telemetry/Supabase logs).

## 2) Global capture requirements (for every fail)

If any step fails, always capture the following fields before retrying:

- Screenshot (full page + visible timestamp)
- Browser console output (error + warning lines)
- Request ID (from network response headers/body or backend log correlation ID)
- User ID hash (never raw user ID/email)

Use the template in section 6 so failures are agent-consumable.

## 3) Exact modality test steps

> Run each modality test independently in a fresh chat thread when possible.

### A) Text meal log

#### Steps
1. Sign in to the target Vercel environment.
2. Open the chat surface.
3. Send: `I had 2 idlis, 1 bowl sambar, and coconut chutney for breakfast.`
4. Wait for assistant response.
5. If confirm/save flow exists, confirm the entry.

#### Expected UI outcome
- User message appears immediately in transcript.
- Assistant returns a structured estimate or clarification prompt.
- No crash, blank state, or infinite spinner.
- If save flow exists, success feedback appears and meal is reflected in relevant UI (e.g., Today).

#### Expected backend outcome/logs
- One authenticated chat request is recorded.
- Orchestrator/router path indicates text handling path.
- Assistant response payload is stored/logged with safe envelope.
- If confirmed, meal persistence write succeeds and is attributable to the current user.

---

### B) Image meal log

#### Steps
1. Open chat surface.
2. Upload a food image (clear plate photo).
3. Add optional text: `Lunch`.
4. Submit.
5. Confirm/save if prompted.

#### Expected UI outcome
- Upload preview renders before submit (or clear upload state indicator appears).
- Assistant acknowledges image input and provides estimate/clarification.
- No client-side upload errors for supported image types/sizes.

#### Expected backend outcome/logs
- Multipart/file ingestion request is accepted.
- Media metadata is captured (type/size), without exposing sensitive internals to UI.
- Image-handling pipeline records processing step and downstream agent call.
- If saved, persisted meal row includes image-linked context where supported.

---

### C) Audio meal log

#### Steps
1. Open chat surface.
2. Record or upload a short voice note describing a meal.
3. Submit audio.
4. Verify transcript/interpretation appears.
5. Confirm/save if prompted.

#### Expected UI outcome
- Recording/upload state is visible.
- Transcription progress and completion state are user-visible.
- Assistant response uses transcribed content without freezing UI.

#### Expected backend outcome/logs
- Audio ingest accepted and routed to transcription service.
- Transcript artifact logged (redacted/safe as per policy).
- Downstream chat/orchestrator request uses transcript text.
- If save flow exists, meal persistence succeeds.

---

### D) File-based meal log

#### Steps
1. Open chat surface.
2. Upload a supported file (e.g., image/pdf per current product constraints).
3. Add note: `Please log this meal`.
4. Submit and observe response.
5. Confirm/save if prompted.

#### Expected UI outcome
- Unsupported files are rejected with clear validation message.
- Supported files show ready/submitted state.
- Assistant response references file context or asks for required clarification.

#### Expected backend outcome/logs
- File validation executes at trust boundary.
- Rejected files produce safe error envelope (no stack traces leaked).
- Accepted files are processed by the expected pipeline path.
- If saved, persistence event ties to same request/session chain.

---

### E) Quick-action chips

#### Steps
1. Open chat surface where chips are visible.
2. Click one chip (e.g., `Log breakfast` / equivalent).
3. Complete any prompted input.
4. Submit and confirm/save if prompted.

#### Expected UI outcome
- Chip press inserts/prefills expected intent text.
- Focus remains accessible and keyboard navigation still works.
- Assistant handles chip-triggered input consistently with typed input.

#### Expected backend outcome/logs
- Chip-origin request is logged with the same auth/session guarantees as typed requests.
- Intent/routing is correctly inferred for chip payload.
- No divergence in persistence or safety checks due to chip source.

## 4) Cross-modality regression checks

Run after all modality-specific tests:

1. Reload app and confirm prior successful logs remain visible where expected.
2. Verify no duplicate meal rows for single confirmation actions.
3. Verify failed modality attempts did not create partial/corrupt entries.
4. Confirm rate-limit and fallback behavior remain user-safe (clear retry messaging).

## 5) Failure triage fields (required)

Use these fields for every failed step:

- `environment`: preview URL or production URL
- `build_id` / commit SHA (if available)
- `timestamp_utc`
- `modality`: text | image | audio | file | chips
- `test_step`
- `expected_result`
- `actual_result`
- `screenshot_path_or_url`
- `console_errors`
- `request_id`
- `user_id_hash`
- `severity`: blocker | major | minor
- `reproducible`: yes | no | intermittent
- `notes`

## 6) Fast pass/fail template (copy/paste)

```md
## UAT Result — <environment> — <YYYY-MM-DD>

| Modality | Status (PASS/FAIL) | UI Outcome | Backend Outcome | Evidence |
|---|---|---|---|---|
| Text | PASS/FAIL | <short note> | <short note> | <screenshot/log ref> |
| Image | PASS/FAIL | <short note> | <short note> | <screenshot/log ref> |
| Audio | PASS/FAIL | <short note> | <short note> | <screenshot/log ref> |
| File | PASS/FAIL | <short note> | <short note> | <screenshot/log ref> |
| Chips | PASS/FAIL | <short note> | <short note> | <screenshot/log ref> |

### Failure details

#### Failure <N>
- environment:
- build_id:
- timestamp_utc:
- modality:
- test_step:
- expected_result:
- actual_result:
- screenshot_path_or_url:
- console_errors:
- request_id:
- user_id_hash:
- severity:
- reproducible:
- notes:
```

## 7) Exit criteria

UAT pass is complete when:

- All five modalities are marked PASS, or
- Any FAIL has a fully completed failure triage block and linked evidence for engineering follow-up.
