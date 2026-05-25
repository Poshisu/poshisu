# Architecture Decision Records (ADRs)

## ADR Template

Use this template for all future ADRs:

```md
## YYYY-MM-DD — Decision title

### Context
What problem are we solving?

### Options
1. Option A
2. Option B
3. Option C

### Decision
What did we choose?

### Why
Why this choice now?

### Tradeoffs
What do we gain and what do we give up?

### Migration path
How can we change this later if constraints shift?
```

---

## 2026-03-11 — Pivot to chat-based onboarding

### Context
The prior onboarding was a static, multi-step form with high abandonment and weak personalization. We needed faster time-to-value and richer early user signal capture.

### Options
1. Keep static form-based onboarding and only improve copy.
2. Replace onboarding with fully open-ended chat and no structure.
3. Pivot to guided chat-based onboarding with constrained prompts and checkpoints.

### Decision
Adopt guided chat-based onboarding as the primary entry flow.

### Why
Guided chat balances flexibility with completion reliability. It captures intent and constraints in natural language while still collecting required fields through checkpoints.

### Tradeoffs
- **Pros:** better engagement, improved personalization signal, easier progressive disclosure.
- **Cons:** more complex state management, prompt-quality dependence, additional moderation and safety considerations.

### Migration path
If chat underperforms, we can fall back to a hybrid model that starts with a short form and then opens a chat refinement step, reusing the same profile schema.

---

## 2026-03-18 — Hybrid nutrition pipeline

### Context
Nutrition recommendations needed to be both reliable (deterministic rules) and adaptive (LLM reasoning for nuanced goals and preferences).

### Options
1. Pure rules engine only.
2. LLM-only recommendation generation.
3. Hybrid pipeline: deterministic guardrails + LLM synthesis.

### Decision
Use a hybrid nutrition pipeline combining rule validation with model-generated recommendations.

### Why
Rules enforce hard safety and policy boundaries, while model synthesis improves user-specific guidance quality and tone.

### Tradeoffs
- **Pros:** safety guardrails, better personalization, controllable outputs.
- **Cons:** higher implementation complexity, additional latency, more observability requirements.

### Migration path
If model cost/latency becomes unacceptable, we can expand rule coverage and reduce LLM scope to explanation-only output.

---

## 2026-03-25 — `callAgent` caching strategy

### Context
Repeated calls with equivalent inputs were increasing cost and latency, particularly in onboarding and meal-plan refinement loops.

### Options
1. No caching; always call the model.
2. Global in-memory cache keyed by prompt hash.
3. Multi-layer cache (`request`-scoped + short-lived shared cache) keyed by normalized input signature.

### Decision
Adopt multi-layer caching for `callAgent` with conservative TTL and explicit cache-bypass controls.

### Why
This reduces duplicate inference cost and improves p95 latency without forcing stale data for sensitive or user-mutating actions.

### Tradeoffs
- **Pros:** lower API cost, faster repeat responses, better resilience during bursts.
- **Cons:** cache invalidation complexity, potential staleness, need for careful key normalization.

### Migration path
If correctness issues appear, downgrade to request-scoped caching only and retain shared-cache usage for read-only, non-sensitive inference paths.

---

## 2026-04-02 — Fail-closed rate limiter

### Context
Rate limiting protects abuse-prone endpoints, but infrastructure dependencies (e.g., cache store) can fail. We had to choose failure behavior.

### Options
1. Fail-open when limiter backend is unavailable.
2. Fail-closed when limiter backend is unavailable.
3. Conditional fail-open for trusted clients; fail-closed for anonymous/public traffic.

### Decision
Default to fail-closed for protected endpoints.

### Why
Security and cost containment were prioritized over availability for abuse-sensitive routes. A fail-open path could expose expensive model endpoints to uncontrolled traffic.

### Tradeoffs
- **Pros:** stronger abuse resistance, bounded spend under dependency failures.
- **Cons:** potential false rejections during outages, degraded UX for legitimate users.

### Migration path
Introduce policy tiers later (trusted internal fail-open + public fail-closed) once trust boundaries and authenticated quotas are mature.

---

## 2026-04-10 — Deferred CSP hardening

### Context
A strict Content Security Policy rollout risked breaking analytics, third-party integrations, and rapid iteration during active product discovery.

