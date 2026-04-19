-- Rate limits: per-user, per-bucket, sliding window approximation

create table public.rate_limits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  bucket        text not null,                -- e.g. 'chat:hour', 'meals:hour', 'voice:hour'
  window_start  timestamptz not null,
  request_count int not null default 1,
  unique (user_id, bucket, window_start)
);

create index rate_limits_user_bucket_idx on public.rate_limits(user_id, bucket, window_start desc);

alter table public.rate_limits enable row level security;

create policy "rate_limits_select_own" on public.rate_limits
  for select using (auth.uid() = user_id);

-- Service role inserts and increments. Users only read for transparency.

-- Atomic increment helper
create or replace function increment_rate_limit(
  p_user_id uuid,
  p_bucket text,
  p_window_minutes int,
  p_limit int
) returns table (allowed boolean, current_count int, reset_at timestamptz)
language plpgsql
security definer
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

grant execute on function increment_rate_limit(uuid, text, int, int) to service_role;

-- Cleanup old rate limit rows (older than 24h)
create or replace function cleanup_rate_limits() returns void as $$
begin
  delete from public.rate_limits where window_start < now() - interval '24 hours';
end;
$$ language plpgsql;
