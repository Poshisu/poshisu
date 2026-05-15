# Meal Log MVP Acceptance Criteria

_Last updated: 2026-05-15_

## Purpose
This document defines the **full meal-log MVP acceptance gate** for the eventual multimodal meal logging loop (text/photo/voice → estimate → confirm/correct → save → visible in Today).

## Closed beta scope override

For the Stage 7 closed beta launch gate, `docs/BETA_LAUNCH_CHECKLIST.md` is the source of truth. The closed beta is intentionally **text-first**: text meal logging is in scope, while photo/image and voice/audio remain deferred unless a later PR exposes those controls with UAT, accessibility, and safe-error evidence.

Do not use this full multimodal MVP gate to claim that photo/image or voice/audio are required for the first closed beta cohort. Use it as the future acceptance target when those modalities are promoted into beta scope.

## Problem statement
Users need fast, trustworthy, safe meal estimates with low friction and clear correction controls.

## Target user
Urban Indian adults (25-45) with mixed goals (weight, glucose, energy) who want a coach-like meal logging experience.

## User story
As a user, I can log a meal via text/photo/voice, get a quick estimate with confidence and brief reasoning, clarify if needed, and save a corrected/confirmed meal to Today.

## In-scope for this MVP gate
- Text, photo, and voice meal logging
- Estimate card with kcal/macro/micro ranges
- Confidence label on estimate
- One-line prep + rough ingredients rationale (brief, optional bracket detail)
- Clarification loop with capped turns
- Confirm/correct/save flow
- Saved meal appears in Today
- Deterministic allergy/condition safety flags

## Non-goals for this gate
- Perfect gram-level precision
- Multilingual response quality parity
- External ordering ingestion (Swiggy/Zomato)
- Advanced long-term personalization

## Acceptance criteria (must all pass)

### A. Core flow behavior
1. Text meal log returns an estimate and supports confirm/correct.
2. Photo meal log returns an estimate and supports confirm/correct.
3. Voice meal log transcribes then returns an estimate and supports confirm/correct.
4. Confirmed meal is visible in Today with persisted ranges and timestamp.

### B. UX states
1. Loading state is visible for estimate generation and save.
2. Empty state guidance appears when no meal content is provided.
3. Recoverable error state provides retry.
4. Success state confirms save and updates UI.

### C. Latency targets (typical)
1. Text response typically <= 5 seconds.
2. Photo response typically <= 8 seconds.
3. Voice response typically <= 8 seconds.

### D. Clarifying question policy
1. If confidence is too low, ask clarifying questions.
2. Max clarifying questions in primary loop: **2**.
3. If user leaves required clarifiers unanswered, ask once more for only missing clarifiers.
4. If still unanswered, continue with widened ranges and explicit low-confidence label.

### E. Estimate quality policy
1. Macro estimate error target: <= 10% on eval baseline sets.
2. Micro estimate error target: <= 10% on eval baseline sets.
3. Calorie estimate includes confidence + one-line prep rationale with rough ingredient/quantity hints (kept brief).

### F. Safety policy
1. Allergen conflicts are flagged and unsafe suggestions are blocked.
2. Condition conflicts are flagged deterministically.
3. No diagnosis/treatment claims in meal estimate responses.

### G. Security and access
1. Auth required for meal logging routes.
2. User-scoped access only (RLS/authorization).
3. No internal stack traces in user-visible responses.

## Required test scenarios (minimum)

### Functional
- Text happy path: estimate -> confirm -> Today visible.
- Photo happy path: estimate -> confirm -> Today visible.
- Voice happy path: transcribe -> estimate -> confirm -> Today visible.
- Correct path: user edits estimate and saves corrected values.

### UX states
- Loading state shown and controls disabled during in-flight operations.
- Empty input path returns actionable guidance.
- Error path returns retry affordance and succeeds on retry.

### Clarification policy
- Low-confidence meal triggers clarifier #1 and #2 only.
- Missing clarifier response triggers one final missing-only prompt.
- Non-response after that returns widened-range estimate with low confidence.

### Estimate output format
- Confidence label appears in estimate card/response metadata.
- Calorie explanation is one-liner and brief.

### Safety/security
- Allergy conflict test case blocks unsafe suggestion.
- Condition conflict case surfaces deterministic warning.
- Cross-user access denied by API/DB policy tests.

## Verification commands (target gate)
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test -- src/lib/nutrition src/lib/safety src/lib/meals`
- `pnpm run test -- src/app/api/chat src/app/api/meals`
- `pnpm run test:e2e -g onboarding`
- `pnpm run test:e2e -g "meal|today"`

## Eval scaffolding recommendation (start now, scale later)
We do **not** need full expensive evals immediately, but we should prepare lightweight scaffolding now:
1. Add `tests/prompts/meal-log-baseline.json` fixture schema (inputs, expected bands, flags).
2. Add `scripts/eval-meal-log.ts` runner that scores latency, confidence usage, clarifier turns, and safety flags.
3. Run locally/on-demand first; add CI gating only after baseline stabilizes.
4. Track baseline output in `docs/EVALS.md` with date-stamped results.

This keeps eval adoption incremental and low-cost while preserving an easy path to stricter CI enforcement later.
