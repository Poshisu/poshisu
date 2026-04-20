// Edge Function: memory-consolidator
// Runs daily at 02:00 IST. For each active user, reads yesterday's daily log and
// updates patterns.md, semantic.md, and current_context.md as needed.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

const SYSTEM_PROMPT = await Deno.readTextFile(
  new URL('./MEMORY_CONSOLIDATOR.md', import.meta.url),
).catch(() => '');

Deno.serve(async (_req) => {
  const stats = { processed: 0, updated: 0, errors: 0 };

  try {
    // Find users with activity yesterday
    const { data: activeUsers } = await supabase.rpc('select_users_for_consolidation');

    for (const user of activeUsers ?? []) {
      try {
        await consolidateUser(user.user_id);
        stats.processed++;
      } catch (err) {
        console.error(`Consolidation failed for ${user.user_id}:`, err);
        stats.errors++;
      }
    }

    return Response.json({ ok: true, stats });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
});

async function consolidateUser(userId: string) {
  // 1. Load yesterday's daily log
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);

  const { data: dailyLog } = await supabase
    .from('memories')
    .select('content')
    .eq('user_id', userId)
    .eq('layer', 'daily')
    .eq('key', yKey)
    .maybeSingle();

  if (!dailyLog?.content) return; // nothing to consolidate

  // 2. Load current patterns and semantic
  const [{ data: patterns }, { data: semantic }] = await Promise.all([
    supabase
      .from('memories')
      .select('content')
      .eq('user_id', userId)
      .eq('layer', 'patterns')
      .eq('key', 'main')
      .maybeSingle(),
    supabase
      .from('memories')
      .select('content')
      .eq('user_id', userId)
      .eq('layer', 'semantic')
      .eq('key', 'main')
      .maybeSingle(),
  ]);

  // 3. Call the consolidator agent
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: `## Yesterday's daily log\n${dailyLog.content}\n\n## Current patterns.md\n${patterns?.content ?? '_empty_'}\n\n## Current semantic.md\n${semantic?.content ?? '{}'}\n\nReturn updates via the consolidate_memory tool.`,
      },
    ],
    tools: [
      {
        name: 'consolidate_memory',
        description: 'Return memory updates derived from the daily log.',
        input_schema: {
          type: 'object',
          required: ['patterns_update', 'semantic_additions', 'context_update', 'weekly_rollover'],
          properties: {
            patterns_update: {
              type: 'object',
              required: ['action', 'content', 'summary_of_changes'],
              properties: {
                action: { type: 'string', enum: ['replace', 'append', 'noop'] },
                content: { type: 'string' },
                summary_of_changes: { type: 'string' },
              },
            },
            semantic_additions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['term', 'expansion'],
                properties: {
                  term: { type: 'string' },
                  expansion: { type: 'string' },
                },
              },
            },
            context_update: {
              type: 'object',
              required: ['action'],
              properties: {
                action: { type: 'string', enum: ['set', 'clear', 'noop'] },
                content: { type: ['string', 'null'] },
                expires_at: { type: ['string', 'null'] },
              },
            },
            weekly_rollover: { type: 'boolean' },
          },
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'consolidate_memory' },
  });

  const tu = response.content.find((c) => c.type === 'tool_use') as any;
  if (!tu) return;
  const updates = tu.input;

  // 4. Apply patterns update
  if (updates.patterns_update.action === 'replace') {
    await supabase.from('memories').upsert({
      user_id: userId,
      layer: 'patterns',
      key: 'main',
      content: updates.patterns_update.content,
    }, { onConflict: 'user_id,layer,key' });
  } else if (updates.patterns_update.action === 'append' && patterns) {
    await supabase
      .from('memories')
      .update({ content: patterns.content + '\n\n' + updates.patterns_update.content })
      .eq('user_id', userId)
      .eq('layer', 'patterns')
      .eq('key', 'main');
  }

  // 5. Apply semantic additions
  if (updates.semantic_additions.length > 0) {
    const current = semantic ? JSON.parse(semantic.content) : {};
    for (const add of updates.semantic_additions) {
      current[add.term] = add.expansion;
    }
    await supabase.from('memories').upsert({
      user_id: userId,
      layer: 'semantic',
      key: 'main',
      content: JSON.stringify(current),
    }, { onConflict: 'user_id,layer,key' });
  }

  // 6. Apply context update
  if (updates.context_update.action === 'set' && updates.context_update.content) {
    await supabase.from('memories').upsert({
      user_id: userId,
      layer: 'context',
      key: 'main',
      content: updates.context_update.content,
      expires_at: updates.context_update.expires_at,
    }, { onConflict: 'user_id,layer,key' });
  } else if (updates.context_update.action === 'clear') {
    await supabase
      .from('memories')
      .delete()
      .eq('user_id', userId)
      .eq('layer', 'context')
      .eq('key', 'main');
  }
}
