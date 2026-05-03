import { z } from "zod";
import type { OnboardingAnswers } from "@/lib/onboarding/types";

const hhMmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const mealTimesSchema = z
  .object({
    breakfast: z.string().regex(hhMmRegex, "Breakfast time must be HH:mm").optional(),
    lunch: z.string().regex(hhMmRegex, "Lunch time must be HH:mm").optional(),
    dinner: z.string().regex(hhMmRegex, "Dinner time must be HH:mm").optional(),
    snacks: z.string().regex(hhMmRegex, "Snacks time must be HH:mm").optional(),
  })
  .refine((value) => Boolean(value.breakfast || value.lunch || value.dinner), {
    message: "Add at least one main meal time (breakfast, lunch, or dinner).",
  });

const conditionEnum = z.enum([
  "type-2-diabetes",
  "type-1-diabetes",
  "prediabetes",
  "pcos-pcod",
  "hypertension",
  "high-cholesterol",
  "thyroid",
  "fatty-liver",
  "ibs-gerd",
  "kidney-disease",
  "pregnancy-breastfeeding",
  "other",
]);

export const onboardingAnswersSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(80, "Name is too long"),
    age: z.number().int().min(13).max(100),
    gender: z.enum(["female", "male", "non-binary", "prefer-not-to-say"]),
    height_cm: z.number().min(100).max(250),
    weight_kg: z.number().min(25).max(250),
    city: z.string().trim().min(2).max(120).optional(),
    primary_goal: z.enum(["lose-weight", "gain-weight", "maintain", "manage-condition", "wellness"]),
    goal_target_kg: z.number().min(25).max(250).optional(),
    goal_timeline_weeks: z.number().int().min(1).max(156).optional(),
    conditions: z.array(conditionEnum),
    conditions_other: z.string().trim().max(250).optional(),
    medications_affecting_diet: z.string().trim().max(250).optional(),
    dietary_pattern: z.enum(["veg", "veg-egg", "non-veg", "vegan", "jain", "pescetarian", "none"]),
    allergies: z.array(z.string().trim().min(1).max(80)).default([]),
    dislikes: z.string().trim().max(250).optional(),
    meal_times: mealTimesSchema,
    eating_context: z.enum(["home", "mixed", "out", "varies"]),
    estimation_preference: z.enum(["conservative", "midpoint", "liberal"]),
  })
  .superRefine((value, ctx) => {
    const goalNeedsTarget = value.primary_goal === "lose-weight" || value.primary_goal === "gain-weight";

    if (goalNeedsTarget && value.goal_target_kg === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Goal target is required for lose/gain weight goals.",
        path: ["goal_target_kg"],
      });
    }

    if (goalNeedsTarget && value.goal_timeline_weeks === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Goal timeline is required for lose/gain weight goals.",
        path: ["goal_timeline_weeks"],
      });
    }

    if (!value.conditions.includes("other") && value.conditions_other) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "conditions_other is only allowed when conditions include 'other'.",
        path: ["conditions_other"],
      });
    }
  });

export function parseOnboardingAnswers(input: unknown): OnboardingAnswers {
  return onboardingAnswersSchema.parse(input);
}
