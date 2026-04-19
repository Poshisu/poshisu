-- 0007: Hybrid nutrition pipeline support, critical micronutrients, missing RPCs, timezone fixes

-- =============================================================================
-- 1. NUTRITION LOOKUP TABLES (for the hybrid pipeline)
-- =============================================================================

-- Cooking method multipliers (Stage 3 of the pipeline)
create table public.cooking_multipliers (
  id              uuid primary key default gen_random_uuid(),
  method          text not null unique,    -- matches the cooking_method enum from the estimator
  kcal_multiplier numeric(4,2) not null default 1.0,
  fat_multiplier  numeric(4,2) not null default 1.0,
  description     text,
  created_at      timestamptz not null default now()
);

insert into public.cooking_multipliers (method, kcal_multiplier, fat_multiplier, description) values
  ('steamed',    1.0,  1.0,  'No added fat'),
  ('boiled',     1.0,  1.0,  'No added fat'),
  ('raw',        1.0,  1.0,  'No cooking'),
  ('roasted',    1.05, 1.1,  'Dry heat, minimal fat'),
  ('baked',      1.05, 1.1,  'Dry heat, minimal fat'),
  ('grilled',    1.05, 1.05, 'Dry heat, some fat drips off'),
  ('sauteed',    1.25, 1.5,  'Moderate oil in pan'),
  ('tempered',   1.2,  1.4,  'Tarka/tadka with oil and spices'),
  ('pan_fried',  1.4,  1.8,  'Shallow fry in oil'),
  ('deep_fried', 2.0,  3.0,  'Submerged in oil'),
  ('gravy_dry',  1.3,  1.6,  'Dry curry, moderate oil'),
  ('gravy_wet',  1.5,  2.0,  'Wet curry, often cream/butter/oil'),
  ('unknown',    1.2,  1.4,  'Default moderate assumption');

alter table public.cooking_multipliers enable row level security;
create policy "cooking_multipliers_read" on public.cooking_multipliers
  for select using (auth.role() = 'authenticated');

-- Source multipliers (restaurant vs home)
create table public.source_multipliers (
  id              uuid primary key default gen_random_uuid(),
  source          text not null unique,
  kcal_multiplier numeric(4,2) not null default 1.0,
  fat_multiplier  numeric(4,2) not null default 1.0,
  sodium_multiplier numeric(4,2) not null default 1.0,
  description     text,
  created_at      timestamptz not null default now()
);

insert into public.source_multipliers (source, kcal_multiplier, fat_multiplier, sodium_multiplier, description) values
  ('home',        1.0,  1.0,  1.0,  'Home-cooked baseline'),
  ('restaurant',  1.35, 1.5,  1.5,  'More oil, butter, cream, salt'),
  ('street_food', 1.4,  1.6,  1.3,  'Often deep-fried, generous oil'),
  ('packaged',    1.0,  1.0,  1.4,  'As labeled but higher sodium'),
  ('cafe',        1.2,  1.3,  1.2,  'Slightly richer than home'),
  ('delivery',    1.3,  1.4,  1.4,  'Similar to restaurant'),
  ('unknown',     1.15, 1.2,  1.2,  'Default moderate assumption');

alter table public.source_multipliers enable row level security;
create policy "source_multipliers_read" on public.source_multipliers
  for select using (auth.role() = 'authenticated');

-- =============================================================================
-- 2. ADD CRITICAL MICRONUTRIENTS TO IFCT_FOODS
-- =============================================================================

-- Add micronutrient columns to the existing ifct_foods per_100g jsonb
-- The per_100g field already stores a json object. We update existing rows
-- and document that the schema now expects these additional fields:
--   b12_mcg, calcium_mg, vitamin_d_mcg, potassium_mg, omega3_g

