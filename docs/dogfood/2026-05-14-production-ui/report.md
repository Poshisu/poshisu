# Poshisu production UI dogfood — 2026-05-14

- Target: https://poshisu.vercel.app
- Authenticated dummy login: PASS (credentials redacted)
- Browser pass: Playwright against production, desktop 1440×1000 and mobile 390×844
- Pages checked: `/login`, `/chat`, `/today`, `/trends`, `/profile`, `/onboarding` route guard
- Raw automated output: `summary.json`
- Screenshot evidence: `screenshots/`

## Executive summary

This was the first broader production UI dogfood pass beyond the earlier targeted onboarding/trends/profile smoke tests.

Confirmed working:
- Email/password login reached authenticated app routes.
- `/chat`, `/today`, `/trends`, and `/profile` rendered after auth.
- `/onboarding` route guard redirected an already-onboarded user back to `/chat`.
- No production build/runtime crash was observed in this pass.

Real findings to fix or product-decide:
1. **High — `/chat` is not actually a chat UI yet.** It renders a minimal meal-confirmation card and no visible composer/input. This blocks free-form meal logging and also means S5-T03's runtime safety warning is covered by unit/integration tests but not visibly dogfoodable in production chat UI.
2. **Medium — mobile Trends layout has responsive issues.** The fixed bottom nav overlaps content, and the lower analytics cards likely cause horizontal overflow at 390px width.
3. **Low — production emits a repeated Permissions-Policy warning for `web-share`.** This is not user-visible, but it pollutes QA console signal.

Noisy automated findings explicitly de-scoped:
- `net::ERR_ABORTED` on `_rsc`/prefetch navigations appears to be normal Next.js route prefetch/navigation cancellation, not a user-visible network failure.
- “Unlabeled form controls” is noisy because hidden Next server-action inputs are counted. Needs a real axe/manual accessibility pass before treating as a bug.

## Findings

### 1. Chat page has no message composer

- Severity: High
- Category: Functional / Product completeness
- URL: https://poshisu.vercel.app/chat
- Evidence screenshot: `screenshots/desktop-chat.png`
- Additional screenshot: `screenshots/desktop-chat-before-message.png`

Observed:
- Page title is “Chat”.
- Main content shows: “Estimated meal: 2 rotis and dal”, kcal estimate, and a “Looks right — save meal” button.
- No visible text input, textarea, message composer, send button, mic button, attachment button, or conversation stream.

Expected:
- If this route is meant to be the core chat/meal logging surface, there should be a visible composer or an intentionally labeled placeholder explaining that chat entry is not yet implemented.

Impact:
- Users cannot enter a new meal from the app UI.
- Safety policy improvements from S5-T03 are runtime-tested at the orchestrator level, but production UI cannot yet dogfood the warning path through free-form chat input.

Suggested next task:
- Build or restore a minimal chat composer for authenticated users:
  - textarea/input + send button;
  - loading/disabled state;
  - render assistant response blocks;
  - surface `safetyFlags.blocked` and `blockingReasons` visibly;
  - tests plus production smoke.

### 2. Mobile Trends layout: bottom nav overlap and likely horizontal overflow

- Severity: Medium
- Category: Responsive / UX
- URL: https://poshisu.vercel.app/trends
- Evidence screenshot: `screenshots/mobile-trends.png`

Observed:
- Fixed bottom nav overlays page content; the Streak card supporting text is partly covered.
- Automated metric detected horizontal overflow on mobile Trends.
- Visual review shows lower analytics cards/charts are very close to or beyond the right edge relative to upper cards.

Expected:
- Scrollable content should have bottom padding at least equal to bottom nav height plus `env(safe-area-inset-bottom)`.
- Cards/charts should use `width: 100%`, `max-width: 100%`, `min-width: 0`, and avoid `100vw` inside padded containers.

Suggested next task:
- Add app-shell mobile bottom padding and constrain Trends chart/card widths; add a mobile responsive regression test.

### 3. Repeated console warning: unrecognized `web-share` Permissions-Policy feature

- Severity: Low
- Category: Console hygiene / Config
- URLs: observed across production pages
- Evidence: `warning: Error with Permissions-Policy header: Unrecognized feature: 'web-share'.`

Observed:
- Chromium emits this warning repeatedly during navigation.

Expected:
- Console should be quiet enough that true JS/runtime errors are easy to spot.

Suggested next task:
- Review security headers config and remove/adjust unsupported `web-share` directive if it is not needed.

## Testing notes

What this pass tested:
- Production URL, not local dev.
- Authenticated dummy login using local `.env.local` credentials; credentials were not printed or stored in the report.
- Desktop screenshots for `/login`, `/chat`, `/today`, `/trends`, `/profile`, `/onboarding` route guard.
- Mobile screenshots for `/chat`, `/today`, `/trends`, `/profile`.
- Basic console/pageerror/requestfailed collection.
- Basic layout heuristics: horizontal overflow, h1 count, unlabeled controls.

What this pass did **not** prove:
- Full human UX/a11y quality.
- Live model answer quality.
- End-to-end free-form chat safety warning, because production `/chat` has no composer.
- Real file/photo/voice onboarding behavior; those remain explicitly unfinished/coming soon.

## Evidence files

- `summary.json` — raw machine-readable pass output.
- `screenshots/login-desktop-before-auth.png`
- `screenshots/desktop-chat.png`
- `screenshots/desktop-today.png`
- `screenshots/desktop-trends.png`
- `screenshots/desktop-profile.png`
- `screenshots/desktop-onboarding.png`
- `screenshots/mobile-chat.png`
- `screenshots/mobile-today.png`
- `screenshots/mobile-trends.png`
- `screenshots/mobile-profile.png`
