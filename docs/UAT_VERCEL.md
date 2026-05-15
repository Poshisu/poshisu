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

## 7) Recorded UAT result — Production — 2026-05-15

- environment: `https://poshisu.vercel.app`
- build_id / commit SHA: `42d36814c211746e59b60232b4d8fcf41508ae37` (post-PR #88 production smoke target)
- timestamp_utc: `2026-05-15T08:56:31Z` to `2026-05-15T09:00:00Z`
- tester account: disposable UAT account; raw email redacted from committed evidence
- browser: Hermes Browserbase Chromium + unauthenticated `curl` probes
- screenshots: `docs/uat/2026-05-15-s7-t01/screenshots/`

| Modality | Status (PASS/FAIL) | UI Outcome | Backend Outcome | Evidence |
|---|---|---|---|---|
| Text | FAIL | Authenticated `/chat` has no text composer/message input, so the prescribed idli/sambar text meal cannot be submitted. Existing default confirm-save card renders. | Text handling path not exercised from UI; default confirm-save persistence works after clicking the only available save CTA. | `screenshots/02-chat-no-composer.png`, `screenshots/03-today-saved-meal.png` |
| Image | FAIL | No image upload control on `/chat`; onboarding shows `Photo upload coming soon` and `Camera coming soon` disabled. | Image ingestion path not exercised from UI. | `screenshots/01-onboarding-disabled-modalities.png`, `screenshots/02-chat-no-composer.png` |
| Audio | FAIL | No audio/mic control on `/chat`; onboarding shows `Voice coming soon` disabled. | Audio ingest/transcription path not exercised from UI. | `screenshots/01-onboarding-disabled-modalities.png`, `screenshots/02-chat-no-composer.png` |
| File | FAIL | No file attachment control on `/chat`; onboarding shows `File upload coming soon` disabled. | File validation/processing path not exercised from UI. | `screenshots/01-onboarding-disabled-modalities.png`, `screenshots/02-chat-no-composer.png` |
| Chips | FAIL | Onboarding quick-action chips worked for `None`, `Vegetarian`, and `09:00 13:00 19:00`, but the S7 chat-surface chip modality failed because `/chat` itself has no visible quick-action chips beyond the default confirm-save CTA. | Chip-origin chat meal logging was not exercised from UI; only onboarding chip-origin inputs persisted into completed profile setup. | `screenshots/01-onboarding-disabled-modalities.png`, browser transcript observation |

### Additional production smoke results

- PASS: `/login` rendered without browser JS errors.
- PASS: unauthenticated `/chat` redirected to `/login`; unauthenticated probe final URL was `https://poshisu.vercel.app/login` with HTTP 200 after redirect.
- PASS: disposable signup reached onboarding immediately; onboarding completion redirected to authenticated `/chat`.
- PASS: default meal confirmation saved and appeared on `/today` as Lunch (`2 rotis and a bowl of dal`, 470 kcal, 83% confidence).
- PASS: browser console reported no JS errors during the manual signup/onboarding/chat/save path in Hermes Browserbase.
- FAIL: modality UAT for text/image/audio/file/chips remains blocked by product surface gaps rather than backend/runtime crashes.

### Failure details

#### Failure 1 — Text meal log UI missing
- environment: `https://poshisu.vercel.app`
- build_id: `42d36814c211746e59b60232b4d8fcf41508ae37`
- timestamp_utc: `2026-05-15T08:58:00Z`
- modality: text
- test_step: Open authenticated `/chat` and send `I had 2 idlis, 1 bowl sambar, and coconut chutney for breakfast.`
- expected_result: Visible text composer/message input, Send button, assistant estimate/clarification, and optional confirm-save flow.
- actual_result: `/chat` only showed a static default estimate card for `2 rotis and dal` with `Looks right — save meal`; no text input/composer was visible.
- screenshot_path_or_url: `docs/uat/2026-05-15-s7-t01/screenshots/02-chat-no-composer.png`
- console_errors: none captured in Hermes Browserbase console.
- request_id: none generated for the blocked modality submit path; no text-submit request could be issued because the composer was absent. Supporting unauthenticated route probe captured Vercel request ID `bom1::iad1::94wmm-1778835655649-c0d28475f2f2` for `/chat` → `/login` redirect.
- user_id_hash: `f9d95788accde89f` (SHA-256 prefix of disposable UAT email; raw email redacted).
- severity: blocker
- reproducible: yes; same known issue recorded in `docs/dogfood/2026-05-14-production-ui/report.md`.
- notes: This blocks the core S7-T01 text meal logging UAT path.

#### Failure 2 — Image/camera upload UI unavailable
- environment: `https://poshisu.vercel.app`
- build_id: `42d36814c211746e59b60232b4d8fcf41508ae37`
- timestamp_utc: `2026-05-15T08:57:00Z`
- modality: image
- test_step: Open chat/onboarding surfaces and look for image upload or camera controls.
- expected_result: Supported image upload/camera control renders, upload preview or ready state appears, and assistant acknowledges image context.
- actual_result: Authenticated `/chat` showed no image/camera controls. Onboarding displayed disabled controls: `Photo upload coming soon` and `Camera coming soon`.
- screenshot_path_or_url: `docs/uat/2026-05-15-s7-t01/screenshots/01-onboarding-disabled-modalities.png`, `docs/uat/2026-05-15-s7-t01/screenshots/02-chat-no-composer.png`
- console_errors: none captured in Hermes Browserbase console.
- request_id: none generated for the blocked modality submit path; no upload request could be issued because no enabled image/camera control exists.
- user_id_hash: `f9d95788accde89f` (SHA-256 prefix of disposable UAT email; raw email redacted).
- severity: major
- reproducible: yes.
- notes: Product copy clearly marks this modality as not active yet.

#### Failure 3 — Audio meal log UI unavailable
- environment: `https://poshisu.vercel.app`
- build_id: `42d36814c211746e59b60232b4d8fcf41508ae37`
- timestamp_utc: `2026-05-15T08:57:00Z`
- modality: audio
- test_step: Open chat/onboarding surfaces and look for recording, voice note, or audio upload controls.
- expected_result: Recording/upload state is visible and transcription progress/result can be verified.
- actual_result: Authenticated `/chat` showed no audio/mic controls. Onboarding displayed disabled `Voice coming soon` control.
- screenshot_path_or_url: `docs/uat/2026-05-15-s7-t01/screenshots/01-onboarding-disabled-modalities.png`, `docs/uat/2026-05-15-s7-t01/screenshots/02-chat-no-composer.png`
- console_errors: none captured in Hermes Browserbase console.
- request_id: none generated for the blocked modality submit path; no transcription request could be issued because no enabled audio/voice control exists.
- user_id_hash: `f9d95788accde89f` (SHA-256 prefix of disposable UAT email; raw email redacted).
- severity: major
- reproducible: yes.
- notes: Backend transcription code exists, but this UAT confirms no production UI path exposes it.

#### Failure 4 — File meal log UI unavailable
- environment: `https://poshisu.vercel.app`
- build_id: `42d36814c211746e59b60232b4d8fcf41508ae37`
- timestamp_utc: `2026-05-15T08:57:00Z`
- modality: file
- test_step: Open chat/onboarding surfaces and look for file attachment controls.
- expected_result: Supported files show ready/submitted state, unsupported files are rejected with safe validation, and assistant references file context or asks clarification.
- actual_result: Authenticated `/chat` showed no file attachment control. Onboarding displayed disabled `File upload coming soon` control.
- screenshot_path_or_url: `docs/uat/2026-05-15-s7-t01/screenshots/01-onboarding-disabled-modalities.png`, `docs/uat/2026-05-15-s7-t01/screenshots/02-chat-no-composer.png`
- console_errors: none captured in Hermes Browserbase console.
- request_id: none generated for the blocked modality submit path; no file validation/processing request could be issued because no enabled file control exists.
- user_id_hash: `f9d95788accde89f` (SHA-256 prefix of disposable UAT email; raw email redacted).
- severity: major
- reproducible: yes.
- notes: This blocks file-based meal logging acceptance until the UI is implemented or the modality is explicitly descoped.

#### Failure 5 — Chat quick-action chips unavailable
- environment: `https://poshisu.vercel.app`
- build_id: `42d36814c211746e59b60232b4d8fcf41508ae37`
- timestamp_utc: `2026-05-15T08:57:00Z`
- modality: chips
- test_step: Complete onboarding, open authenticated `/chat`, and look for meal-logging quick-action chips.
- expected_result: Chat-surface chips can trigger a meal logging path or suggested next action without requiring free-form typing.
- actual_result: Onboarding chips worked during setup, but authenticated `/chat` showed no meal-logging quick-action chips beyond the default confirm-save CTA on the seeded meal card.
- screenshot_path_or_url: `docs/uat/2026-05-15-s7-t01/screenshots/02-chat-no-composer.png`
- console_errors: none captured in Hermes Browserbase console.
- request_id: none generated for the blocked chip-origin chat path; no chip-triggered chat request could be issued because no chat chips exist.
- user_id_hash: `f9d95788accde89f` (SHA-256 prefix of disposable UAT email; raw email redacted).
- severity: major
- reproducible: yes.
- notes: Onboarding chips remain a separate PASS observation; they do not satisfy the Stage 7 chat meal-logging chip modality.

### Defect follow-up candidates

- S7-UAT-D01 / blocker: build or restore an authenticated `/chat` meal logging composer with text input, Send button, transcript/assistant response, loading/error states, and confirm-save handoff.
- S7-UAT-D02 / major: expose or formally descope image/camera upload for meal logging; if exposed, add upload preview, validation, and production-safe smoke evidence.
- S7-UAT-D03 / major: expose or formally descope audio/voice meal logging; if exposed, add recording/upload state, transcription progress, and production-safe smoke evidence.
- S7-UAT-D04 / major: expose or formally descope file-based meal logging; if exposed, add file validation and safe error states.
- S7-UAT-D05 / major: clarify and implement the Stage 7 chip modality on `/chat`, or formally document onboarding-only chips as the intended scope.

## 8) Exit criteria

UAT pass is complete when:

- All five modalities are marked PASS, or
- Any FAIL has a fully completed failure triage block and linked evidence for engineering follow-up.
