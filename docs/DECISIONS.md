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


## 2026-05-04 — Enforce generated Supabase DB types in CI

### Context
`src/types/database.ts` was intended to be generated from schema state, but drift risk remained when migrations changed without regenerating types.

### Options
1. Keep manual discipline and rely on reviewer memory.
2. Generate types locally with no automated stale check.
3. Standardize generation command and enforce freshness in CI.

### Decision
Adopt `pnpm db:types` for local regeneration and `pnpm db:types:check` in CI after starting the local Supabase stack.

### Why
This keeps runtime DB access types aligned with schema changes and catches drift automatically in pull requests.

### Tradeoffs
- **Pros:** deterministic contributor workflow, fewer schema/type mismatches, automated PR guardrail.
- **Cons:** CI now boots a local Supabase stack, which adds runtime and Docker dependency.

### Migration path
If CI runtime becomes too costly, switch generation/check to a remote shadow database URL while preserving the same script interface.
