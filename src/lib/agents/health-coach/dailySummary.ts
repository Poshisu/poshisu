import type { CoachContext, CoachResponse } from "./types";

const MONTH_LOOKUP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const summaryFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function localDateParts(date: Date, timeZone = "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return { year: Number(year), month: Number(month), day: Number(day), iso: `${year}-${month}-${day}` };
}

function shiftIsoDate(isoDate: string, days: number) {
  const shifted = new Date(`${isoDate}T12:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function formatLocalDateLabel(isoDate: string) {
  return summaryFormatter.format(new Date(`${isoDate}T12:00:00+05:30`));
}

function mealLocalDate(loggedAt: string, timeZone = "Asia/Kolkata") {
  return localDateParts(new Date(loggedAt), timeZone).iso;
}

function rounded(value: number | null | undefined) {
  return Math.round(value ?? 0);
}

function maybeTargetLine(label: string, value: number, target?: number | null, unit = "g") {
  if (!target || target <= 0) return `${label}: ${value}${unit}`;
  const pct = Math.round((value / target) * 100);
  return `${label}: ${value}${unit} (${pct}% of ${target}${unit} target)`;
}

export function isDailyNutritionSummaryQuestion(text: string) {
  const lower = text.toLowerCase();
  const asksForNutrition = /\b(total|totals|summary|breakdown|table|tabular|macro|macros|micro|micros|nutrients?|nutrition|calories|kcal|counter|dva|dri|daily value|recommended intake)\b/.test(lower);
  const referencesDay = /\b(today|yesterday|day|daily|so far|date|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec|\d{4}-\d{2}-\d{2})\b/.test(lower);
  const followUpTableComplaint = /\b(why|table|tabular|breakdown)\b/.test(lower) && /\b(give|giving|show|showing|provide|providing)\b/.test(lower);
  return (asksForNutrition && referencesDay) || followUpTableComplaint;
}

export function inferDailySummaryLocalDate(text: string, now = new Date(), timeZone = "Asia/Kolkata") {
  const lower = text.toLowerCase();
  const today = localDateParts(now, timeZone);

  if (/\byesterday\b/.test(lower)) return shiftIsoDate(today.iso, -1);
  if (/\btomorrow\b/.test(lower)) return shiftIsoDate(today.iso, 1);

  const isoDate = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoDate?.[1]) return isoDate[1];

  const monthDay = lower.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:,?\s*(20\d{2}))?\b/);
  if (monthDay?.[1] && monthDay[2]) {
    const month = MONTH_LOOKUP[monthDay[1]];
    const day = Number(monthDay[2]);
    const year = monthDay[3] ? Number(monthDay[3]) : today.year;
    if (month && day >= 1 && day <= 31) return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  return today.iso;
}

export function buildDailyNutritionSummaryResponse(args: {
  userId: string;
  text: string;
  context: CoachContext;
  now?: Date;
}): CoachResponse | null {
  if (!isDailyNutritionSummaryQuestion(args.text)) return null;

  const timeZone = args.context.user.timezone ?? "Asia/Kolkata";
  const targetDate = inferDailySummaryLocalDate(args.text, args.now, timeZone);
  const meals = args.context.recentMeals.filter((meal) => mealLocalDate(meal.loggedAt, timeZone) === targetDate);
  const dateLabel = formatLocalDateLabel(targetDate);

  const totals = meals.reduce(
    (acc, meal) => {
      acc.kcal += rounded(meal.kcalLead);
      acc.protein += rounded(meal.protein);
      acc.carbs += rounded(meal.carbs);
      acc.fat += rounded(meal.fat);
      acc.fiber += rounded(meal.fiber);
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  const targets = args.context.profile?.targets ?? {};
  const metadata = {
    provider: "baseline" as const,
    model: "deterministic-daily-ledger",
    promptVersion: "ai-chat-01-daily-ledger-v1",
    usedDeterministicFallback: false as const,
    fallbackReason: "confirmed_daily_nutrition_summary",
    contextLoaded: args.context.contextWarnings.length === 0,
    memoryWriteStatus: "skipped" as const,
    inferredFacts: [],
    safety: { blocked: false, reasons: [] },
  };

  if (meals.length === 0) {
    return {
      intent: "coach_response",
      blocks: [
        {
          type: "text",
          text: `For ${dateLabel}, I don’t have any confirmed meals saved yet. The Home counter and this chat summary should both count confirmed meal logs only, so send or confirm a meal first and I’ll total kcal, protein, carbs, fat, and fibre from the same ledger.`,
        },
      ],
      metadata,
    };
  }

  const rows = meals
    .slice()
    .reverse()
    .map((meal) => `| ${meal.mealSlot ?? "meal"} | ${meal.sourceText ?? "saved meal"} | ${rounded(meal.kcalLead)} | ${rounded(meal.protein)}g | ${rounded(meal.carbs)}g | ${rounded(meal.fat)}g | ${rounded(meal.fiber)}g |`)
    .join("\n");

  const targetLines = [
    targets.kcal ? `Calories: ${totals.kcal} kcal (${Math.round((totals.kcal / targets.kcal) * 100)}% of ${targets.kcal} kcal target)` : `Calories: ${totals.kcal} kcal`,
    maybeTargetLine("Protein", totals.protein, targets.protein),
    maybeTargetLine("Carbs", totals.carbs, targets.carbs),
    maybeTargetLine("Fat", totals.fat, targets.fat),
    maybeTargetLine("Fibre", totals.fiber, targets.fiber),
  ].join("\n");

  return {
    intent: "coach_response",
    blocks: [
      {
        type: "text",
        text: `Here’s the confirmed ${dateLabel} breakdown from your saved meal ledger:\n\n| Meal | Logged items | kcal | Protein | Carbs | Fat | Fibre |\n|---|---:|---:|---:|---:|---:|---:|\n${rows}\n| Total | ${meals.length} confirmed log${meals.length === 1 ? "" : "s"} | ${totals.kcal} | ${totals.protein}g | ${totals.carbs}g | ${totals.fat}g | ${totals.fiber}g |\n\n${targetLines}\n\nMicronutrients aren’t reliably stored per meal yet, so I can only give directional micronutrient notes until we add a micronutrient ledger.`,
      },
    ],
    metadata,
  };
}
