# Nourish UI/UX Design System (Canonical)

> Status: **Authoritative** source for UI decisions and implementation. Any conflict with route-level styling defaults to this file.

## 1) Purpose
Nourish is an AI-native preventive health coach for India. The interface must feel premium, calm, and disciplined while staying highly legible and safe for health contexts.

This document defines:
- mandatory visual tokens
- accessibility/readability thresholds
- interaction patterns for onboarding/auth/chat
- implementation and review gates for all UI PRs

---

## 2) Non-negotiable principles
1. **Clarity over creativity**: controls and labels must be obvious.
2. **Trust-first UI**: no hidden/technical wording in user-facing content.
3. **Accessibility by default**: WCAG AA minimum, 44x44 tap targets.
4. **Calm emotional tone**: avoid alarming color usage for routine states.
5. **Progressive disclosure**: one-step-at-a-time onboarding; no abrupt context switching.
6. **Mobile-first**: design for thumb reach and small screens first.

---

## 3) Canonical color roles

| Role | Hex | Usage |
|---|---|---|
| Primary emerald | `#0D4A34` | Primary CTA / selected controls |
| Primary tint | `#2F7F5A` | Hover/secondary interactive emphasis |
| Accent mist blue | `#5DA0A2` | Secondary highlights/charts |
| Warm neutral sand | `#F5F5ED` | Card/panel backgrounds |
| Surface pearl | `#FBFBF8` | App light surface background |
| Text ink | `#1A1A1A` | Primary text on light surfaces |
| Warning goldenrod | `#D9A441` | Non-critical alerts |
| Dark base | `#0A0A0A` | App dark mode base |

### 3.1 Semantic token contract (required)
All route-level UI must consume semantic CSS variables only; no direct hardcoded colors when token exists.

Required tokens:
- `--surface-app-dark`
- `--surface-panel-dark`
- `--surface-canvas`
- `--surface-raised`
- `--foreground`
- `--foreground-on-dark`
- `--foreground-on-dark-muted`
- `--foreground-on-dark-strong`
- `--brand`
- `--brand-muted`
- `--border-soft`
- `--error-surface`
- `--error-border`
- `--error-foreground`

---

## 4) Typography
- Display/headline: **Playfair Display** (headings only)
- Body/UI: **Inter**
- Microcopy/labels: **DM Sans**

Rules:
- Body minimum 16px
- Line-height minimum 1.4
- Avoid all-caps except tiny utility labels
- Keep long paragraphs in readable measure (45–75 chars preferred)

---

## 5) Layout and spacing
- 8pt spacing system (`8, 16, 24, 32...`)
- Card radius: 12px minimum
- Button radius: 8px minimum
- Primary actions anchored in thumb zone on mobile
- Inputs and icon buttons maintain **44x44** minimum tap target

---

## 6) Accessibility requirements (must pass)
- Contrast ratio:
  - normal text: **>= 4.5:1**
  - large text: **>= 3:1**
- Keyboard focus visible on all actionable controls
- Inputs always have explicit labels
- Errors use `role="alert"` and plain-language remediation
- Do not rely on color only to convey state

---

## 7) UX contracts by surface

## 7.1 Landing
- Hero image must support separate desktop/mobile assets
- No detached floating container artifacts
- Primary CTA and secondary auth CTA visible without ambiguity

## 7.2 Auth
- Calm dark shell + high-contrast form card
- Error states must be human-friendly (no backend/schema internals)
- “Continue with Google” and email path must have equal clarity

## 7.3 Onboarding
- One-question-per-screen progressive flow
- Step indicator always visible (e.g., `2 of 7`)
- Back/Continue actions consistent on every step
- Safety notice + final review remain within same shell
- No schema enum leakage in UI copy

---

## 8) Error and validation language policy
Never show internal phrases like:
- “Invalid option: expected one of …”
- raw parser or schema object dumps

Instead show:
- plain language
- clear action
- context-specific fix suggestion

Examples:
- “Please choose a valid diet option from the list.”
- “Please acknowledge the safety notice to continue.”

---

## 9) Implementation guardrails (engineering)

1. **No new hardcoded route-level hex values** when semantic token exists.
2. UI PRs must include token mapping notes in PR body.
3. Visual parity tests required for:
   - landing
   - signup/login
   - onboarding first step
4. UI-facing RDX PRs are not merge-ready without artifact bundle from `TESTING.md` SOP.

---

## 10) PR checklist requirements for UI changes
Any PR touching `src/app/**` or `src/components/**` UI must include:
- [ ] Token mapping summary
- [ ] Accessibility statement (contrast + focus + labels)
- [ ] Visual parity evidence (screenshots or Playwright snapshot run)
- [ ] Mobile viewport evidence for 390x844, 393x852, 430x932

---

## 11) CI enforcement policy
The following checks are required for UI-facing RDX changes:
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test -- src/components/onboarding/ChatOnboardingFlow.test.tsx` (or relevant component tests)
- `pnpm exec playwright test tests/e2e/visual-parity.spec.ts --project=chromium`

If Playwright browser binaries are unavailable locally, CI must still run this check and attach artifacts.