comment on column public.ifct_foods.per_100g is
  'Nutritional values per 100g. Required: kcal, protein, carbs, fat, fiber. '
  'Tracked micros: sodium (mg), b12_mcg, calcium_mg, vitamin_d_mcg, potassium_mg, omega3_g. '
  'Null/absent means unknown for that nutrient.';

-- Update seed data with micronutrients for key foods
-- (These are approximate values from IFCT 2017 + USDA cross-reference)
update public.ifct_foods set per_100g = per_100g ||
  '{"b12_mcg": 0, "calcium_mg": 10, "vitamin_d_mcg": 0, "potassium_mg": 35, "omega3_g": 0}'::jsonb
where code = 'A002'; -- white rice

update public.ifct_foods set per_100g = per_100g ||
  '{"b12_mcg": 0, "calcium_mg": 48, "vitamin_d_mcg": 0, "potassium_mg": 120, "omega3_g": 0}'::jsonb
where code = 'A003'; -- roti

update public.ifct_foods set per_100g = per_100g ||
  '{"b12_mcg": 0, "calcium_mg": 55, "vitamin_d_mcg": 0, "potassium_mg": 280, "omega3_g": 0}'::jsonb
where code = 'B001'; -- toor dal

update public.ifct_foods set per_100g = per_100g ||
  '{"b12_mcg": 0.8, "calcium_mg": 208, "vitamin_d_mcg": 0, "potassium_mg": 150, "omega3_g": 0.1}'::jsonb
where code = 'D001'; -- paneer

update public.ifct_foods set per_100g = per_100g ||
  '{"b12_mcg": 0.4, "calcium_mg": 149, "vitamin_d_mcg": 0, "potassium_mg": 234, "omega3_g": 0.04}'::jsonb
where code = 'D002'; -- curd

update public.ifct_foods set per_100g = per_100g ||
  '{"b12_mcg": 0.5, "calcium_mg": 125, "vitamin_d_mcg": 1.0, "potassium_mg": 150, "omega3_g": 0.05}'::jsonb
where code = 'D004'; -- milk

update public.ifct_foods set per_100g = per_100g ||
  '{"b12_mcg": 0, "calcium_mg": 5, "vitamin_d_mcg": 0, "potassium_mg": 358, "omega3_g": 0}'::jsonb
where code = 'F001'; -- banana

-- =============================================================================
-- 3. ADD MICRONUTRIENT COLUMNS TO MEALS TABLE
-- =============================================================================

alter table public.meals
  add column b12_mcg_low numeric(6,2),
  add column b12_mcg_high numeric(6,2),
  add column calcium_mg_low numeric(7,1),
  add column calcium_mg_high numeric(7,1),
  add column vitamin_d_mcg_low numeric(6,2),
  add column vitamin_d_mcg_high numeric(6,2),
  add column potassium_mg_low numeric(7,1),
  add column potassium_mg_high numeric(7,1),
  add column omega3_g_low numeric(5,2),
  add column omega3_g_high numeric(5,2),
  add column micro_flags text[] not null default '{}';

comment on column public.meals.micro_flags is
  'Micronutrient flags: e.g., "rich:calcium", "low:b12", "rich:omega3"';

-- =============================================================================
-- 4. USER FEATURES TABLE (structured behavioral data, replaces some markdown)
-- =============================================================================

