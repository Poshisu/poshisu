import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const mealSlotSchema = z.enum(["breakfast", "lunch", "dinner", "snack", "beverage", "other"]);

const mealItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity_g: z.number().positive().max(5000),
  household_unit: z.string().trim().min(1).max(120).optional(),
});

const mealRangeSchema = z
  .object({
    mealSlot: mealSlotSchema,
    sourceText: z.string().trim().min(1).max(4000),
    items: z.array(mealItemSchema).min(1).max(30),
    kcalLow: z.number().nonnegative().max(10000),
    kcalHigh: z.number().nonnegative().max(10000),
    kcalLead: z.number().nonnegative().max(10000),
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
  .refine((value) => value.kcalLow <= value.kcalLead && value.kcalLead <= value.kcalHigh, {
    message: "Expected kcalLow <= kcalLead <= kcalHigh",
  });

type MealCreateInput = z.infer<typeof mealRangeSchema>;

type JsonMealItem = z.infer<typeof mealItemSchema>;

type MealInsertRow = {
  user_id: string;
  logged_at?: string;
  meal_slot: MealCreateInput["mealSlot"];
  items: JsonMealItem[];
  kcal_low: number;
  kcal_high: number;
  kcal_lead: number;
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
  user_confirmed: boolean;
  user_corrected?: boolean;
  photo_url?: string;
  source_text: string;
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

function toInsertRow(userId: string, input: MealCreateInput): MealInsertRow {
  return {
    user_id: userId,
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
    user_confirmed: input.userConfirmed ?? true,
    user_corrected: input.userCorrected,
    photo_url: input.photoUrl,
    source_text: input.sourceText,
  };
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const { supabase, user, response } = await getAuthenticatedUser(requestId);
  if (response || !user) return response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if ((from && !z.string().datetime({ offset: true }).safeParse(from).success) || (to && !z.string().datetime({ offset: true }).safeParse(to).success)) {
    return jsonError(400, "VALIDATION_ERROR", "from and to must be ISO datetimes when provided.", requestId);
  }

  let query = supabase.from("meals" as never).select(selectMealColumns as never).eq("user_id", user.id);
  if (from) query = query.gte("logged_at", from);
  if (to) query = query.lte("logged_at", to);

  const { data, error } = await query.order("logged_at", { ascending: false });
  if (error) {
    return jsonError(500, "MEALS_READ_FAILED", "Could not load meals. Please try again.", requestId);
  }

  return Response.json({ ok: true, requestId, data: { meals: data ?? [] } });
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const { supabase, user, response } = await getAuthenticatedUser(requestId);
  if (response || !user) return response;

  const parsedJson = await parseJson(request, requestId);
  if (parsedJson.response) return parsedJson.response;

  const parsed = mealRangeSchema.safeParse(parsedJson.body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Meal payload is invalid. Check items, kcal range, and timestamps.", requestId);
  }

  const { data, error } = await supabase
    .from("meals" as never)
    .insert(toInsertRow(user.id, parsed.data) as never)
    .select(selectMealColumns as never)
    .single();

  if (error || !data) {
    return jsonError(500, "MEAL_CREATE_FAILED", "Could not save meal. Please try again.", requestId);
  }

  return Response.json({ ok: true, requestId, data: { meal: data } }, { status: 201 });
}