### Options
1. Enforce strict CSP immediately.
2. Keep permissive CSP indefinitely.
3. Defer strict enforcement; ship report-only first, then tighten iteratively.

### Decision
Defer hard CSP enforcement and run report-only telemetry while incrementally tightening directives.

### Why
This reduces disruption risk while collecting real violation data and preserving delivery speed during near-term product iteration.

### Tradeoffs
- **Pros:** lower breakage risk, better observability into required allowances, safer staged rollout.
- **Cons:** temporary larger XSS exposure window, ongoing policy maintenance burden.

### Migration path
Move from report-only to enforced policy per route/class of pages, starting with authenticated surfaces and critical transaction flows.

---

## 2026-04-19 — Server-action error wrapper pattern

### Context
Server actions were returning inconsistent error shapes, causing duplicated client handling and brittle UX state transitions.

### Options
1. Let each action throw and map errors ad hoc in UI.
2. Return untyped `{ ok, error }` payloads without shared wrapper.
3. Standardize with a shared server-action error wrapper that normalizes error categories and safe messages.

### Decision
Adopt a shared server-action error wrapper pattern.

### Why
A common wrapper improves consistency, centralizes logging/sanitization, and reduces repetitive UI error plumbing.

### Tradeoffs
- **Pros:** predictable client behavior, easier observability, safer user-facing error messaging.
- **Cons:** small abstraction overhead, potential misuse if teams bypass wrapper.

### Migration path
If future framework primitives provide first-class typed action errors, migrate wrapper internals to those primitives while preserving the public response contract.

---

## 2026-05-04 — `/api/chat` MVP error handling contract

### Context
The first production-facing chat API needed to ship quickly while limiting abuse and avoiding unsafe error leakage.

### Options
1. Surface raw backend/model errors to clients for faster debugging.
2. Return generic safe envelopes with deterministic fallback text on model failure.
3. Block request if model fails and persist only user messages.

### Decision
Adopt safe error envelopes for API failures and a deterministic assistant fallback for orchestrator/model failures.

### Why
This balances user continuity (always gets a reply) with security hygiene (no stack traces or internal details).

### Tradeoffs
- **Pros:** predictable UX, reduced sensitive leakage risk, easier frontend handling.
- **Cons:** less immediate debugging context for clients; fallback can be less useful than full model output.

### Migration path
Once observability and tracing mature, keep the same client envelope but add internal structured error codes and retry policies per failure type.


## 2026-05-05 — Multimodal onboarding parser intake with clarify fallback

### Context
Onboarding now needs to accept text plus staged media metadata (image/file/audio) without blocking current profile extraction flows.

### Options
1. Keep text-only parser and defer multimodal payload support entirely.
2. Accept multimodal payloads but force extraction even when no textual signal exists.
3. Add a typed multimodal intake schema and explicit extract-vs-clarify parser branch.

### Decision
Adopt typed multimodal intake with explicit parser branching (`extract` or `clarify`) and a placeholder audio transcription adapter.

### Why
This keeps current onboarding extraction stable while enabling safe incremental rollout of image/file/audio handling paths.

### Tradeoffs
- **Pros:** strict boundary validation, safer fallback behavior, low-risk path to future transcription and OCR.
- **Cons:** adds new intermediate response shape and temporary placeholder transcript path.

### Migration path
Replace placeholder transcription with real STT integration and feed OCR/vision summaries into the same parse branching contract.

## 2026-05-11 — Versioned Hermes/Forge startup prompt contract

### Context
Team members increasingly use Hermes/Forge sessions in Codespaces, but startup instructions were inconsistent across sessions and contributors.

### Options
1. Keep ad hoc startup prompts in chat history or personal notes.
2. Add a canonical, versioned startup prompt document in-repo.
3. Enforce startup behavior via external tooling only.

### Decision
Adopt `docs/FORGE_MODE.md` as the canonical, versioned startup prompt contract for Hermes/Forge sessions.

### Why
A single source-of-truth startup prompt reduces process drift, improves onboarding consistency, and makes prompt/process changes auditable through normal PR review.

### Tradeoffs
- **Pros:** repeatable session bootstrapping, clearer onboarding expectations, better documentation parity.
- **Cons:** requires disciplined updates when process changes; slight overhead for maintaining prompt text.

