// Edge Function: nudge-dispatcher
// Runs every 15 minutes via pg_cron. Decides which users get nudges and dispatches them.
//
// Deploy: supabase functions deploy nudge-dispatcher --no-verify-jwt
// (it's protected by the service role key passed in the cron header)

import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@nourish.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Load the nudge generator system prompt at cold start
const NUDGE_SYSTEM_PROMPT = await Deno.readTextFile(
  new URL('./NUDGE_GENERATOR.md', import.meta.url),
).catch(() => '');

interface NudgeContext {
  userId: string;
  userName: string;
  timezone: string;
  nudgeTone: 'gentle' | 'friendly' | 'direct';
  todayMealsLogged: number;
  todayWaterMl: number;
  lastInteractionAt: string | null;
  recentNudges: Array<{ kind: string; sent_at: string; acknowledged: boolean }>;
}

Deno.serve(async (_req) => {
  const startedAt = Date.now();
  const stats = { evaluated: 0, scheduled: 0, sent: 0, skipped: 0, errors: 0 };

  try {
    // 1. Find users who might need a nudge right now
    const candidates = await selectCandidateUsers();
    stats.evaluated = candidates.length;

    for (const user of candidates) {
      try {
        const decision = await decideNudge(user);
        if (!decision) {
          stats.skipped++;
          continue;
        }

        const message = await generateNudgeMessage(decision, user);
        await dispatchNudge(user, decision.kind, message);
        stats.sent++;
      } catch (err) {
        console.error(`Failed for user ${user.user_id}:`, err);
        stats.errors++;
      }
    }

    return Response.json({
      ok: true,
      stats,
      duration_ms: Date.now() - startedAt,
    });
  } catch (err) {
    console.error('Dispatcher fatal error:', err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
});

async function selectCandidateUsers() {
  // Find users whose nudge window matches now (in their local TZ)
  // and who haven't been nudged in the last `min_gap_minutes`.
  const { data, error } = await supabase.rpc('select_nudge_candidates');
  if (error) throw error;
  return data ?? [];
}

interface NudgeDecision {
  kind:
    | 'meal_check_in'
    | 'hydration_reminder'
    | 'end_of_day_summary'
    | 'missed_log_followup'
    | 'encouragement'
    | 'gentle_reminder';
  reason: string;
}

async function decideNudge(user: any): Promise<NudgeDecision | null> {
  const now = new Date();
  const localHour = getLocalHour(now, user.timezone);

  // Quiet hours check
  if (isInQuietHours(localHour, user.quiet_hours_start, user.quiet_hours_end)) {
    return null;
  }

  // Daily cap check
  const { count: sentToday } = await supabase
    .from('nudge_queue')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.user_id)
    .gte('created_at', startOfDayISO(now, user.timezone))
    .in('status', ['sent', 'acknowledged']);

  if ((sentToday ?? 0) >= user.max_per_day) return null;

  // Gap check
  const { data: lastNudge } = await supabase
    .from('nudge_queue')
    .select('created_at, status, kind')
    .eq('user_id', user.user_id)
    .in('status', ['sent', 'acknowledged'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastNudge) {
    const gapMinutes = (now.getTime() - new Date(lastNudge.created_at).getTime()) / 60000;
    if (gapMinutes < user.min_gap_minutes) return null;
  }

  // Decide kind based on time-of-day matching
  const todayMeals = await getTodayMealCount(user.user_id, user.timezone);
  const todayWater = await getTodayWaterMl(user.user_id, user.timezone);

  // Meal check-ins: at the configured time, only if not yet logged
  if (matchesTime(localHour, user.breakfast_check_at) && todayMeals.breakfast === 0) {
    return { kind: 'meal_check_in', reason: 'breakfast time, not logged' };
  }
  if (matchesTime(localHour, user.lunch_check_at) && todayMeals.lunch === 0) {
    return { kind: 'meal_check_in', reason: 'lunch time, not logged' };
  }
  if (matchesTime(localHour, user.dinner_check_at) && todayMeals.dinner === 0) {
    return { kind: 'meal_check_in', reason: 'dinner time, not logged' };
  }

  // Hydration reminder
  if (matchesTime(localHour, user.hydration_check_at) && todayWater < 1000) {
    return { kind: 'hydration_reminder', reason: 'low water count midday' };
  }

  // End of day summary
  if (matchesTime(localHour, user.end_of_day_at) && todayMeals.total > 0) {
    return { kind: 'end_of_day_summary', reason: 'evening reflection' };
  }

  return null;
}

async function generateNudgeMessage(decision: NudgeDecision, user: any): Promise<string> {
  const ctx = {
    user_name: user.display_name,
    nudge_kind: decision.kind,
    tone: user.nudge_tone,
    today_meals_logged: user.today_meals_logged ?? 0,
  };

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    system: [
      {
        type: 'text',
        text: NUDGE_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Generate a ${decision.kind} nudge.\nContext: ${JSON.stringify(ctx)}`,
      },
    ],
    tools: [
      {
        name: 'generate_nudge',
        description: 'Generate a nudge message for the user.',
        input_schema: {
          type: 'object',
          required: ['message', 'tone_used', 'include_in_push'],
          properties: {
            message: { type: 'string', maxLength: 200 },
            tone_used: { type: 'string', enum: ['gentle', 'friendly', 'direct'] },
            include_in_push: { type: 'boolean' },
            include_in_chat: { type: 'boolean' },
            suggested_action_chips: {
              type: 'array',
              items: { type: 'string' },
              maxItems: 3,
            },
          },
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'generate_nudge' },
  });

  const toolUse = response.content.find((c) => c.type === 'tool_use') as any;
  if (!toolUse) throw new Error('No tool_use in nudge response');

  return toolUse.input.message;
}

async function dispatchNudge(user: any, kind: string, message: string) {
  // 1. Insert into messages table so it appears in chat
  const { data: msg, error: msgError } = await supabase
    .from('messages')
    .insert({
      user_id: user.user_id,
      role: 'nudge',
      kind: 'nudge',
      content: message,
      metadata: { nudge_kind: kind },
    })
    .select()
    .single();
  if (msgError) throw msgError;

  // 2. Insert into nudge_queue for tracking
  await supabase.from('nudge_queue').insert({
    user_id: user.user_id,
    kind,
    scheduled_for: new Date().toISOString(),
    status: 'sent',
    message_text: message,
    message_id: msg.id,
    push_sent_at: new Date().toISOString(),
  });

  // 3. Send via Web Push to all subscriptions
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user.user_id);

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: 'Nourish',
          body: message,
          tag: kind,
          url: '/chat',
        }),
      );
      await supabase
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', sub.id);
    } catch (err: any) {
      // 410 means the subscription is gone — clean it up
      if (err?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      } else {
        console.error('Push send failed:', err);
      }
    }
  }
}

// ---------- helpers ----------

function getLocalHour(now: Date, timezone: string): { h: number; m: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = fmt.formatToParts(now);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return { h, m };
}

function isInQuietHours(
  now: { h: number; m: number },
  startStr: string,
  endStr: string,
): boolean {
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  const nowMins = now.h * 60 + now.m;
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  // Handles overnight quiet hours (e.g. 22:00 → 07:00)
  if (startMins > endMins) {
    return nowMins >= startMins || nowMins < endMins;
  }
  return nowMins >= startMins && nowMins < endMins;
}

function matchesTime(now: { h: number; m: number }, target: string | null): boolean {
  if (!target) return false;
  const [th, tm] = target.split(':').map(Number);
  // Match within ±7 minutes (since dispatcher runs every 15 min)
  const nowMins = now.h * 60 + now.m;
  const targetMins = th * 60 + tm;
  return Math.abs(nowMins - targetMins) <= 7;
}

function startOfDayISO(now: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return `${fmt.format(now)}T00:00:00`;
}

async function getTodayMealCount(userId: string, timezone: string) {
  const start = startOfDayISO(new Date(), timezone);
  const { data } = await supabase
    .from('meals')
    .select('meal_slot')
    .eq('user_id', userId)
    .eq('user_confirmed', true)
    .gte('logged_at', start);

  const result = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, total: 0 };
  for (const m of data ?? []) {
    result.total++;
    if (m.meal_slot && m.meal_slot in result) {
      (result as any)[m.meal_slot]++;
    }
  }
  return result;
}

async function getTodayWaterMl(userId: string, timezone: string): Promise<number> {
  const start = startOfDayISO(new Date(), timezone);
  const { data } = await supabase
    .from('water_logs')
    .select('amount_ml')
    .eq('user_id', userId)
    .gte('logged_at', start);
  return (data ?? []).reduce((sum, w) => sum + w.amount_ml, 0);
}
