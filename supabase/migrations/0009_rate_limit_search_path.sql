-- 0009_rate_limit_search_path.sql
--
-- Harden `increment_rate_limit` (added in 0005) against search-path
-- injection. SECURITY DEFINER functions run with the privileges of the
-- function owner (postgres role). Without an explicit search_path, an
-- attacker who can create objects in a schema appearing earlier in the
-- session search_path could shadow the public-schema objects this
-- function references — a known CVE-class issue for security definer
-- functions in Postgres.
--
-- Lock search_path to `public, pg_catalog`. The function body is
-- otherwise unchanged from 0005.
--
-- Per CLAUDE.md: migrations are append-only. We do not edit 0005;
-- instead we re-create the function here with the hardening in place.
-- The CREATE OR REPLACE preserves the existing grant to service_role.

create or replace function increment_rate_limit(
  p_user_id uuid,
  p_bucket text,
  p_window_minutes int,
  p_limit int
) returns table (allowed boolean, current_count int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  v_window_start := date_trunc('minute', now()) - (extract(minute from now())::int % p_window_minutes) * interval '1 minute';

  insert into public.rate_limits (user_id, bucket, window_start, request_count)
  values (p_user_id, p_bucket, v_window_start, 1)
  on conflict (user_id, bucket, window_start)
  do update set request_count = public.rate_limits.request_count + 1
  returning request_count into v_count;

  return query select
    v_count <= p_limit,
    v_count,
    v_window_start + (p_window_minutes || ' minutes')::interval;
end;
$$;
