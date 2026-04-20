// Edge Function: weekly-summary
// Runs Sunday 22:00 IST (weekly) and 1st of month 02:00 IST (monthly).
// For each user, aggregates the period and asks the Coach agent for a narrative summary.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

const COACH_SYSTEM_PROMPT = await Deno.readTextFile(
  new URL('./COACH.md', import.meta.url),
).catch(() => '');

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const period: 'weekly' | 'monthly' = body.period ?? 'weekly';
  const stats = { processed: 0, errors: 0 };

  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, timezone')
    .not('onboarded_at', 'is', null);

  for (const user of users ?? []) {
    try {
      await generateSummary(user, period);
      stats.processed++;
    } catch (err) {
      console.error(`Summary failed for ${user.id}:`, err);
      stats.errors++;
    }
  }

  return Response.json({ ok: true, period, stats });
});

async function generateSummary(user: any, period: 'weekly' | 'monthly') {
  const now = new Date();
  let startDate: Date;
  let layer: 'weekly' | 'monthly';
  let key: string;

  if (period === 'weekly') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
    layer = 'weekly';
    const week = getISOWeek(now);
    key = `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  } else {
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 1);
    layer = 'monthly';
    key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // Aggregate the user's data for the period
  const { data: meals } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', user.id)
    .eq('user_confirmed', true)
    .gte('logged_at', startDate.toISOString())
    .lte('logged_at', now.toISOString())
    .order('logged_at');

  if (!meals || meals.length === 0) return;

  // Compute aggregates
  const totalKcal = meals.reduce((s, m) => s + Number(m.kcal_lead), 0);
  const days = new Set(meals.map((m) => m.logged_at.slice(0, 10))).size;
  const avgKcal = totalKcal / days;
  const totalProtein = meals.reduce(
    (s, m) => s + (Number(m.protein_g_low) + Number(m.protein_g_high)) / 2,
    0,
  );

  // Load profile for context
  const { data: profile } = await supabase
    .from('memories')
    .select('content')
    .eq('user_id', user.id)
    .eq('layer', 'profile')
    .eq('key', 'main')
    .maybeSingle();

  // Ask the Coach to generate a narrative
  const response = await anthropic.messages.create({
    model: period === 'monthly' ? 'claude-opus-4-6' : 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: [
      { type: 'text', text: COACH_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: `Generate a ${period} summary for the user.\n\n## Profile\n${profile?.content ?? ''}\n\n## Aggregate stats\n- Days logged: ${days}\n- Total meals: ${meals.length}\n- Avg daily kcal: ${avgKcal.toFixed(0)}\n- Total protein: ${totalProtein.toFixed(0)}g\n\n## Sample meals\n${meals.slice(0, 20).map((m) => `- ${m.logged_at.slice(0, 10)}: ${JSON.stringify(m.items)}`).join('\n')}\n\nReturn 3-5 insight cards via the generate_insights tool.`,
      },
    ],
    tools: [
      {
        name: 'generate_insights',
        description: 'Generate insight cards for a period summary.',
        input_schema: {
          type: 'object',
          required: ['insights'],
          properties: {
            insights: {
              type: 'array',
              minItems: 3,
              maxItems: 5,
              items: {
                type: 'object',
                required: ['kind', 'title', 'finding'],
                properties: {
                  kind: { type: 'string', enum: ['win', 'pattern', 'opportunity'] },
                  title: { type: 'string' },
                  finding: { type: 'string' },
                  suggestion: { type: ['string', 'null'] },
                },
              },
            },
          },
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'generate_insights' },
  });

  const tu = response.content.find((c) => c.type === 'tool_use') as any;
  if (!tu) return;

  // Format as markdown
  const md = `# ${period === 'weekly' ? 'Weekly' : 'Monthly'} summary — ${key}\n\n## Stats\n- Days logged: ${days}\n- Total meals: ${meals.length}\n- Avg daily kcal: ${avgKcal.toFixed(0)}\n- Avg daily protein: ${(totalProtein / days).toFixed(0)}g\n\n## Insights\n${tu.input.insights
    .map(
      (i: any) =>
        `### ${i.kind === 'win' ? '🏆' : i.kind === 'opportunity' ? '💡' : '📊'} ${i.title}\n${i.finding}${i.suggestion ? `\n\n_${i.suggestion}_` : ''}`,
    )
    .join('\n\n')}\n`;

  // Save to memories
  await supabase.from('memories').upsert(
    {
      user_id: user.id,
      layer,
      key,
      content: md,
    },
    { onConflict: 'user_id,layer,key' },
  );
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
}
