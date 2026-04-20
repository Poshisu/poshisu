-- Background job schedules via pg_cron
-- Requires pg_cron extension enabled in Supabase project settings

create extension if not exists pg_cron;

-- 1. Memory consolidator: every day at 02:00 IST (20:30 UTC previous day)
-- Calls the memory-consolidator Edge Function via http extension or supabase_functions
select cron.schedule(
  'memory-consolidator-daily',
  '30 20 * * *',  -- 20:30 UTC = 02:00 IST
  $$
  select net.http_post(
    url := current_setting('app.supabase_functions_url') || '/memory-consolidator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2. Nudge dispatcher: every 15 minutes
select cron.schedule(
  'nudge-dispatcher',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := current_setting('app.supabase_functions_url') || '/nudge-dispatcher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 3. Weekly summary: Sunday 22:00 IST (16:30 UTC)
select cron.schedule(
  'weekly-summary',
  '30 16 * * 0',
  $$
  select net.http_post(
    url := current_setting('app.supabase_functions_url') || '/weekly-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('period', 'weekly')
  );
  $$
);

-- 4. Monthly summary: 1st of month at 02:00 IST
select cron.schedule(
  'monthly-summary',
  '30 20 1 * *',
  $$
  select net.http_post(
    url := current_setting('app.supabase_functions_url') || '/weekly-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('period', 'monthly')
  );
  $$
);

-- 5. Refresh analytics views: every hour
select cron.schedule(
  'refresh-analytics',
  '5 * * * *',
  'select refresh_analytics_views();'
);

-- 6. Clean up old rate limits: every 6 hours
select cron.schedule(
  'cleanup-rate-limits',
  '0 */6 * * *',
  'select cleanup_rate_limits();'
);

-- 7. Expire stale current_context memories: every hour
select cron.schedule(
  'expire-context',
  '10 * * * *',
  $$
  delete from public.memories
  where layer = 'context' and expires_at is not null and expires_at < now();
  $$
);

-- Configure these app settings in your Supabase project:
--   alter database postgres set app.supabase_functions_url = 'https://<project>.functions.supabase.co';
--   alter database postgres set app.service_role_key = '<service-role-key>';
