import { createClient } from "@/lib/supabase/server";

export type ConfirmableMealEstimate = {
  mealSlot: "breakfast" | "lunch" | "dinner" | "snack" | "beverage" | "other";
  sourceText: string;
  items: Array<{ name: string; quantity_g: number; household_unit?: string }>;
  kcalLow: number;
  kcalHigh: number;
  kcalLead: number;
  confidence: number;
};

export async function confirmMealEstimate(estimate: ConfirmableMealEstimate) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const mealsTable = supabase.from("meals" as never);
  const { error } = await mealsTable.insert({
    user_id: user.id,
    meal_slot: estimate.mealSlot,
    source_text: estimate.sourceText,
    items: estimate.items,
    kcal_low: estimate.kcalLow,
    kcal_high: estimate.kcalHigh,
    kcal_lead: estimate.kcalLead,
    confidence: estimate.confidence,
    user_confirmed: true,
  } as never);

  if (error) {
    throw new Error(`Failed to save meal: ${error.message}`);
  }
}
