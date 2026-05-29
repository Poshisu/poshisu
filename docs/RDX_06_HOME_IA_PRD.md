# RDX-06 Home Information Architecture PRD

_Status: living product/design record. This PRD explains the current RDX-06 direction and may be changed by future PRs with an ADR/task update. It is **not** an immutable contract._

## Problem

The authenticated app had separate primary destinations for Chat and Today. That made the product feel like a set of utilities instead of a nutrition coach home. The MVP needs one calm Home surface where a user can understand today's nutrition state and immediately log a meal.

## Target user

A Nourish beta user in India who wants to log a meal quickly, see an approximate estimate, and understand how that meal affects today's nutrition without navigating between multiple tabs.

## Product goals

1. Make `/chat` behave as the Home surface for now.
2. Combine daily nutrition summary, today's meal preview, assistant replies, and meal logging composer into one flow.
3. Keep the UI premium, calm, organic, health-aware, and non-shaming.
4. Make the meal estimate review feel trustworthy by showing assumptions, items, macro context, and an explicit confirmation action.
5. Preserve current backend safety: no meal is saved until the user confirms.

## Non-goals for this slice

- Do not remove the `/today` route; it remains available as a detail/history route.
- Do not claim full photo or voice meal analysis is complete.
- Do not wire PostHog, LLM provider changes, or ElevenLabs transcription in this UI slice.
- Do not add a new UI library.

## Information architecture decision

For speed and compatibility, Home lives at `/chat` for now. The primary navigation label changes from `Chat` to `Home`, and `Today` is removed from primary navigation. Existing direct `/today` links keep working.

## Home layout

Mobile-first order:

1. Daily summary hero
   - greeting
   - meal count
   - date label
   - kcal range
   - carbs, protein, fibre
2. Today's meals preview
   - collapsible section
   - latest confirmed meal preview
3. Chat transcript
   - user bubble
   - assistant card
   - loading/error states
4. Rich meal estimate card when an estimate is returned
5. Sticky composer in the mobile thumb zone

Desktop may add a right-side supporting rail while keeping the same primary Home flow.

## Meal estimate card requirements

The estimate card should show:

- kcal range
- `Based on your logs` trust pill
- macro tiles for carbs, protein, fat, fibre
- item names and quantities/household units when available
- assumptions disclosure
- meal slot chips
- primary `Looks right` confirmation action
- secondary `Adjust meal` action
- dismiss control

## Accessibility requirements

- The page has a discoverable `Home` heading for route announcements.
- Composer has an explicit `Meal message` label.
- Camera, mic, send, dismiss, and confirmation controls have accessible names.
- Loading state uses `role="status"`.
- Errors use `role="alert"`.
- Tap targets are at least 44px.
- Focus states are visible.

## Analytics to add in a later PostHog slice

- `home_viewed`
- `meal_message_sent`
- `meal_estimate_received`
- `meal_estimate_confirmed`
- `meal_adjust_clicked`
- `media_input_started`
- `voice_record_started`

Do not send raw meal text or personal health details to analytics.

## Future change process

This PRD can be changed. Future changes should:

1. update this file;
2. update `docs/TASKS.md` if scope/status changes;
3. add an ADR in `docs/DECISIONS.md` for meaningful IA or behavior changes;
4. include visual/test evidence when UI behavior changes.
