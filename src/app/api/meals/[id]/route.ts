import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const mealSlotSchema = z.enum(["breakfast", "lunch", "dinner", "snack", "beverage", "other"]);
const mealIdSchema = z.string().uuid();

const mealItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity_g: z.number().positive().max(5000),
  household_unit: z.string().trim().min(1).max(120).optional(),
});

const mealPatchSchema = z
  .object({
    mealSlot: mealSlotSchema.optional(),
    sourceText: z.string().trim().min(1).max(4000).optional(),
    items: z.array(mealItemSchema).min(1).max(30).optional(),
    kcalLow: z.number().nonnegative().max(10000).optional(),
    kcalHigh: z.number().nonnegative().max(10000).optional(),
    kcalLead: z.number().nonnegative().max(10000).optional(),
    proteinGLow: z.number().nonnegative().max(1000).optional(),
    proteinGHigh: z.number().nonnegative().max(1000).optional(),
    carbsGLow: z.number().nonnegative().max(1000).optional(),
    carbsGHigh: z.number().nonnegative().max(1000).optional(),
    fatGLow: z.number().nonnegative().max(1000).optional(),
    fatGHigh: z.number().nonnegative().max(1000).optional(),
    fiberGLow: z.number().nonnegative().max(1000).optional(),
    fiberGHigh: z.number().nonnegative().max(1000).optional(),
    sodiumMg: z.number().nonnegative().max(100000).optional(),
    b12McgLow: z.number().nonnegative().max(10000).optional(),
    b12McgHigh: z.number().nonnegative().max(10000).optional(),
    calciumMgLow: z.number().nonnegative().max(100000).optional(),
    calciumMgHigh: z.number().nonnegative().max(100000).optional(),
    vitaminDMcgLow: z.number().nonnegative().max(10000).optional(),
    vitaminDMcgHigh: z.number().nonnegative().max(10000).optional(),
    potassiumMgLow: z.number().nonnegative().max(100000).optional(),
    potassiumMgHigh: z.number().nonnegative().max(100000).optional(),
    omega3GLow: z.number().nonnegative().max(1000).optional(),
    omega3GHigh: z.number().nonnegative().max(1000).optional(),
    confidence: z.number().min(0).max(1).optional(),
    preparationAssumptions: z.string().trim().min(1).max(2000).optional(),
    safetyFlags: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
    microFlags: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
    userConfirmed: z.boolean().optional(),
    userCorrected: z.boolean().optional(),
    photoUrl: z.string().url().max(2000).optional(),
    loggedAt: z.string().datetime({ offset: true }).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" })
  .refine((value) => {
    if (value.kcalLow === undefined || value.kcalLead === undefined || value.kcalHigh === undefined) {
      return true;
    }
    return value.kcalLow <= value.kcalLead && value.kcalLead <= value.kcalHigh;
  }, { message: "Expected kcalLow <= kcalLead <= kcalHigh" });

type MealPatchInput = z.infer<typeof mealPatchSchema>;

type MealPatchRow = {
  logged_at?: string;
  meal_slot?: MealPatchInput["mealSlot"];
  items?: Array<z.infer<typeof mealItemSchema>>;
  kcal_low?: number;
  kcal_high?: number;
  kcal_lead?: number;
  protein_g_low?: number;
  protein_g_high?: number;
  carbs_g_low?: number;
  carbs_g_high?: number;
  fat_g_low?: number;
  fat_g_high?: number;
  fiber_g_low?: number;
  fiber_g_high?: number;
  sodium_mg?: number;
  b12_mcg_low?: number;
  b12_mcg_high?: number;
  calcium_mg_low?: number;
  calcium_mg_high?: number;
  vitamin_d_mcg_low?: number;
  vitamin_d_mcg_high?: number;
  potassium_mg_low?: number;
  potassium_mg_high?: number;
  omega3_g_low?: number;
  omega3_g_high?: number;
  confidence?: number;
  preparation_assumptions?: string;
  safety_flags?: string[];
  micro_flags?: string[];
  user_confirmed?: boolean;
  user_corrected?: boolean;
  photo_url?: string;
  source_text?: string;
};

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const selectMealColumns = [
  "id",
  "user_id",
  "message_id",
  "logged_at",
  "meal_slot",
  "items",
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
  "sodium_mg",
  "b12_mcg_low",
  "b12_mcg_high",
  "calcium_mg_low",
  "calcium_mg_high",
  "vitamin_d_mcg_low",
  "vitamin_d_mcg_high",
  "potassium_mg_low",
  "potassium_mg_high",
  "omega3_g_low",
  "omega3_g_high",
  "confidence",
  "preparation_assumptions",
  "safety_flags",
  "micro_flags",
  "user_confirmed",
  "user_corrected",
  "photo_url",
  "source_text",
  "created_at",
  "updated_at",
].join(", ");

function jsonError(status: number, code: string, message: string, requestId: string) {
  return Response.json({ ok: false, error: { code, message }, requestId }, { status });
}

async function getMealId(context: RouteContext) {
  const params = await context.params;
  return mealIdSchema.safeParse(params.id);
}

async function getAuthenticatedUser(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, response: jsonError(401, "UNAUTHORIZED", "You must be signed in to manage meals.", requestId) };
  }

  return { supabase, user, response: null };
}

async function parseJson(request: Request, requestId: string) {
  try {
    return { body: await request.json(), response: null };
  } catch {
    return { body: null, response: jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId) };
  }
}

