import { getIstCalendarDate, getIstHour, getIstLocalTimestamp } from "@/lib/meals/targetDate";
import type { CoachContext, MemoryContextRow, RecentMealContext, UserProfileContext } from "./types";

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

type QueryBuilder<T> = {
  select: (columns: string) => QueryBuilder<T>;
  eq: (column: string, value: unknown) => QueryBuilder<T>;
  in: (column: string, values: unknown[]) => QueryBuilder<T>;
  gte: (column: string, value: unknown) => QueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder<T>;
  limit: (count: number) => QueryBuilder<T>;
  maybeSingle: () => QueryResult<T>;
  then: <TResult1 = { data: T | null; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
};

export type AgentSupabaseClient = {
  from: (table: string) => unknown;
};

function fromTable<T>(supabase: AgentSupabaseClient, table: string): QueryBuilder<T> {
  return supabase.from(table) as QueryBuilder<T>;
}

type UserRow = {
  display_name?: string | null;
  timezone?: string | null;
  estimation_preference?: string | null;
  nudge_tone?: string | null;
};

type ProfileRow = {
  age?: number | null;
  city?: string | null;
  primary_goal?: string | null;
  conditions?: string[] | null;
  allergies?: string[] | null;
  dietary_pattern?: string | null;
  eating_context?: string | null;
  daily_kcal_target?: number | null;
  daily_protein_target?: number | null;
  daily_carbs_target?: number | null;
  daily_fat_target?: number | null;
  daily_fiber_target?: number | null;
  daily_water_target_ml?: number | null;
};

type MemoryRow = { layer: string; key: string; content: string; updated_at?: string | null };
type MealRow = {
  meal_slot: string | null;
  source_text: string | null;
  kcal_lead: number | null;
  protein_g_low: number | null;
  protein_g_high: number | null;
  carbs_g_low: number | null;
  carbs_g_high: number | null;
  fat_g_low: number | null;
  fat_g_high: number | null;
  fiber_g_low: number | null;
  fiber_g_high: number | null;
  logged_at: string;
};

function midpoint(low: number | null | undefined, high: number | null | undefined) {
  if (typeof low === "number" && typeof high === "number") return (low + high) / 2;
  if (typeof low === "number") return low;
  if (typeof high === "number") return high;
  return null;
}

function mapProfile(row: ProfileRow | null): UserProfileContext | null {
  if (!row) return null;
  return {
    age: row.age,
    city: row.city,
    primaryGoal: row.primary_goal,
    conditions: row.conditions ?? [],
    allergies: row.allergies ?? [],
    dietaryPattern: row.dietary_pattern,
    eatingContext: row.eating_context,
    targets: {
      kcal: row.daily_kcal_target,
      protein: row.daily_protein_target,
      carbs: row.daily_carbs_target,
      fat: row.daily_fat_target,
      fiber: row.daily_fiber_target,
      waterMl: row.daily_water_target_ml,
    },
  };
}

function mapMemory(row: MemoryRow): MemoryContextRow {
  return { layer: row.layer, key: row.key, content: row.content, updatedAt: row.updated_at ?? null };
}

function mapMeal(row: MealRow): RecentMealContext {
  return {
    mealSlot: row.meal_slot,
    sourceText: row.source_text,
    kcalLead: row.kcal_lead,
    protein: midpoint(row.protein_g_low, row.protein_g_high),
    carbs: midpoint(row.carbs_g_low, row.carbs_g_high),
    fat: midpoint(row.fat_g_low, row.fat_g_high),
    fiber: midpoint(row.fiber_g_low, row.fiber_g_high),
    loggedAt: row.logged_at,
  };
}

export async function buildCoachContext(args: { userId: string; supabase?: AgentSupabaseClient }): Promise<CoachContext> {
  const contextWarnings: string[] = [];
  const base: CoachContext = {
    user: { id: args.userId },
    profile: null,
    memories: [],
    recentMeals: [],
    contextWarnings,
  };

  if (!args.supabase) {
    contextWarnings.push("supabase_context_unavailable");
    return base;
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [userResult, profileResult, memoriesResult, mealsResult] = await Promise.all([
    fromTable<UserRow>(args.supabase, "users").select("display_name, timezone, estimation_preference, nudge_tone").eq("id", args.userId).maybeSingle(),
    fromTable<ProfileRow>(args.supabase, "user_profiles")
      .select("age, city, primary_goal, conditions, allergies, dietary_pattern, eating_context, daily_kcal_target, daily_protein_target, daily_carbs_target, daily_fat_target, daily_fiber_target, daily_water_target_ml")
      .eq("user_id", args.userId)
      .maybeSingle(),
    fromTable<MemoryRow[]>(args.supabase, "memories")
      .select("layer, key, content, updated_at")
      .eq("user_id", args.userId)
      .in("layer", ["profile", "patterns", "context", "semantic", "daily", "weekly", "monthly"])
      .order("updated_at", { ascending: false })
      .limit(12),
    fromTable<MealRow[]>(args.supabase, "meals")
      .select("meal_slot, source_text, kcal_lead, protein_g_low, protein_g_high, carbs_g_low, carbs_g_high, fat_g_low, fat_g_high, fiber_g_low, fiber_g_high, logged_at")
      .eq("user_id", args.userId)
      .eq("user_confirmed", true)
      .gte("logged_at", since)
      .order("logged_at", { ascending: false })
      .limit(12),
  ]);

  if (userResult.error) contextWarnings.push(`users:${userResult.error.message}`);
  if (profileResult.error) contextWarnings.push(`user_profiles:${profileResult.error.message}`);
  if (memoriesResult.error) contextWarnings.push(`memories:${memoriesResult.error.message}`);
  if (mealsResult.error) contextWarnings.push(`meals:${mealsResult.error.message}`);

  const userRow = userResult.data;
  const memories = Array.isArray(memoriesResult.data) ? memoriesResult.data.map(mapMemory) : [];
  const meals = Array.isArray(mealsResult.data) ? mealsResult.data.map(mapMeal) : [];

  return {
    user: {
      id: args.userId,
      displayName: userRow?.display_name,
      timezone: userRow?.timezone,
      estimationPreference: userRow?.estimation_preference,
      nudgeTone: userRow?.nudge_tone,
    },
    profile: mapProfile(profileResult.data),
    memories,
    recentMeals: meals,
    contextWarnings,
  };
}

export function renderCoachContextMarkdown(context: CoachContext): string {
  const profile = context.profile;
  const profileLines = profile
    ? [
        `- city: ${profile.city ?? "unknown"}`,
        `- primary_goal: ${profile.primaryGoal ?? "unknown"}`,
        `- dietary_pattern: ${profile.dietaryPattern ?? "unknown"}`,
        `- eating_context: ${profile.eatingContext ?? "unknown"}`,
        `- allergies: ${profile.allergies.length > 0 ? profile.allergies.join(", ") : "none declared"}`,
        `- conditions: ${profile.conditions.length > 0 ? profile.conditions.join(", ") : "none declared"}`,
        `- targets: kcal ${profile.targets.kcal ?? "unknown"}, protein ${profile.targets.protein ?? "unknown"}g, fiber ${profile.targets.fiber ?? "unknown"}g`,
      ]
    : ["- profile: unavailable"];

  const memoryLines = context.memories.length > 0
    ? context.memories.map((memory) => `### ${memory.layer}/${memory.key}\n${memory.content.slice(0, 2500)}`)
    : ["No memory rows loaded."];

  const mealLines = context.recentMeals.length > 0
    ? context.recentMeals.map((meal) => `- ${meal.loggedAt}: ${meal.mealSlot ?? "meal"} — ${meal.sourceText ?? "saved meal"} (${meal.kcalLead ?? "?"} kcal)`)
    : ["- No confirmed meals in the last 7 days."];

  return [
    `# User`,
    `- id: ${context.user.id}`,
    `- display_name: ${context.user.displayName ?? "unknown"}`,
    `- timezone: ${context.user.timezone ?? "Asia/Kolkata"}`,
    `- current_ist_date: ${getIstCalendarDate()}`,
    `- current_ist_hour: ${getIstHour()}`,
    `- current_ist_local_time: ${getIstLocalTimestamp()}`,
    `- estimation_preference: ${context.user.estimationPreference ?? "midpoint"}`,
    ``,
    `# Structured profile`,
    ...profileLines,
    ``,
    `# Markdown memory`,
    ...memoryLines,
    ``,
    `# Recent confirmed meals`,
    ...mealLines,
  ].join("\n");
}