### Migration path
If startup automation is introduced later, keep `docs/FORGE_MODE.md` as the human-readable spec and generate automated startup config from it.


## 2026-05-20 — Execution reset to evidence-first reality checks

### Context
Product leadership observed mismatch between implemented behavior and perceived progress. Multiple docs and trackers were being updated without a single enforced evidence loop tied to end-to-end flow validation.

### Options considered
1. Continue current stage tracker process without additional gates
2. Pause feature delivery and run a one-time stabilization sprint
3. Add a permanent evidence-first gate and docs parity checks in each PR

### Decision
Choose option 3. Keep delivery moving, but require every PR that changes user-visible behavior to include: (a) smoke/e2e evidence, and (b) same-PR updates to Feature Maturity and task tracker status.

### Why
This preserves velocity while making progress legible and auditable for product and engineering.

### Tradeoffs
- **Gain:** higher confidence, less status ambiguity, easier founder review.
- **Cost:** slightly more PR overhead and discipline.

### Migration path
If process overhead becomes too high, reduce required evidence to critical paths only (auth, onboarding, chat, meal save) while preserving same-PR docs parity.



## 2026-05-22 — Lock redesign dependency and sign-off gates before UI rewrites

### Context
The redesign backlog existed, but dependency order and founder approval checkpoints were not explicitly locked. This risked parallel work on unstable foundations and subjective merge decisions.

### Options considered
1. Keep RDX tasks as a flat checklist without explicit gates.
2. Add dependencies only in TASKS but no sign-off gates.
3. Add dependency graph, owner lanes, and founder sign-off checkpoints before starting redesign code changes.

### Decision
Choose option 3. Lock the dependency graph + owner accountability + sign-off gates in the redesign execution plan as RDX-02 completion criteria.

### Why
This reduces sequencing mistakes, keeps PR scope reviewable, and gives product leadership explicit checkpoints before higher-risk tasks (Home merge, confirm-save, multimodal AI).

### Tradeoffs
- **Gain:** better delivery control, lower regression risk, clearer accountability.
- **Cost:** additional process overhead and slower start to implementation.

### Migration path
If the process becomes too heavy during execution, keep the dependency graph but collapse sign-off checkpoints to three gates: post-onboarding, post-Home+estimate, and pre-release.

## 2026-05-24 — Enforce standing post-deploy verification SOP for all RDX UI PRs

### Context
UI redesign work is moving quickly and requires repeatable post-deploy proof to avoid subjective review and regressions slipping through without evidence.

### Options considered
1. Keep evidence requirements distributed across task notes and ad hoc PR comments.
2. Keep current PR template checks only (high-level, non-prescriptive).
3. Add one canonical SOP with explicit artifact bundle requirements and enforce it via task tracker + PR template.

### Decision
Choose option 3. Canonicalize post-deploy verification in `TESTING.md` and enforce it as a fail-closed gate for all UI-facing `RDX-*` PRs.

### Why
A single SOP reduces ambiguity, speeds review, and guarantees every redesign PR includes comparable artifacts (preview URL, viewport screenshots, flow trace, acceptance mapping).

### Tradeoffs
- **Gain:** consistent release evidence, lower regression risk, faster founder review.
- **Cost:** additional execution overhead per UI PR.

### Migration path
If overhead is too high, keep the same SOP structure but allow a reduced artifact bundle for low-risk copy-only UI changes with explicit documented waivers.

## 2026-05-24 — Reopen RDX-05 and split a dedicated foundation slice (RDX-05A)

### Context
Founder review flagged that the previous RDX-05 closure delivered functional onboarding recovery improvements but did not achieve the intended premium visual quality baseline. A full route-level redesign without stabilizing shared tokens and primitives first would create rework risk and inconsistent UI behavior.

### Options considered
1. Keep RDX-05 marked done and proceed directly to route rewrites.
2. Reopen RDX-05 and execute one monolithic redesign PR across all onboarding/auth/home/chat surfaces.
3. Reopen RDX-05 and split a foundation-first slice (tokens + typography + shared primitives), then continue with route-specific slices.

### Decision
Choose option 3. Reopen `RDX-05` and add `RDX-05A` as a dedicated foundation slice to align palette, typography, spacing/radius/shadow semantics, and base form/button behavior before route-level redesign work.

