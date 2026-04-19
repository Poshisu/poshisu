-- Materialized views for fast trends queries
-- Refreshed via pg_cron (see 0006_schedules.sql)

-- Daily totals per user
create materialized view public.daily_totals as
select
  user_id,
  (logged_at at time zone 'Asia/Kolkata')::date as day,
  count(*) as meal_count,
  sum(kcal_lead) as kcal_total,
  sum(kcal_low) as kcal_low_total,
  sum(kcal_high) as kcal_high_total,
  sum((protein_g_low + protein_g_high) / 2) as protein_g,
  sum((carbs_g_low + carbs_g_high) / 2) as carbs_g,
  sum((fat_g_low + fat_g_high) / 2) as fat_g,
  sum((fiber_g_low + fiber_g_high) / 2) as fiber_g,
  sum(coalesce(sodium_mg, 0)) as sodium_mg
from public.meals
where user_confirmed = true
group by user_id, (logged_at at time zone 'Asia/Kolkata')::date;

create unique index daily_totals_user_day_idx on public.daily_totals(user_id, day);

-- Weekly totals
create materialized view public.weekly_totals as
select
  user_id,
  date_trunc('week', day)::date as week_start,
  count(*) as days_logged,
  avg(kcal_total) as avg_kcal,
  avg(protein_g) as avg_protein_g,
  avg(carbs_g) as avg_carbs_g,
  avg(fat_g) as avg_fat_g,
  avg(fiber_g) as avg_fiber_g,
  sum(meal_count) as total_meals
from public.daily_totals
group by user_id, date_trunc('week', day);

create unique index weekly_totals_user_week_idx on public.weekly_totals(user_id, week_start);

-- Daily water totals
create materialized view public.daily_water as
select
  user_id,
  (logged_at at time zone 'Asia/Kolkata')::date as day,
  sum(amount_ml) as total_ml,
  count(*) as log_count
from public.water_logs
group by user_id, (logged_at at time zone 'Asia/Kolkata')::date;

create unique index daily_water_user_day_idx on public.daily_water(user_id, day);

-- Helper function to refresh all analytics views
create or replace function refresh_analytics_views()
returns void as $$
begin
  refresh materialized view concurrently public.daily_totals;
  refresh materialized view concurrently public.weekly_totals;
  refresh materialized view concurrently public.daily_water;
end;
$$ language plpgsql;

-- Note: Materialized views don't support RLS directly. Access them via security-definer
-- functions that filter by auth.uid(), or only query them server-side with the service role.

create or replace function get_daily_totals(p_start date, p_end date)
returns setof public.daily_totals
language sql
security definer
set search_path = public
as $$
  select * from public.daily_totals
  where user_id = auth.uid()
    and day between p_start and p_end
  order by day desc;
$$;

create or replace function get_weekly_totals(p_start date, p_end date)
returns setof public.weekly_totals
language sql
security definer
set search_path = public
as $$
  select * from public.weekly_totals
  where user_id = auth.uid()
    and week_start between p_start and p_end
  order by week_start desc;
$$;

create or replace function get_daily_water(p_start date, p_end date)
returns setof public.daily_water
language sql
security definer
set search_path = public
as $$
  select * from public.daily_water
  where user_id = auth.uid()
    and day between p_start and p_end
  order by day desc;
$$;

grant execute on function get_daily_totals(date, date) to authenticated;
grant execute on function get_weekly_totals(date, date) to authenticated;
grant execute on function get_daily_water(date, date) to authenticated;
