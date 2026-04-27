-- 0010_onboarding_answers.sql
--
-- Audit trail for onboarding: store the raw user answers as JSONB
-- alongside the generated profile.md (which lives in `memories`).
--
-- Why both?
--   - profile.md is the read surface every downstream agent uses.
--   - The raw answers let us re-generate profile.md without asking the
--     user again, e.g. when we change the parser prompt or fix a bug
--     in the deterministic template fallback.

alter table public.users
  add column if not exists onboarding_answers jsonb;

-- The existing `onboarded_at timestamptz` column (added in 0001) is the
-- completion timestamp. We reuse it instead of adding a new column.
-- No-op stub here so the migration documents the intent.
comment on column public.users.onboarded_at is
  'Set by submitOnboarding server action when the chat-based onboarding flow finishes successfully.';

comment on column public.users.onboarding_answers is
  'Raw OnboardingAnswers JSON — see src/lib/onboarding/types.ts. Used as the source of truth for re-generating profile.md if the parser prompt or template changes.';
