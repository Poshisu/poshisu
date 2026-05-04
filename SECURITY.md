# SECURITY.md

This document defines the current security model for Nourish and the minimum expectations for secure implementation as we complete Phase 1.

## 1) Security posture summary

- Security defaults are **fail-closed** for abuse-sensitive routes (see ADR in `docs/DECISIONS.md`).
- User-scoped data must be protected at both application and database layers.
- Inputs are untrusted by default and must be validated at trust boundaries.
- LLM interactions require explicit prompt/tool boundaries and injection-aware handling.

## 2) Auth model

### Authentication
- Primary identity is managed via Supabase Auth.
- Authenticated app surfaces live under protected app routes (e.g., `/(app)/...`).
- Server-side route and action logic must verify session context before user data access.

### Authorization
- Authorization is not a frontend concern alone.
- Access control must be enforced in:
  1. server actions / API routes, and
  2. Postgres Row Level Security policies.

## 3) Row Level Security (RLS) expectations

RLS is required for all user-scoped tables and is part of definition-of-done for DB changes.

Required expectations:
- Every user-owned table has RLS enabled.
- Policies enforce `auth.uid()` ownership semantics (directly or via safe joins).
- Service-role usage is server-only and never exposed to client bundles.
- Migrations are append-only; policy changes ship as new migrations.

Before merging DB changes:
- verify policies for read/write/update/delete paths,
- verify no cross-user data leakage,
- verify privileged functions have scoped privileges.

## 4) Input validation boundaries

All untrusted inputs must be schema-validated.

### Required boundaries
- HTTP/API request bodies and query params
- Server action payloads
- LLM tool inputs/outputs where structured contracts are expected
- External webhook/transcription payloads

### Validation standards
- Use Zod schemas at all trust boundaries.
- Reject malformed input with safe, user-friendly errors.
- Never return internal stack traces or SQL details to clients.
- Sanitize/log carefully to avoid leaking secrets or sensitive profile data.

## 5) Secrets and key management

- Never commit secrets to git.
- Keep environment variables documented in `.env.local.example`.
- Separate public env vars from server-only secrets.
- Treat Supabase service role keys, Anthropic keys, and third-party API tokens as server-only.
- Rotate compromised keys immediately and invalidate old credentials.

## 6) LLM-specific risk notes

LLM features must assume all user and retrieved content is untrusted.

### Core risks
- Prompt injection via user content or retrieved memory
- Data exfiltration through over-broad tool access
- Hallucinated structured outputs that violate downstream assumptions
- Sensitive data leakage through logs/traces

### Required controls
- Keep direct LLM SDK calls constrained to approved client wrapper modules.
- Enforce strict tool schemas and validate model-produced structures.
- Apply safety rules before user-visible output for nutrition/health guidance.
- Limit tool privileges to minimum required data/actions.
- Redact sensitive fields in logs and traces.

## 7) Abuse and resilience controls

- Rate-limit abuse-prone endpoints.
- Keep limiter behavior fail-closed for protected expensive endpoints unless explicitly overridden by decision.
- Add backoff/retry carefully to avoid thundering herd effects.

## 8) Security review checklist (pre-merge)

1. Authenticated access enforced server-side.
2. RLS policies present and tested for user-scoped tables.
3. Input validation added/updated with Zod.
4. No secrets in code, logs, fixtures, or docs.
5. LLM prompt/tool boundary reviewed for injection risk.
6. Error handling returns safe messages.
7. `docs/DECISIONS.md` updated for material security tradeoffs.
