-- Nourish initial schema
-- All user-scoped tables have RLS enabled.
-- All tables have created_at/updated_at with triggers.

-- Helper: updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =============================================================================
-- USERS (extends auth.users)
-- =============================================================================
create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  timezone        text not null default 'Asia/Kolkata',
  onboarded_at    timestamptz,
  estimation_preference text not null default 'midpoint'
                  check (estimation_preference in ('conservative','midpoint','liberal')),
  nudge_tone      text not null default 'friendly'
                  check (nudge_tone in ('gentle','friendly','direct')),
  nudges_enabled  boolean not null default true,
  quiet_hours_start time not null default '22:00',
  quiet_hours_end   time not null default '07:00',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger users_updated_at before update on public.users
  for each row execute function set_updated_at();

alter table public.users enable row level security;

create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

-- Auto-create a public.users row when a new auth.users is created
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
-- USER PROFILE (structured fields, separate from memory layer)
-- =============================================================================
create table public.user_profiles (
  user_id         uuid primary key references public.users(id) on delete cascade,
  age             int check (age between 13 and 120),
  gender          text check (gender in ('female','male','non-binary','prefer-not-to-say')),
  height_cm       numeric(5,2) check (height_cm between 100 and 250),
  weight_kg       numeric(5,2) check (weight_kg between 25 and 300),
  city            text,
  primary_goal    text check (primary_goal in ('lose-weight','gain-weight','maintain','manage-condition','wellness')),
  goal_target_kg  numeric(5,2),
  goal_timeline_weeks int,
  conditions      text[] not null default '{}',
  conditions_other text,
  medications     text,
  dietary_pattern text check (dietary_pattern in ('veg','veg-egg','non-veg','vegan','jain','pescetarian','none')),
  allergies       text[] not null default '{}',
  dislikes        text,
  meal_times      jsonb not null default '{}'::jsonb,
  eating_context  text check (eating_context in ('home','mixed','out','varies')),
  daily_kcal_target int,
  daily_protein_target int,
  daily_carbs_target int,
  daily_fat_target int,
  daily_fiber_target int,
  daily_water_target_ml int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger user_profiles_updated_at before update on public.user_profiles
  for each row execute function set_updated_at();

alter table public.user_profiles enable row level security;

create policy "user_profiles_own" on public.user_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- MESSAGES (chat history)
-- =============================================================================
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system','nudge')),
  kind            text not null check (kind in ('text','photo','voice','meal_card','recommendation','insight','nudge','clarification','system')),
  content         text not null,             -- text body or markdown
  metadata        jsonb not null default '{}'::jsonb, -- structured payload (meal estimate, etc.)
  photo_url       text,
  voice_url       text,
  voice_transcript text,
  in_reply_to     uuid references public.messages(id) on delete set null,
  agent_trace_id  uuid,                      -- link to agent_traces
  created_at      timestamptz not null default now()
);

create index messages_user_created_idx on public.messages(user_id, created_at desc);

alter table public.messages enable row level security;

create policy "messages_own" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- MEALS (logged food entries)
-- =============================================================================
create table public.meals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  message_id      uuid references public.messages(id) on delete set null,
  logged_at       timestamptz not null default now(),
  meal_slot       text check (meal_slot in ('breakfast','lunch','dinner','snack','beverage','other')),
  items           jsonb not null,            -- [{name, quantity_g, household_unit}, ...]
  kcal_low        numeric(7,1) not null,
  kcal_high       numeric(7,1) not null,
  kcal_lead       numeric(7,1) not null,
  protein_g_low   numeric(6,1),
  protein_g_high  numeric(6,1),
  carbs_g_low     numeric(6,1),
  carbs_g_high    numeric(6,1),
  fat_g_low       numeric(6,1),
  fat_g_high      numeric(6,1),
  fiber_g_low     numeric(6,1),
  fiber_g_high    numeric(6,1),
  sodium_mg       numeric(7,1),
  confidence      numeric(3,2) check (confidence between 0 and 1),
  preparation_assumptions text,
  safety_flags    text[] not null default '{}',
  user_confirmed  boolean not null default false,
  user_corrected  boolean not null default false,
  photo_url       text,
  source_text     text,                      -- original user input
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger meals_updated_at before update on public.meals
  for each row execute function set_updated_at();

create index meals_user_logged_idx on public.meals(user_id, logged_at desc);

alter table public.meals enable row level security;

create policy "meals_own" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- WATER LOGS
-- =============================================================================
create table public.water_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  amount_ml       int not null check (amount_ml > 0),
  logged_at       timestamptz not null default now(),
  message_id      uuid references public.messages(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index water_logs_user_logged_idx on public.water_logs(user_id, logged_at desc);

alter table public.water_logs enable row level security;

create policy "water_logs_own" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- AGENT TRACES (LLM call observability)
-- =============================================================================
create table public.agent_traces (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users(id) on delete cascade,
  agent           text not null,             -- 'router','nutrition','coach','memory_consolidator','nudge_generator','onboarding_parser'
  model           text not null,
  prompt_version  text,
  intent          text,
  input_tokens    int,
  output_tokens   int,
  cache_read_tokens int default 0,
  cache_write_tokens int default 0,
  latency_ms      int,
  estimated_cost_usd numeric(10,6),
  request_redacted jsonb,
  response_redacted jsonb,
  error           text,
  created_at      timestamptz not null default now()
);

create index agent_traces_user_created_idx on public.agent_traces(user_id, created_at desc);
create index agent_traces_agent_idx on public.agent_traces(agent, created_at desc);

alter table public.agent_traces enable row level security;

create policy "agent_traces_select_own" on public.agent_traces
  for select using (auth.uid() = user_id);

-- Service role inserts traces; users only read their own.

-- =============================================================================
-- IFCT REFERENCE (Indian Food Composition Table extract)
-- =============================================================================
create table public.ifct_foods (
  id              uuid primary key default gen_random_uuid(),
  code            text unique,               -- IFCT code if available
  name            text not null,
  aliases         text[] not null default '{}',
  category        text,                      -- 'cereal','pulse','vegetable','fruit','dairy','meat','beverage','snack','sweet'
  region          text,                      -- 'north','south','east','west','pan-india','global'
  per_100g jsonb not null,                    -- {kcal, protein, carbs, fat, fiber, sodium, ...}
  typical_serving_g int,
  notes           text,
  created_at      timestamptz not null default now()
);

create index ifct_foods_name_trgm on public.ifct_foods using gin (name gin_trgm_ops);
create index ifct_foods_aliases_idx on public.ifct_foods using gin (aliases);

-- IFCT is global reference data, readable by all authenticated users.
alter table public.ifct_foods enable row level security;
create policy "ifct_foods_read" on public.ifct_foods for select using (auth.role() = 'authenticated');

-- =============================================================================
-- Extensions needed
-- =============================================================================
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;
