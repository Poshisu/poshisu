-- 0011_security_hardening.sql
--
-- Two security improvements flagged by the sub-task 7 security review:
--
-- 1. Document memories_history's "insert via trigger only" design so a
--    future contributor doesn't add a direct INSERT path that bypasses
--    the snapshot trigger.
--
-- 2. Revoke SELECT (onboarding_answers) from the `authenticated` role on
--    public.users. The column contains medications and conditions —
--    the most sensitive health data we hold. RLS already restricts the
--    row to its owner, but a `SELECT *` from anywhere in the app would
--    pull this data into client memory unnecessarily. The application
--    layer reads the column only via the service-role admin client
--    (e.g. when re-generating profile.md), never via the user's session.

comment on table public.memories_history is
  'Insert-only via the snapshot_memory_history trigger on public.memories. No direct INSERT policy by design. Do not add an INSERT route that bypasses the trigger.';

revoke select (onboarding_answers) on public.users from authenticated;

comment on column public.users.onboarding_answers is
  'Raw OnboardingAnswers JSON — see src/lib/onboarding/types.ts. SELECT revoked from `authenticated`; only the service-role admin client reads this column (see src/app/(onboarding)/actions.ts). Use the application layer for any data export or regen flow.';
