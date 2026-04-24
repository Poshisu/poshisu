-- 0008: Pin search_path on SECURITY DEFINER functions and cap display_name length.
--
-- Context: SECURITY DEFINER functions that do not set search_path are vulnerable
-- to search-path injection — an attacker who can create objects in another
-- schema on the same database could shadow the functions' table references and
-- execute arbitrary code with the function owner's privileges.
--
-- Fix: `create or replace` each SECURITY DEFINER function with an explicit
-- `set search_path = public`. Function bodies are unchanged.
--
-- Also caps public.users.display_name to 100 characters. Google's `name` claim
-- in OAuth is attacker-influenced (users set their own display name). Without a
-- cap, a 10k-char name would be stored and later rendered.

-- =============================================================================
-- 1. display_name length cap
-- =============================================================================

-- Add a length constraint on the column itself (truthy even for direct inserts).
alter table public.users
  add constraint users_display_name_length
  check (display_name is null or char_length(display_name) <= 100);

-- =============================================================================
-- 2. handle_new_user — search_path + truncate display_name
-- =============================================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 100)
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- =============================================================================
-- 3. handle_new_user_nudges — search_path
-- =============================================================================

create or replace function handle_new_user_nudges()
returns trigger as $$
begin
  insert into public.nudge_schedules (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- =============================================================================
-- 4. handle_new_user_features — search_path
-- =============================================================================

create or replace function handle_new_user_features()
returns trigger as $$
begin
  insert into public.user_features (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- =============================================================================
-- 5. increment_rate_limit — search_path
-- =============================================================================

create or replace function increment_rate_limit(
  p_user_id uuid,
  p_bucket text,
  p_window_minutes int,
  p_limit int
) returns table (allowed boolean, current_count int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
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
