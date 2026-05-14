-- Allow authenticated users to update/delete their own memories without the
-- audit trigger failing when it snapshots the prior row into memories_history.
--
-- 0002_memory_system.sql enabled RLS on memories_history and added only a SELECT
-- policy. The snapshot_memory_history() trigger runs during updates/deletes on
-- public.memories; when invoked under an authenticated user context, its INSERT
-- into memories_history must also satisfy RLS. Without this policy, onboarding
-- retries that upsert an existing profile/patterns memory fail with:
--   new row violates row-level security policy for table "memories_history"

create policy "memories_history_insert_own" on public.memories_history
  for insert with check (auth.uid() = user_id);
