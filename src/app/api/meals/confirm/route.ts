import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmMealEstimate } from "@/lib/meals/confirm";

const payloadSchema = z.object({
  mealSlot: z.enum(["breakfast", "lunch", "dinner", "snack", "beverage", "other"]),
  sourceText: z.string().min(1),
  items: z.array(z.object({ name: z.string().min(1), quantity_g: z.number().positive(), household_unit: z.string().optional() })).min(1),
  kcalLow: z.number().nonnegative(),
  kcalHigh: z.number().nonnegative(),
  kcalLead: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid meal confirmation payload" }, { status: 400 });
  }

  await confirmMealEstimate(parsed.data);

  return NextResponse.json({ ok: true }, { status: 201 });
}
