-- Nudge system: schedules, queue, history, push subscriptions

-- Per-user nudge configuration
create table public.nudge_schedules (
  user_id              uuid primary key references public.users(id) on delete cascade,
  enabled              boolean not null default true,
  meal_check_ins       boolean not null default true,
  hydration_reminders  boolean not null default true,
  end_of_day_summary   boolean not null default true,
  encouragement        boolean not null default true,
  max_per_day          int not null default 5 check (max_per_day between 0 and 10),
  min_gap_minutes      int not null default 90 check (min_gap_minutes >= 30),
  -- Time anchors (in user's local timezone) — defaults from onboarding
  breakfast_check_at   time,
  lunch_check_at       time,
  dinner_check_at      time,
  hydration_check_at   time default '14:00',
  end_of_day_at        time default '21:00',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger nudge_schedules_updated_at before update on public.nudge_schedules
  for each row execute function set_updated_at();

alter table public.nudge_schedules enable row level security;

create policy "nudge_schedules_own" on public.nudge_schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Queue of nudges to send (or recently sent)
create table public.nudge_queue (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  kind            text not null check (kind in (
    'meal_check_in','hydration_reminder','end_of_day_summary',
    'missed_log_followup','encouragement','gentle_reminder'
  )),
  scheduled_for   timestamptz not null,
  status          text not null default 'pending'
                  check (status in ('pending','generating','sent','skipped','failed','acknowledged')),
  message_text    text,
  message_id      uuid references public.messages(id) on delete set null,
  push_sent_at    timestamptz,
  acknowledged_at timestamptz,
  skip_reason     text,
  context_snapshot jsonb,                     -- what was true when we scheduled this
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger nudge_queue_updated_at before update on public.nudge_queue
  for each row execute function set_updated_at();

create index nudge_queue_pending_idx on public.nudge_queue(scheduled_for) where status = 'pending';
create index nudge_queue_user_idx on public.nudge_queue(user_id, scheduled_for desc);

alter table public.nudge_queue enable row level security;

create policy "nudge_queue_select_own" on public.nudge_queue
  for select using (auth.uid() = user_id);

-- Push subscriptions (Web Push VAPID)
create table public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  endpoint        text not null,
  p256dh          text not null,
  auth            text not null,
  user_agent      text,
  created_at      timestamptz not null default now(),
  last_used_at    timestamptz,
  unique (user_id, endpoint)
);

create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_own" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Initialise nudge_schedules on user creation
create or replace function handle_new_user_nudges()
returns trigger as $$
begin
  insert into public.nudge_schedules (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_public_user_created_nudges
  after insert on public.users
  for each row execute function handle_new_user_nudges();
