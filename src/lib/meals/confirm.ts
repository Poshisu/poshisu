import { z } from "zod";
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

const estimateSchema = z
  .object({
    mealSlot: z.enum(["breakfast", "lunch", "dinner", "snack", "beverage", "other"]),
    sourceText: z.string().trim().min(1),
    items: z
      .array(
        z.object({
          name: z.string().trim().min(1),
          quantity_g: z.number().positive(),
          household_unit: z.string().trim().min(1).optional(),
        }),
      )
      .min(1),
    kcalLow: z.number().nonnegative(),
    kcalHigh: z.number().nonnegative(),
    kcalLead: z.number().nonnegative(),
    confidence: z.number().min(0).max(1),
  })
  .refine((v) => v.kcalLow <= v.kcalLead && v.kcalLead <= v.kcalHigh, {
    message: "Expected kcalLow <= kcalLead <= kcalHigh",
  });

export async function confirmMealEstimate(estimate: ConfirmableMealEstimate) {
  const parsed = estimateSchema.safeParse(estimate);
  if (!parsed.success) {
    throw new Error("Invalid meal confirmation payload");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const normalizedSource = parsed.data.sourceText.trim().toLowerCase();
  const normalizedItems = JSON.stringify(parsed.data.items.map((i) => ({ ...i, name: i.name.trim().toLowerCase() })));

  const dedupeWindowStart = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const mealsTable = supabase.from("meals" as never);

  const { data: recentMeals, error: recentMealsError } = await mealsTable
    .select("id, meal_slot, source_text, items, kcal_low, kcal_high, kcal_lead, confidence, created_at" as never)
    .eq("user_id", user.id)
    .gte("created_at", dedupeWindowStart)
    .order("created_at", { ascending: false })
    .limit(20);

  if (recentMealsError) {
    throw new Error(`Failed to check existing meals: ${recentMealsError.message}`);
  }

  const duplicate = (recentMeals as Array<Record<string, unknown>> | null)?.find((meal) => {
    const mealItems = JSON.stringify((meal.items as Array<Record<string, unknown>> | null ?? []).map((i) => ({
      ...i,
      name: String(i.name ?? "").trim().toLowerCase(),
    })));
    return (
      String(meal.meal_slot ?? "") === parsed.data.mealSlot &&
      String(meal.source_text ?? "").trim().toLowerCase() === normalizedSource &&
      Number(meal.kcal_low ?? -1) === parsed.data.kcalLow &&
      Number(meal.kcal_high ?? -1) === parsed.data.kcalHigh &&
      Number(meal.kcal_lead ?? -1) === parsed.data.kcalLead &&
      Number(meal.confidence ?? -1) === parsed.data.confidence &&
      mealItems === normalizedItems
    );
  });

  if (duplicate) {
    return { ok: true as const, status: "duplicate_ignored" as const, mealId: String(duplicate.id) };
  }

  const { data: insertedRows, error } = await mealsTable
    .insert({
      user_id: user.id,
      meal_slot: parsed.data.mealSlot,
      source_text: parsed.data.sourceText,
      items: parsed.data.items,
      kcal_low: parsed.data.kcalLow,
      kcal_high: parsed.data.kcalHigh,
      kcal_lead: parsed.data.kcalLead,
      confidence: parsed.data.confidence,
      user_confirmed: true,
    } as never)
    .select("id" as never)
    .single();

  if (error) {
    throw new Error(`Failed to save meal: ${error.message}`);
  }

  return { ok: true as const, status: "saved" as const, mealId: String((insertedRows as { id: string }).id) };
}
