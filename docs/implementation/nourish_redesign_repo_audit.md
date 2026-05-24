# Nourish Redesign Repo Audit (RDX-01)

_Last updated: 2026-05-22_

## Objective

Audit the **current implemented product** against the redesign brief and identify exactly what to change before behavior rewrites.

## Stack snapshot (implemented)

- Framework: Next.js App Router (`next@16.2.4`) + React 19 + TypeScript strict.
- Styling: Tailwind v4 + shared UI primitives under `src/components/ui/*`.
- Backend/API: Next route handlers in `src/app/api/**` with Zod validation.
- Data/Auth: Supabase (RLS-backed routes and authenticated flows).
- Testing: Vitest + Playwright.
- Deployment: Vercel preview/prod model documented in repo docs.

## Current route map (user-facing)

| Surface | Current route/file | Current state | Gap vs redesign brief |
|---|---|---|---|
| Welcome | `src/app/page.tsx` | Clean but plain hero and neutral shell | Needs premium visual language, stronger copy system, calmer brand treatment |
| Login | `src/app/(auth)/login/page.tsx` | Functional card with Google + email | Needs softer premium auth shell/copy hierarchy |
| Signup | `src/app/(auth)/signup/page.tsx` | Functional card with hints and debug-safe flow | Needs redesign copy + softer surface; remove any debug-first tone from primary UX |
| Onboarding | `src/components/onboarding/ChatOnboardingFlow.tsx` | Chat-like 6-question setup | Conflicts with progressive 8-step flow, shows confidence labels + “coming soon” controls |
| Chat/Home | `src/app/(app)/chat/ChatMealLogger.tsx` | Chat-focused page with quick chips and estimate flow | Needs merge with Today summary into a single Home IA |
| Today | `src/app/(app)/today/TodayDashboard.tsx` | Detailed daily summary/timeline | Should become Home card + detail drilldown; not primary top-level tab for MVP |
| Trends | `src/app/(app)/trends/TrendsDashboard.tsx` | Implemented trends surface | Keep, but ensure design-system consistency after token pass |
| Me/Profile | `src/app/(app)/profile/ProfileMemoryDashboard.tsx` | Memory-inspector-first surface with privacy internals prominent | Must become user-first profile/preferences/patterns surface |
| Primary nav | `src/components/app/AppShellNav.tsx` | Chat + Today + Trends + Me | Should simplify to Home + Trends + Me |

## Anti-pattern inventory (implemented UX debt)

## 1) Onboarding currently exposes unfinished features
- Disabled controls explicitly labeled “Photo upload coming soon”, “Camera coming soon”, “File upload coming soon”, “Voice coming soon”.
- This violates no-dead-UI MVP requirement.

## 2) Onboarding currently exposes internal confidence labeling
- Assistant bubble metadata renders `Confidence: high/medium/low` in first-fold user UX.
- Redesign brief requires uncertainty handling without raw confidence labels.

## 3) Chat currently uses prototype-style quick chips and wording
- Includes hardcoded chip `Need estimate` and confidence-driven estimate display text.
- Needs coach-like natural copy and contextual empty-state prompts.

## 4) Today currently surfaces confidence badge in meal cards
- Timeline cards show `% confidence` badge directly.
- Redesign direction asks for assumptions + ranges, not internal confidence metrics.

## 5) Profile surface is implementation-first instead of user-first
- First fold is “Memory inspector.”
- Safety cards include “User-scoped”, “Audit visible”, and Supabase ownership language.
- Includes first-fold “Danger zone” delete section.

## 6) Navigation IA still keeps standalone Today tab
- Bottom/tab nav currently has Chat, Today, Trends, Me.
- Redesign requires merged Home where Today summary lives alongside chat and logging.

## File-level evidence map (high priority)

### Welcome/Auth
- `src/app/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/signup/page.tsx`

### Onboarding
- `src/components/onboarding/ChatOnboardingFlow.tsx`
- `src/app/(onboarding)/onboarding/page.tsx`
- `src/app/(onboarding)/actions.ts`

### Home/Chat/Today merge
- `src/app/(app)/chat/ChatMealLogger.tsx`
- `src/app/(app)/chat/page.tsx`
- `src/app/(app)/today/TodayDashboard.tsx`
- `src/components/app/AppShellNav.tsx`

### Meal estimate/confirm-save
- `src/app/api/chat/route.ts`
- `src/app/chat/confirm/route.ts`
- `src/app/api/meals/confirm/route.ts`

### Me/Profile
- `src/app/(app)/profile/ProfileMemoryDashboard.tsx`
- `src/app/(app)/profile/page.tsx`
- `src/app/api/privacy/export/route.ts`
- `src/app/api/privacy/delete-account/route.ts`

## Risk notes before implementation

- **Product risk:** rewriting IA before preserving confirm-save behavior can break core meal loop.
- **Security risk:** moving privacy controls must not weaken existing delete/export auth enforcement.
- **Tech risk:** onboarding rewrite must preserve existing persistence/idempotency logic.
- **QA risk:** visual redesign without viewport regression checks will reintroduce mobile breakages.

## Recommended next task sequencing (post-audit)

1. `RDX-02` lock dependency map + sign-off gates in `docs/TASKS.md`.
2. `RDX-03` design tokens/components first.
3. `RDX-04` auth/welcome redesign.
4. `RDX-05` onboarding progressive flow rewrite.
5. `RDX-06` Home merge + nav simplification.
6. `RDX-07` inline estimate + confirm-save enforcement.
7. `RDX-08` profile IA rewrite.
8. `RDX-09` multimodal text/photo/voice rollout with feature flags.
9. `RDX-10` regression + accessibility + Vercel acceptance pack.

## RDX-01 completion status

- ✅ Audit document created with current-state map, gap inventory, and file targets.
- ✅ No runtime behavior changed in this task.
