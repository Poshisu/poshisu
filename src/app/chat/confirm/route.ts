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
  const formData = await request.formData();
  const rawPayload = formData.get("payload");
  const payload = typeof rawPayload === "string" ? JSON.parse(rawPayload) : null;
  const parsed = payloadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/chat?error=invalid_confirm", request.url), { status: 303 });
  }

  await confirmMealEstimate(parsed.data);
  return NextResponse.redirect(new URL("/today", request.url), { status: 303 });
}
