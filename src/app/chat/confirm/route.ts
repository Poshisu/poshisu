import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmMealEstimate } from "@/lib/meals/confirm";
import type { ConfirmableMealEstimate } from "@/lib/meals/confirm";
import { createClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  mealSlot: z.enum(["breakfast", "lunch", "dinner", "snack", "beverage", "other"]),
  sourceText: z.string().min(1),
  items: z.array(z.object({ name: z.string().min(1), quantity_g: z.number().positive(), household_unit: z.string().optional() })).min(1),
  kcalLow: z.number().nonnegative(),
  kcalHigh: z.number().nonnegative(),
  kcalLead: z.number().nonnegative(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  fiber: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1),
  targetLocalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const safetyFlagsSchema = z.object({
  blocked: z.boolean(),
  blockingReasons: z.array(z.string()).default([]),
}).passthrough();

const candidateMetadataSchema = z.object({
  mealCandidate: z.object({
    confirmPayload: payloadSchema,
    safetyFlags: safetyFlagsSchema,
  }),
});

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const rawCandidateId = formData.get("candidateId");

  if (typeof rawCandidateId !== "string" || rawCandidateId.trim().length === 0) {
    return redirectTo(request, "/chat?error=invalid_confirm");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirectTo(request, "/login");
  }

  const { data: rawMessage, error: messageError } = await supabase
    .from("messages" as never)
    .select("id, metadata")
    .eq("id", rawCandidateId.trim())
    .eq("user_id", user.id)
    .eq("role", "assistant")
    .single();

  if (messageError || !rawMessage) {
    return redirectTo(request, "/chat?error=invalid_confirm");
  }

  const message = rawMessage as unknown as { metadata: unknown };
  const parsed = candidateMetadataSchema.safeParse(message.metadata);

  if (!parsed.success) {
    return redirectTo(request, "/chat?error=invalid_confirm");
  }

  if (parsed.data.mealCandidate.safetyFlags.blocked) {
    return redirectTo(request, "/chat?error=safety_blocked");
  }

  const targetLocalDate = formData.get("targetLocalDate");
  const mealSlot = formData.get("mealSlot");
  const mealSlotOverride =
    typeof mealSlot === "string" && ["breakfast", "lunch", "dinner", "snack", "beverage", "other"].includes(mealSlot)
      ? (mealSlot as ConfirmableMealEstimate["mealSlot"])
      : undefined;
  const confirmPayload: ConfirmableMealEstimate = {
    ...parsed.data.mealCandidate.confirmPayload,
    ...(mealSlotOverride ? { mealSlot: mealSlotOverride } : {}),
    ...(typeof targetLocalDate === "string" && targetLocalDate.trim() ? { targetLocalDate: targetLocalDate.trim() } : {}),
  };

  const result = await confirmMealEstimate(confirmPayload);
  const destination = result.status === "duplicate_ignored" ? "/chat?status=duplicate_ignored" : "/chat?status=saved";
  return redirectTo(request, destination);
}
