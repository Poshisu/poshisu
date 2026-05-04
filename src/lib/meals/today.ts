import { endOfDay, startOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/server";

export type TodayMeal = {
  id: string;
  meal_slot: string | null;
  source_text: string | null;
  kcal_low: number;
  kcal_high: number;
  logged_at: string;
};

export async function loadTodayMeals() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, meals: [] as TodayMeal[] };
  }

  const start = startOfDay(new Date()).toISOString();
  const end = endOfDay(new Date()).toISOString();

  const { data, error } = await supabase
    .from("meals" as never)
    .select("id, meal_slot, source_text, kcal_low, kcal_high, logged_at")
    .eq("user_id", user.id)
    .gte("logged_at", start)
    .lte("logged_at", end)
    .order("logged_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load meals: ${error.message}`);
  }

  return { user, meals: (data ?? []) as unknown as TodayMeal[] };
}
