# Nourish UI/UX Design System (Canonical)

This is the required source-of-truth for UI-facing implementation work (`RDX-*`).

## Core principles
- Clarity over cleverness.
- Trust-first language and surfaces.
- Accessibility by default (WCAG contrast, 44x44 touch targets).
- Calm emotional tone.
- Mobile-first layouts.
- Progressive disclosure over dense forms.

## Color tokens
- Primary emerald: `#0D4A34`
- Primary tint: `#2F7F5A`
- Accent mist blue: `#5DA0A2`
- Warm neutral sand: `#F5F5ED`
- Surface pearl: `#FBFBF8`
- Text ink: `#1A1A1A`
- Warning goldenrod: `#D9A441`
- Dark mode base: `#0A0A0A`

## Typography
- Display: `Playfair Display` (headlines only)
- UI primary: `Inter`
- UI secondary/microcopy: `DM Sans`
- Base size: `16px`
- Base line-height: `1.4`

## Layout rules
- 8-point spacing scale.
- Cards: 12px radius with soft shadows.
- Primary action must remain in thumb zone on mobile.
- Form fields must be large, readable, and have explicit labels.

## Error and validation UX
- Never expose internal/technical validation errors to users.
- Errors must be plain-language, action-oriented, and specific.
- Keep error blocks visually distinct with accessible contrast.

## Onboarding interaction model
- One-question-per-screen progressive flow.
- Step indicator and clear Back/Continue controls.
- Final review and CTA must stay in the same visual shell.

## Implementation policy
- All UI PRs must map changed styles/components back to these tokens.
- No hardcoded ad-hoc color values in new route-level UI when token exists.
- Use this document as a mandatory read before UI changes.
