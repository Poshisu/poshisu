-- Ensure a browser push endpoint can belong to only one user at a time.
-- This prevents shared-browser account switching from leaving the same endpoint
-- active under multiple accounts. If duplicate historical endpoints exist, keep
-- the most recently used row before adding the unique index.

with ranked as (
  select
    id,
    row_number() over (
      partition by endpoint
      order by coalesce(last_used_at, created_at) desc nulls last, created_at desc nulls last, id::text desc
    ) as rn
  from public.push_subscriptions
)
delete from public.push_subscriptions ps
using ranked r
where ps.id = r.id
  and r.rn > 1;

create unique index if not exists push_subscriptions_endpoint_unique_idx
  on public.push_subscriptions(endpoint);