create table public.user_features (
  user_id                    uuid primary key references public.users(id) on delete cascade,
  -- Meal patterns (updated by consolidator)
  typical_breakfast_time     time,
  typical_lunch_time         time,
  typical_dinner_time        time,
  meal_variance              text check (meal_variance in ('low','medium','high')),
  -- Cooking context
  home_oil_preference        text check (home_oil_preference in ('light','moderate','generous')),
  restaurant_oil_assumption  text check (restaurant_oil_assumption in ('light','moderate','heavy','variable')),
  -- Portion calibration (learned from corrections)
  portion_bias               numeric(4,2) default 1.0, -- >1 means user eats more than agent estimates
  portion_confidence         text check (portion_confidence in ('low','medium','high')),
  correction_count           int not null default 0,
  -- Engagement
  avg_daily_kcal_7d          numeric(7,1),
  avg_daily_protein_7d       numeric(6,1),
  protein_target_hit_rate_7d numeric(4,2), -- 0.0 to 1.0
  days_logged_last_30        int default 0,
  current_streak_days        int default 0,
  longest_streak_days        int default 0,
  -- Hydration
  track_hydration            boolean default false,
  daily_water_target_ml      int,
  avg_daily_water_7d         numeric(7,1),
  -- Behavioral
  eat_out_per_week           numeric(3,1),
  snacks_typical             text check (snacks_typical in ('yes','no','sometimes')),
  nudge_tone                 text check (nudge_tone in ('gentle','friendly','direct')) default 'friendly',
  -- Timestamps
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create trigger user_features_updated_at before update on public.user_features
  for each row execute function set_updated_at();

alter table public.user_features enable row level security;

create policy "user_features_own" on public.user_features
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create on user creation
create or replace function handle_new_user_features()
returns trigger as $$
begin
  insert into public.user_features (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_public_user_created_features
  after insert on public.users
  for each row execute function handle_new_user_features();

-- =============================================================================
-- 5. CORRECTION LOG (feeds the calibration engine)
-- =============================================================================

create table public.correction_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  meal_id         uuid not null references public.meals(id) on delete cascade,
  field_corrected text not null, -- 'portion', 'item', 'cooking_method', 'kcal'
  original_value  text,
  corrected_value text,
  created_at      timestamptz not null default now()
);

create index correction_log_user_idx on public.correction_log(user_id, created_at desc);

alter table public.correction_log enable row level security;
create policy "correction_log_own" on public.correction_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- 6. MISSING RPCs (referenced by edge functions but never defined)
-- =============================================================================

-- RPC for nudge-dispatcher: find users due for a nudge evaluation
create or replace function select_nudge_candidates()
returns table (
  user_id         uuid,
  display_name    text,
  timezone        text,
  nudge_tone      text,
  quiet_hours_start time,
  quiet_hours_end   time,
  max_per_day     int,
  min_gap_minutes int,
  breakfast_check_at time,
  lunch_check_at    time,
  dinner_check_at   time,
  hydration_check_at time,
  end_of_day_at     time
)
language sql
security definer
set search_path = public
as $$
  select
    u.id as user_id,
    u.display_name,
    u.timezone,
    u.nudge_tone,
    u.quiet_hours_start,
    u.quiet_hours_end,
    ns.max_per_day,
    ns.min_gap_minutes,
    ns.breakfast_check_at,
    ns.lunch_check_at,
    ns.dinner_check_at,
    ns.hydration_check_at,
    ns.end_of_day_at
  from public.users u
  join public.nudge_schedules ns on ns.user_id = u.id
  where u.onboarded_at is not null
    and ns.enabled = true
    and u.nudges_enabled = true;
$$;

grant execute on function select_nudge_candidates() to service_role;

-- RPC for memory-consolidator: find users with activity yesterday
create or replace function select_users_for_consolidation()
returns table (user_id uuid)
language sql
security definer
set search_path = public
as $$
  select distinct m.user_id
  from public.meals m
  where m.logged_at >= (now() - interval '24 hours')
    and m.user_confirmed = true
  union
  select distinct wl.user_id
  from public.water_logs wl
  where wl.logged_at >= (now() - interval '24 hours');
$$;

grant execute on function select_users_for_consolidation() to service_role;

-- =============================================================================
-- 7. FIX ANALYTICS VIEWS — replace hardcoded timezone with user-joined timezone
-- =============================================================================

-- Drop the old materialized views
drop materialized view if exists public.daily_water;
drop materialized view if exists public.weekly_totals;
drop materialized view if exists public.daily_totals;

-- Recreate with user timezone join
create materialized view public.daily_totals as
select
  m.user_id,
  (m.logged_at at time zone coalesce(u.timezone, 'Asia/Kolkata'))::date as day,
  count(*) as meal_count,
  sum(m.kcal_lead) as kcal_total,
  sum(m.kcal_low) as kcal_low_total,
  sum(m.kcal_high) as kcal_high_total,
  sum(coalesce(m.protein_g_low + m.protein_g_high, 0) / 2) as protein_g,
  sum(coalesce(m.carbs_g_low + m.carbs_g_high, 0) / 2) as carbs_g,
  sum(coalesce(m.fat_g_low + m.fat_g_high, 0) / 2) as fat_g,
  sum(coalesce(m.fiber_g_low + m.fiber_g_high, 0) / 2) as fiber_g,
  sum(coalesce(m.sodium_mg, 0)) as sodium_mg,
  -- Critical micronutrients
  sum(coalesce(m.b12_mcg_low + m.b12_mcg_high, 0) / 2) as b12_mcg,
  sum(coalesce(m.calcium_mg_low + m.calcium_mg_high, 0) / 2) as calcium_mg,
  sum(coalesce(m.vitamin_d_mcg_low + m.vitamin_d_mcg_high, 0) / 2) as vitamin_d_mcg,
  sum(coalesce(m.potassium_mg_low + m.potassium_mg_high, 0) / 2) as potassium_mg,
  sum(coalesce(m.omega3_g_low + m.omega3_g_high, 0) / 2) as omega3_g
from public.meals m
join public.users u on u.id = m.user_id
where m.user_confirmed = true
group by m.user_id, (m.logged_at at time zone coalesce(u.timezone, 'Asia/Kolkata'))::date;

create unique index daily_totals_user_day_idx on public.daily_totals(user_id, day);

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
  avg(b12_mcg) as avg_b12_mcg,
  avg(calcium_mg) as avg_calcium_mg,
  avg(vitamin_d_mcg) as avg_vitamin_d_mcg,
  avg(potassium_mg) as avg_potassium_mg,
  avg(omega3_g) as avg_omega3_g,
  sum(meal_count) as total_meals
from public.daily_totals
group by user_id, date_trunc('week', day);

create unique index weekly_totals_user_week_idx on public.weekly_totals(user_id, week_start);

create materialized view public.daily_water as
select
  wl.user_id,
  (wl.logged_at at time zone coalesce(u.timezone, 'Asia/Kolkata'))::date as day,
  sum(wl.amount_ml) as total_ml,
  count(*) as log_count
from public.water_logs wl
join public.users u on u.id = wl.user_id
group by wl.user_id, (wl.logged_at at time zone coalesce(u.timezone, 'Asia/Kolkata'))::date;

create unique index daily_water_user_day_idx on public.daily_water(user_id, day);

-- Recreate the refresh function (overwriting the old one)
create or replace function refresh_analytics_views()
returns void as $$
begin
  refresh materialized view concurrently public.daily_totals;
  refresh materialized view concurrently public.weekly_totals;
  refresh materialized view concurrently public.daily_water;
end;
$$ language plpgsql;

-- Recreate the accessor functions with micronutrients
create or replace function get_daily_totals(p_start date, p_end date)
returns setof public.daily_totals
language sql security definer set search_path = public
as $$
  select * from public.daily_totals
  where user_id = auth.uid() and day between p_start and p_end
  order by day desc;
$$;

create or replace function get_weekly_totals(p_start date, p_end date)
returns setof public.weekly_totals
language sql security definer set search_path = public
as $$
  select * from public.weekly_totals
  where user_id = auth.uid() and week_start between p_start and p_end
  order by week_start desc;
$$;

create or replace function get_daily_water(p_start date, p_end date)
returns setof public.daily_water
language sql security definer set search_path = public
as $$
  select * from public.daily_water
  where user_id = auth.uid() and day between p_start and p_end
  order by day desc;
$$;
