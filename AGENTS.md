<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Operating Spec for Multi-Agent Development

This file defines how any coding agent must operate in this repository.

## 1) Session start protocol (mandatory)

Read these files in this order before changing code:

1. `AGENTS.md`
2. `docs/TASKS.md`
3. `docs/DECISIONS.md`
4. `docs/BUILD_PLAN.md`
5. `README.md`

For **UI, UX, visual, layout, accessibility, component, copy-in-interface, or frontend styling work**, also read before changing code:

6. `docs/DESIGN_SYSTEM.md`
7. The existing route/component/style files affected by the task
8. The relevant Next.js guide in `node_modules/next/dist/docs/`

If using Hermes/Forge, load `docs/FORGE_MODE.md`.

If any required file is stale, missing, or conflicts with implemented behavior, fix docs first in the same branch and label planned versus implemented behavior accurately.

## 2) Source-of-truth precedence

When information conflicts, resolve with this order:

1. `package.json` for runtime, framework, package, and tool versions
2. Current code, migrations, and deployed behavior
3. `docs/DESIGN_SYSTEM.md` for UI/UX, visual design, components, accessibility, layout, and interaction patterns
4. `docs/ARCHITECTURE.md`
5. `docs/BUILD_PLAN.md`
6. `README.md` and other narrative docs

Never treat planned docs as implemented behavior.

For UI work, do not treat screenshots of the current product as the target unless the task explicitly labels them as the target. Current-state screenshots are usually evidence of what exists today. Target/model/reference screenshots are directional, but `docs/DESIGN_SYSTEM.md` remains the canonical UI source of truth.

## 3) Delivery model and phase discipline

- The project is currently in **Late Phase 0 / Early Phase 1**.
- **Primary current priority:** ship chat-first onboarding and first end-to-end meal logging loop.
- Planned work must be tagged `planned` until merged and verified.
- Prefer small, reviewable changes, but do not split a single coherent UI refactor into random partial polish PRs.

## 4) Required review lanes (run before every commit)

- `code-reviewer` for all changes
- `security-reviewer` for auth/API/DB/agent/secrets changes
- `accessibility-auditor` for UI changes
- `test-writer` for new behavior requiring tests
- `db-migration` for migration files
- `prompt-evaluator` + `npm run eval:prompts` for prompt changes

For UI changes, include a design-system self-review in the PR body covering tokens, typography, spacing, responsive behavior, accessibility, and screenshots.

## 5) Definition of done for any PR

A change is not done unless:

- behavior is implemented
- tests are added/updated where behavior changes
- security implications reviewed
- docs updated (`README`, `docs/TASKS.md`, `docs/DECISIONS.md`, architecture, design system, and PR template as needed)
- planned vs implemented labels are accurate
- verification commands and results are included in the PR body
- rollback notes are included for non-trivial behavior changes

For UI changes, a change is also not done unless:

- it follows `docs/DESIGN_SYSTEM.md`
- it preserves or improves accessibility
- it has visible keyboard focus states
- it avoids placeholder-only form meaning
- it works at mobile, tablet, and desktop widths
- it avoids accidental white gutters, horizontal overflow, clipped CTAs, or unstyled native controls
- before/after screenshots or a clear visual verification note are included

## 6) Documentation parity gate

If behavior changes and docs are not updated in the same PR, the change is **not merge-ready**.

At minimum, update whichever of the following are affected:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/BUILD_PLAN.md`
- `docs/TASKS.md`
- `docs/DECISIONS.md`
- `docs/DESIGN_SYSTEM.md`
- `.github/PULL_REQUEST_TEMPLATE.md`

## 7) Engineering standards

- TypeScript strict; no unchecked `any`
- Server components by default
- Client components only where interactivity/state requires them
- Zod at trust boundaries
- No secrets in code
- RLS for user-scoped tables
- Append-only migrations
- No direct LLM SDK calls outside `src/lib/claude/client.ts`
- Read the relevant Next.js docs from `node_modules/next/dist/docs/` before using or changing Next.js APIs, routing, metadata, server actions, caching, forms, or data fetching

## 8) UI/UX source of truth

`docs/DESIGN_SYSTEM.md` is the required source of truth for UI-facing implementation work.

All UI work must align with the Nourish design system before local taste, generic SaaS defaults, or one-off screenshot copying.

Nourish should feel:

- calm
- premium
- trustworthy
- organic
- health-aware
- India-aware
- editorial where appropriate
- non-clinical
- non-shaming

Prefer:

- token-driven colors, spacing, radii, shadows, and typography
- clear information hierarchy
- mobile-first layouts
- accessible contrast
- visible focus states
- generous whitespace
- soft organic geometry
- refined display typography for brand moments
- clean UI typography for forms, labels, controls, and dense surfaces
- user-facing product language that says **Nourish**, not internal project terminology

Avoid:

- generic SaaS card stacks
- arbitrary hard-coded hex values
- random greens outside the token system
- low-contrast grey text
- placeholder-only fields
- unstyled native inputs/checkboxes/selects
- clunky square forms
- noisy gamification
- harsh fitness-app aesthetics
- moralizing food with red/green judgment patterns
- user-facing `Poshisu` copy unless explicitly required for an internal/admin surface

Dark surfaces are allowed when specified by `docs/DESIGN_SYSTEM.md` or target UI references, but they must be intentional app surfaces with clear hierarchy, contrast, spacing, and focus states — not accidental black voids or browser gutters.

## 9) Frontend implementation standards

For frontend and UI work:

- Use existing project conventions before introducing new patterns.
- Create reusable primitives for repeated UI instead of patching page-specific CSS.
- Prefer CSS variables, Tailwind theme values, or existing design tokens over scattered literals.
- If a new token is needed, add it centrally and document it in `docs/DESIGN_SYSTEM.md`.
- Do not introduce a new UI library unless explicitly approved.
- Do not make broad copy, consent, data-retention, or safety-policy changes without PM/founder approval.
- Preserve existing behavior unless the task explicitly asks to change it.
- Validate required fields gently and inline.
- Use semantic controls and labels for form fields.
- Use `fieldset`/`legend` or equivalent accessible grouping for grouped choices.
- Ensure keyboard navigation works through the whole flow.
- Ensure touch targets are at least 44×44px.
- Implement default, hover, active, disabled, selected, error, and focus-visible states for interactive controls.
- Avoid horizontal overflow at common mobile and desktop widths.
- Respect safe-area insets for sticky bottom actions.
- Check contrast for text, controls, borders, and selected states.
- Keep loading, disabled, empty, and error states visually consistent with the design system.

## 10) Commit and PR hygiene

- Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- Small, reviewable diffs
- Include verification commands and results in PR body
- Include rollback notes for non-trivial behavior changes
- Include screenshots for UI changes when possible
- Explain any intentional deviation from `docs/DESIGN_SYSTEM.md`

## 11) Forge/Hermes execution profile

- Forge must never merge its own PR unless Atreya explicitly instructs.
- For non-trivial changes, submit plan and wait for approval.
- Limit scope to this repository/worktree.
- Conflict resolution: when a Forge prompt conflicts with this repo `AGENTS.md`, this `AGENTS.md` wins unless a human explicitly overrides.

## 12) PM/founder escalation triggers

Ask for PM/founder input before implementing when:

- safety policy tradeoffs change user outcomes
- onboarding questions/copy/consent text changes beyond minor clarity, labels, units, and `Poshisu` → `Nourish` corrections
- cost-impacting model/routing changes are proposed
- data retention/privacy policy changes are required
- health claims, medical disclaimers, or consent semantics change
- the visual direction would materially depart from `docs/DESIGN_SYSTEM.md`
