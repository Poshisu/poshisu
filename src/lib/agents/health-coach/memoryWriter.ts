import type { AgentSupabaseClient } from "./contextBuilder";
import type { CoachMessage, CoachResponse, InferredFact } from "./types";

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function formatFact(fact: InferredFact) {
  return `- (${fact.stability}) ${fact.category}: ${fact.fact}`;
}

function safeLine(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

async function loadMemoryContent(args: { supabase: AgentSupabaseClient; userId: string; layer: string; key: string }) {
  const result = await (args.supabase.from("memories") as { select: (columns: string) => { eq: (column: string, value: unknown) => { eq: (column: string, value: unknown) => { eq: (column: string, value: unknown) => { maybeSingle: () => Promise<{ data: { content: string } | null; error: { message: string } | null }> } } } } })
    .select("content")
    .eq("user_id", args.userId)
    .eq("layer", args.layer)
    .eq("key", args.key)
    .maybeSingle();

  if (result.error || !result.data) return "";
  return result.data.content;
}

async function upsertMemory(args: { supabase: AgentSupabaseClient; userId: string; layer: string; key: string; content: string }) {
  const table = args.supabase.from("memories") as unknown as {
    upsert: (
      value: Record<string, unknown>,
      options: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
  };

  const { error } = await table.upsert(
    {
      user_id: args.userId,
      layer: args.layer,
      key: args.key,
      content: args.content,
    },
    { onConflict: "user_id,layer,key" },
  );

  if (error) throw new Error(error.message);
}

function appendUniqueLines(existing: string, heading: string, lines: string[]) {
  if (lines.length === 0) return existing;
  const current = existing.trim();
  const additions = lines.filter((line) => !current.toLowerCase().includes(line.toLowerCase()));
  if (additions.length === 0) return current || `${heading}\n`;
  return [current || heading, ...additions].join("\n").trim();
}

export async function writeCoachMemoryEffects(args: {
  supabase?: AgentSupabaseClient;
  userId: string;
  message: CoachMessage;
  response: CoachResponse;
  inferredFacts: InferredFact[];
}): Promise<"skipped" | "succeeded" | "failed"> {
  if (!args.supabase) return "skipped";

  try {
    const dayKey = todayKey();
    const existingDaily = await loadMemoryContent({ supabase: args.supabase, userId: args.userId, layer: "daily", key: dayKey });
    const assistantText = args.response.blocks.find((block) => block.type === "text")?.text ?? "Assistant response generated.";
    const dailyEntry = `- ${new Date().toISOString()} user: ${safeLine(args.message.text)} | assistant: ${safeLine(assistantText)}`;
    const dailyContent = appendUniqueLines(existingDaily || `# Daily log ${dayKey}`, `# Daily log ${dayKey}`, [dailyEntry]);
    await upsertMemory({ supabase: args.supabase, userId: args.userId, layer: "daily", key: dayKey, content: dailyContent });

    const durableFacts = args.inferredFacts.filter((fact) => fact.stability === "stable" || fact.category === "preference");
    if (durableFacts.length > 0) {
      const existingPatterns = await loadMemoryContent({ supabase: args.supabase, userId: args.userId, layer: "patterns", key: "main" });
      const patternLines = durableFacts.map(formatFact);
      const patternsContent = appendUniqueLines(existingPatterns || "# Observed patterns", "# Observed patterns", patternLines);
      await upsertMemory({ supabase: args.supabase, userId: args.userId, layer: "patterns", key: "main", content: patternsContent });
    }

    return "succeeded";
  } catch {
    return "failed";
  }
}