### Why
This reduces regression risk, keeps diffs reviewable, and creates a single visual baseline reused by auth/onboarding/home/chat in subsequent PRs.

### Tradeoffs
- **Gain:** cleaner incremental rollout, lower rework, easier QA and a11y validation.
- **Cost:** one additional PR step before route-level redesign.

### Migration path
If route-level redesign uncovers missing primitives, extend the token set in additional small foundation PRs rather than bypassing shared components with one-off styles.

## 2026-05-24 — Execute auth/landing redesign as a separate PR slice (RDX-05B)

### Context
Founder feedback requested immediate visible quality improvement on welcome/auth flows while preserving existing auth behavior. A route-level slice was needed after foundational token work to deliver perceivable UX progress quickly.

### Options considered
1. Keep all route rewrites bundled with onboarding and home/chat in one large PR.
2. Deliver landing+auth parity first as a distinct slice, then onboarding/home.
3. Pause route work until all primitives are fully finalized.

### Decision
Choose option 2. Implement landing/auth visual parity in `RDX-05B` as a distinct, reviewable slice using the new foundation tokens and typography while leaving auth logic unchanged.

### Why
This gives fast user-visible improvements, keeps regression surface smaller, and allows focused QA on auth-related UX states (especially error presentation).

### Tradeoffs
- **Gain:** faster perceived quality improvements and clearer PR review scope.
- **Cost:** temporary visual mismatch may remain on non-auth routes until subsequent slices land.

### Migration path
Apply the same shell/form/error visual patterns to onboarding and chat/home in follow-on slices (`RDX-05C+`) to complete parity.

## 2026-05-24 — Switch onboarding from chat transcript to progressive step flow (RDX-05C)

### Context
Founder feedback highlighted three UX failures: landing hero instability, abrupt onboarding summary CTA outside the primary visual shell, and mismatch with requested progressive disclosure UX.

### Options considered
1. Keep chat transcript onboarding and restyle only the review card.
2. Keep hybrid chat + steps model with partial transcript.
3. Replace onboarding interaction model with strict one-screen-per-step progression and integrated review/submit.

### Decision
Choose option 3. RDX-05C replaces transcript-style onboarding with a progressive six-step flow and a final integrated review step in the same container.

### Why
This matches the requested UX model, reduces cognitive overload, and removes the abrupt "outside chat" summary break.

### Tradeoffs
- **Gain:** cleaner flow, better visual continuity, clearer validation per step.
- **Cost:** previous transcript-oriented tests/components needed replacement.

### Migration path
If users request chat-like flexibility later, add a post-onboarding assistant refinement step inside `/chat` instead of reverting setup UX to transcript mode.

## 2026-05-24 — Eliminate remote hero dependency for landing reliability (RDX-05C.1)

### Context
Founder review reported landing hero failures and broken first impression due to external image dependency/runtime fetch uncertainty.

### Options considered
1. Keep remote CDN image URLs and retry with different providers.
2. Store hero assets in local app static files and serve responsive desktop/mobile variants.
3. Delay hero until storage-hosted media pipeline is complete.

### Decision
Choose option 2. Ship local responsive hero assets under `public/images` so landing visuals are deterministic and do not depend on external image hosts.

### Why
This removes avoidable runtime failures, improves preview parity, and preserves visual intent while storage-hosted media workflows mature.

### Tradeoffs
- **Gain:** reliable render in all environments.
- **Cost:** temporary use of illustration-style assets before final photographic brand pack is uploaded.

### Migration path
When brand photography is finalized, upload production hero assets to `nourish-public` bucket and swap `srcSet` paths without changing layout structure.

## 2026-05-24 — Add canonical design system markdown + readability remediation (RDX-05C.2)

### Context
Founder review flagged mismatch with provided design guidance and severe readability/contrast regressions (light text on cream cards, jarring mixed surfaces, internal validation strings leaking to end users).

### Options considered
1. Continue ad-hoc visual tweaks in components without a canonical guideline doc.
2. Add a canonical `docs/DESIGN_SYSTEM.md` and perform a focused readability/accessibility pass on auth/onboarding surfaces.
3. Roll back all redesign work and restart from scratch.

### Decision
Choose option 2. Establish `docs/DESIGN_SYSTEM.md` as explicit UI guidance and immediately remediate contrast/copy issues in onboarding and auth.