function toPatchRow(input: MealPatchInput): MealPatchRow {
  return {
    logged_at: input.loggedAt,
    meal_slot: input.mealSlot,
    items: input.items,
    kcal_low: input.kcalLow,
    kcal_high: input.kcalHigh,
    kcal_lead: input.kcalLead,
    protein_g_low: input.proteinGLow,
    protein_g_high: input.proteinGHigh,
    carbs_g_low: input.carbsGLow,
    carbs_g_high: input.carbsGHigh,
    fat_g_low: input.fatGLow,
    fat_g_high: input.fatGHigh,
    fiber_g_low: input.fiberGLow,
    fiber_g_high: input.fiberGHigh,
    sodium_mg: input.sodiumMg,
    b12_mcg_low: input.b12McgLow,
    b12_mcg_high: input.b12McgHigh,
    calcium_mg_low: input.calciumMgLow,
    calcium_mg_high: input.calciumMgHigh,
    vitamin_d_mcg_low: input.vitaminDMcgLow,
    vitamin_d_mcg_high: input.vitaminDMcgHigh,
    potassium_mg_low: input.potassiumMgLow,
    potassium_mg_high: input.potassiumMgHigh,
    omega3_g_low: input.omega3GLow,
    omega3_g_high: input.omega3GHigh,
    confidence: input.confidence,
    preparation_assumptions: input.preparationAssumptions,
    safety_flags: input.safetyFlags,
    micro_flags: input.microFlags,
    user_confirmed: input.userConfirmed,
    user_corrected: input.userCorrected,
    photo_url: input.photoUrl,
    source_text: input.sourceText,
  };
}

function pruneUndefined(row: MealPatchRow) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

function isNotFoundError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "PGRST116";
}

type MealCalorieRange = {
  kcal_low: number;
  kcal_high: number;
  kcal_lead: number;
};

function hasValidKcalRange(range: MealCalorieRange) {
  return range.kcal_low <= range.kcal_lead && range.kcal_lead <= range.kcal_high;
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const mealIdResult = await getMealId(context);
  if (!mealIdResult.success) {
    return jsonError(400, "VALIDATION_ERROR", "Meal id must be a valid UUID.", requestId);
  }
  const mealId = mealIdResult.data;
  const { supabase, user, response } = await getAuthenticatedUser(requestId);
  if (response || !user) return response;

  const parsedJson = await parseJson(request, requestId);
  if (parsedJson.response) return parsedJson.response;

  const parsed = mealPatchSchema.safeParse(parsedJson.body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Meal update payload is invalid.", requestId);
  }

  const { data: existingMeal, error: readError } = await supabase
    .from("meals" as never)
    .select("kcal_low, kcal_high, kcal_lead" as never)
    .eq("id", mealId)
    .eq("user_id", user.id)
    .single();

  if (readError) {
    if (isNotFoundError(readError)) {
      return jsonError(404, "MEAL_NOT_FOUND", "Meal not found.", requestId);
    }
    return jsonError(500, "MEAL_UPDATE_FAILED", "Could not update meal. Please try again.", requestId);
  }

  if (!existingMeal) {
    return jsonError(404, "MEAL_NOT_FOUND", "Meal not found.", requestId);
  }

  const patchRow = pruneUndefined(toPatchRow(parsed.data));
  const existingRange = existingMeal as MealCalorieRange;
  const mergedRange = {
    kcal_low: (patchRow.kcal_low as number | undefined) ?? existingRange.kcal_low,
    kcal_high: (patchRow.kcal_high as number | undefined) ?? existingRange.kcal_high,
    kcal_lead: (patchRow.kcal_lead as number | undefined) ?? existingRange.kcal_lead,
  };

  if (!hasValidKcalRange(mergedRange)) {
    return jsonError(400, "VALIDATION_ERROR", "Meal update payload is invalid.", requestId);
  }

  const { data, error } = await supabase
    .from("meals" as never)
    .update(patchRow as never)
    .eq("id", mealId)
    .eq("user_id", user.id)
    .select(selectMealColumns as never)
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return jsonError(404, "MEAL_NOT_FOUND", "Meal not found.", requestId);
    }
    return jsonError(500, "MEAL_UPDATE_FAILED", "Could not update meal. Please try again.", requestId);
  }

  if (!data) {
    return jsonError(404, "MEAL_NOT_FOUND", "Meal not found.", requestId);
  }

  return Response.json({ ok: true, requestId, data: { meal: data } });
}

export async function DELETE(request: Request, context: RouteContext) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const mealIdResult = await getMealId(context);
  if (!mealIdResult.success) {
    return jsonError(400, "VALIDATION_ERROR", "Meal id must be a valid UUID.", requestId);
  }
  const mealId = mealIdResult.data;
  const { supabase, user, response } = await getAuthenticatedUser(requestId);
  if (response || !user) return response;

  const { data, error } = await supabase
    .from("meals" as never)
    .delete()
    .eq("id", mealId)
    .eq("user_id", user.id)
    .select("id" as never)
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return jsonError(404, "MEAL_NOT_FOUND", "Meal not found.", requestId);
    }
    return jsonError(500, "MEAL_DELETE_FAILED", "Could not delete meal. Please try again.", requestId);
  }

  if (!data) {
    return jsonError(404, "MEAL_NOT_FOUND", "Meal not found.", requestId);
  }

  return Response.json({ ok: true, requestId, data: { deletedMealId: String((data as { id: string }).id) } });
}
