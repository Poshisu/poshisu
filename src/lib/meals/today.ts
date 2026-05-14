import { createClient } from "@/lib/supabase/server";

export type TodayMeal = {
  id: string;
  meal_slot: string | null;
  source_text: string | null;
  kcal_low: number;
  kcal_high: number;
  kcal_lead: number | null;
  protein_g_low: number | null;
  protein_g_high: number | null;
  carbs_g_low: number | null;
  carbs_g_high: number | null;
  fat_g_low: number | null;
  fat_g_high: number | null;
  fiber_g_low: number | null;
  fiber_g_high: number | null;
  confidence: number | null;
  preparation_assumptions: string | null;
  safety_flags: string[] | null;
  logged_at: string;
};

const todayMealColumns = [
  "id",
  "meal_slot",
  "source_text",
  "kcal_low",
  "kcal_high",
  "kcal_lead",
  "protein_g_low",
  "protein_g_high",
  "carbs_g_low",
  "carbs_g_high",
  "fat_g_low",
  "fat_g_high",
  "fiber_g_low",
  "fiber_g_high",
  "confidence",
  "preparation_assumptions",
  "safety_flags",
  "logged_at",
].join(", ");

const istCalendarFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const istLabelFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function getIstCalendarDate(date: Date = new Date()) {
  return istCalendarFormatter.format(date);
}

export function isValidIstCalendarDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00+05:30`);
  return !Number.isNaN(parsed.getTime()) && getIstCalendarDate(parsed) === value;
}

export function getSelectedIstCalendarDate(dateParam: string | undefined, fallbackDate: Date = new Date()) {
  return isValidIstCalendarDate(dateParam) ? dateParam : getIstCalendarDate(fallbackDate);
}

export function formatIstDateLabel(calendarDate: string) {
  return istLabelFormatter.format(new Date(`${calendarDate}T12:00:00+05:30`));
}

function getIstDayBounds(date: Date | string) {
  const istDate = typeof date === "string" ? date : getIstCalendarDate(date);

  return {
    start: new Date(`${istDate}T00:00:00.000+05:30`).toISOString(),
    end: new Date(`${istDate}T23:59:59.999+05:30`).toISOString(),
  };
}

export async function loadTodayMeals(date: Date | string = new Date()) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, meals: [] as TodayMeal[] };
  }

  const { start, end } = getIstDayBounds(date);

  const { data, error } = await supabase
    .from("meals" as never)
    .select(todayMealColumns as never)
    .eq("user_id", user.id)
    .gte("logged_at", start)
    .lte("logged_at", end)
    .order("logged_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load meals: ${error.message}`);
  }

  return { user, meals: (data ?? []) as unknown as TodayMeal[] };
}