### Why
This creates durable implementation guardrails and fixes the highest-impact user-facing UX defects without losing ongoing progress.

### Tradeoffs
- **Gain:** clearer UI source-of-truth, improved readability/usability now.
- **Cost:** requires ongoing discipline to keep route-level styling mapped to design tokens.

### Migration path
Expand DESIGN_SYSTEM coverage with component examples and enforce a PR checklist item requiring design-system compliance for future UI changes.

## 2026-05-24 — RDX-05C.3 screenshot defect remediation

### Context
Founder screenshots still showed unresolved onboarding defects after RDX-05C.2: low readability in step headers, validation text leaking internal enum language, and unclear final-step progression.

### Options considered
1. Keep current flow and patch only colors.
2. Add a dedicated final review step and strengthen input-to-enum mapping plus readability updates.
3. Revert to prior chat-thread onboarding flow.

### Decision
Choose option 2. Keep progressive onboarding and remediate screenshot defects by adding an explicit review step, improving heading/body contrast, and mapping diet input to valid schema enums before submit.

### Why
This resolves the most visible UX defects while preserving the preferred progressive interaction model and minimizing churn.

### Tradeoffs
- **Gain:** cleaner final flow, fewer user-facing validation failures, improved readability.
- **Cost:** slight increase in setup steps (6 -> 7 screens) and additional state handling.

### Migration path
If completion rate drops with the extra review step, collapse review into the safety step while retaining friendly validation mapping.

## 2026-05-25 — RDX-05C.4 visual parity stabilization

### Context
Prior redesign passes produced contrast and readability regressions on landing/auth/onboarding surfaces and did not match the approved dark-first visual references.

### Options considered
1. Keep existing tokenized mix and patch only individual text colors.
2. Revert to old light layout and defer parity.
3. Execute a focused dark-first parity pass on critical first-run screens.

### Decision
Adopt option 3: focused parity updates for landing hero section, auth shell readability, and onboarding contrast hierarchy.

### Why
This yields immediate UX quality gains on the highest-traffic entry funnel without broad refactors.

### Tradeoffs
We gain readable, coherent first-run UX quickly but still need a later token harmonization pass to fully consolidate hard-coded colors.

### Migration path
Promote hard-coded parity values into canonical design tokens once visual acceptance is complete.


## 2026-05-25 — RDX-05C.5 token consolidation and visual regression gates

### Context
RDX-05C.4 improved visuals but still used route-level hard-coded colors, which risked further drift from the design system and repeated regressions.

### Options considered
1. Keep hard-coded values and rely on manual review.
2. Full design-system refactor across all components immediately.
3. Targeted token consolidation on landing/auth/onboarding plus screenshot regression checks.

### Decision
Adopt option 3 to reduce drift risk with minimal scope.

### Why
It closes the immediate regression loop quickly and creates an automated signal for future UI drift without requiring a risky broad refactor.

### Tradeoffs
- Gain: more maintainable route styles and screenshot-based parity guardrails.
- Cost: screenshot tests can be environment-sensitive and require baseline upkeep.

### Migration path
Expand token consolidation to remaining app surfaces and add mobile-project screenshot baselines after this initial gate stabilizes.

## 2026-05-25 — RDX-05D design-system governance hardening

### Context
UI quality drift persisted because the design system doc was too sparse and enforcement was optional, allowing ad-hoc styling and inconsistent UX decisions.

### Options considered
1. Keep existing lightweight doc and rely on reviewer judgment.
2. Fully rewrite all UI immediately before adding governance checks.
3. Adopt strict canonical design system + enforce via PR/CI gates, then iterate surfaces.

### Decision
Adopt option 3: canonicalize the full design system in `docs/DESIGN_SYSTEM.md` and enforce compliance with PR checklist + testing gates + token compliance script.

### Why
This creates a durable process boundary that prevents repeated regressions while allowing incremental UI improvement.

### Tradeoffs
- Gain: consistent readability/accessibility outcomes and reduced styling drift.
- Cost: stricter PR process and occasional false positives in compliance checks needing scoped exceptions.

### Migration path
Phase 1: enforce on landing/auth/onboarding (current). Phase 2: expand compliance checks to all app surfaces and include mobile visual baselines in CI artifacts.
