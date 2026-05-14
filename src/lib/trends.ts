import { createClient } from "@/lib/supabase/server";
import { getIstCalendarDate, getSelectedIstCalendarDate, formatIstDateLabel } from "@/lib/meals/today";

export type TrendsPeriod = "week" | "month" | "quarter";

export type TrendDay = {
  date: string;
  label: string;
  mealCount: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type TrendInsight = {
  title: string;
  body: string;
  tone: "positive" | "warning" | "neutral";
};

export type TrendsSummary = {
  daysLogged: number;
  totalDays: number;
  consistencyPct: number;
  avgKcal: number;
  avgProtein: number;
  avgFiber: number;
  currentStreak: number;
  longestStreak: number;
};

export type TrendsViewModel = {
  selectedPeriod: TrendsPeriod;
  selectedDate: string;
  dateLabel: string;
  rangeLabel: string;
  days: TrendDay[];
  summary: TrendsSummary;
  insights: TrendInsight[];
};

type TrendMealRow = {
  logged_at: string;
  kcal_lead: number | null;
  protein_g_low: number | null;
  protein_g_high: number | null;
  carbs_g_low: number | null;
  carbs_g_high: number | null;
  fat_g_low: number | null;
  fat_g_high: number | null;
  fiber_g_low: number | null;
  fiber_g_high: number | null;
};

const periodDays: Record<TrendsPeriod, number> = {
  week: 7,
  month: 30,
  quarter: 90,
};

const trendMealColumns = [
  "logged_at",
  "kcal_lead",
  "protein_g_low",
  "protein_g_high",
  "carbs_g_low",
  "carbs_g_high",
  "fat_g_low",
  "fat_g_high",
  "fiber_g_low",
  "fiber_g_high",
].join(", ");

function isTrendsPeriod(value: string | undefined): value is TrendsPeriod {
  return value === "week" || value === "month" || value === "quarter";
}

function midpoint(low: number | null | undefined, high: number | null | undefined) {
  if (typeof low === "number" && typeof high === "number") return (low + high) / 2;
  if (typeof low === "number") return low;
  if (typeof high === "number") return high;
  return 0;
}

function shiftCalendarDate(value: string, days: number) {
  const base = new Date(`${value}T12:00:00+05:30`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function getIstDayBounds(date: string) {
  return {
    start: new Date(`${date}T00:00:00.000+05:30`).toISOString(),
    end: new Date(`${date}T23:59:59.999+05:30`).toISOString(),
  };
}

function compactLabel(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00+05:30`));
}

function buildDateRange(endDate: string, days: number) {
  return Array.from({ length: days }, (_, index) => shiftCalendarDate(endDate, index - days + 1));
}

function buildSummary(days: TrendDay[]): TrendsSummary {
  const loggedDays = days.filter((day) => day.mealCount > 0);
  const daysLogged = loggedDays.length;
  const totalDays = days.length;
  const avg = (key: keyof Pick<TrendDay, "kcal" | "protein" | "fiber">) => {
    if (daysLogged === 0) return 0;
    return loggedDays.reduce((sum, day) => sum + day[key], 0) / daysLogged;
  };

  let currentStreak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index]?.mealCount) currentStreak += 1;
    else break;
  }

  let longestStreak = 0;
  let running = 0;
  days.forEach((day) => {
    if (day.mealCount > 0) {
      running += 1;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
    }
  });

  return {
    daysLogged,
    totalDays,
    consistencyPct: totalDays === 0 ? 0 : Math.round((daysLogged / totalDays) * 100),
    avgKcal: Math.round(avg("kcal")),
    avgProtein: avg("protein"),
    avgFiber: avg("fiber"),
    currentStreak,
    longestStreak,
  };
}

function buildInsights(summary: TrendsSummary): TrendInsight[] {
  if (summary.daysLogged === 0) return [];

  const insights: TrendInsight[] = [];
  insights.push({
    title: summary.consistencyPct >= 70 ? "Logging consistency is strong" : "Logging consistency needs a base layer",
    body: `${summary.daysLogged} of ${summary.totalDays} days have at least one confirmed meal log.`,
    tone: summary.consistencyPct >= 70 ? "positive" : "warning",
  });

  insights.push({
    title: summary.avgProtein >= 60 ? "Protein is holding up" : "Protein may need attention",
    body: `Logged days average ${summary.avgProtein.toFixed(1)}g protein.`,
    tone: summary.avgProtein >= 60 ? "positive" : "neutral",
  });

  insights.push({
    title: summary.avgFiber >= 25 ? "Fiber trend looks solid" : "Fiber is the easiest next lever",
    body: `Logged days average ${summary.avgFiber.toFixed(1)}g fiber.`,
    tone: summary.avgFiber >= 25 ? "positive" : "warning",
  });

  return insights;
}

export function getTrendsParams(
  params: { period?: string; date?: string } | undefined,
  fallbackDate: Date = new Date(),
): { period: TrendsPeriod; selectedDate: string } {
  return {
    period: isTrendsPeriod(params?.period) ? params.period : "week",
    selectedDate: getSelectedIstCalendarDate(params?.date, fallbackDate),
  };
}

export function buildTrendsViewModel(period: TrendsPeriod, selectedDate: string, rows: TrendMealRow[]): TrendsViewModel {
  const dates = buildDateRange(selectedDate, periodDays[period]);
  const byDate = new Map<string, TrendDay>();
  dates.forEach((date) => {
    byDate.set(date, { date, label: compactLabel(date), mealCount: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  });

  rows.forEach((row) => {
    const date = getIstCalendarDate(new Date(row.logged_at));
    const day = byDate.get(date);
    if (!day) return;

    day.mealCount += 1;
    day.kcal += row.kcal_lead ?? 0;
    day.protein += midpoint(row.protein_g_low, row.protein_g_high);
    day.carbs += midpoint(row.carbs_g_low, row.carbs_g_high);
    day.fat += midpoint(row.fat_g_low, row.fat_g_high);
    day.fiber += midpoint(row.fiber_g_low, row.fiber_g_high);
  });

  const days = dates.map((date) => byDate.get(date)!);
  const summary = buildSummary(days);

  return {
    selectedPeriod: period,
    selectedDate,
    dateLabel: formatIstDateLabel(selectedDate),
    rangeLabel: `${compactLabel(dates[0] ?? selectedDate)}–${compactLabel(dates.at(-1) ?? selectedDate)}`,
    days,
    summary,
    insights: buildInsights(summary),
  };
}

export async function loadTrendsData(options: { period?: string; selectedDate?: string } = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { period, selectedDate } = getTrendsParams({ period: options.period, date: options.selectedDate });

  if (!user) {
    return { user: null, data: buildTrendsViewModel(period, selectedDate, []) };
  }

  const dates = buildDateRange(selectedDate, periodDays[period]);
  const { start } = getIstDayBounds(dates[0] ?? selectedDate);
  const { end } = getIstDayBounds(selectedDate);

  const { data, error } = await supabase
    .from("meals" as never)
    .select(trendMealColumns as never)
    .eq("user_id", user.id)
    .eq("user_confirmed", true)
    .gte("logged_at", start)
    .lte("logged_at", end)
    .order("logged_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load trends: ${error.message}`);
  }

  return { user, data: buildTrendsViewModel(period, selectedDate, (data ?? []) as unknown as TrendMealRow[]) };
}
