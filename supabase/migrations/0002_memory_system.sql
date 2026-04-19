-- Memory system: layered markdown memory with versioning
-- Layers: profile, patterns, context, semantic, daily, weekly, monthly

create table public.memories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  layer        text not null check (layer in ('profile','patterns','context','semantic','daily','weekly','monthly')),
  key          text not null,                  -- 'main' for singletons, 'YYYY-MM-DD' for daily, 'YYYY-Www' for weekly, 'YYYY-MM' for monthly
  content      text not null,
  version      int not null default 1,
  expires_at   timestamptz,                    -- only relevant for 'context' layer
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, layer, key)
);

create trigger memories_updated_at before update on public.memories
  for each row execute function set_updated_at();

create index memories_user_layer_idx on public.memories(user_id, layer);
create index memories_user_layer_key_idx on public.memories(user_id, layer, key);
create index memories_context_expires_idx on public.memories(expires_at) where layer = 'context';

alter table public.memories enable row level security;

create policy "memories_own" on public.memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Audit history: every change snapshots the previous version
create table public.memories_history (
  id           uuid primary key default gen_random_uuid(),
  memory_id    uuid not null,                  -- not a FK because we want history to survive deletes
  user_id      uuid not null,
  layer        text not null,
  key          text not null,
  content      text not null,
  version      int not null,
  changed_at   timestamptz not null default now(),
  changed_by   text not null default 'system'  -- 'user', 'system', 'consolidator', 'onboarding'
);

create index memories_history_user_idx on public.memories_history(user_id, changed_at desc);
create index memories_history_memory_idx on public.memories_history(memory_id, changed_at desc);

alter table public.memories_history enable row level security;

create policy "memories_history_select_own" on public.memories_history
  for select using (auth.uid() = user_id);

-- Audit trigger: snapshot old version on update or delete
create or replace function snapshot_memory_history()
returns trigger as $$
begin
  if (tg_op = 'UPDATE') then
    insert into public.memories_history (memory_id, user_id, layer, key, content, version, changed_by)
    values (old.id, old.user_id, old.layer, old.key, old.content, old.version, coalesce(current_setting('app.changed_by', true), 'system'));
    new.version = old.version + 1;
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.memories_history (memory_id, user_id, layer, key, content, version, changed_by)
    values (old.id, old.user_id, old.layer, old.key, old.content, old.version, coalesce(current_setting('app.changed_by', true), 'system'));
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger memories_history_trigger
  before update or delete on public.memories
  for each row execute function snapshot_memory_history();

-- Semantic dictionary entries are stored as jsonb in a single 'semantic' / 'main' row.
-- Format: { "term1": "expansion1", "term2": "expansion2", ... }
-- The reader/writer functions in src/lib/memory/semantic.ts handle the marshaling.

-- Helper: clean expired context rows nightly via pg_cron
-- (pg_cron schedule added in 0006_schedules.sql)
