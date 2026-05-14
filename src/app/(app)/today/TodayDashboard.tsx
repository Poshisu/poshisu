import Link from "next/link";
import { ArrowLeft, ArrowRight, MessageCircle, PencilLine, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TodayMeal } from "@/lib/meals/today";

type TodayDashboardProps = {
  dateLabel: string;
  selectedDate?: string;
  meals: TodayMeal[];
};

type MacroKey = "protein" | "carbs" | "fat" | "fiber";

const macroLabels: Record<MacroKey, string> = {
  protein: "protein",
  carbs: "carbs",
  fat: "fat",
  fiber: "fiber",
};

function midpoint(low: number | null | undefined, high: number | null | undefined) {
  if (typeof low === "number" && typeof high === "number") return (low + high) / 2;
  if (typeof low === "number") return low;
  if (typeof high === "number") return high;
  return 0;
}

function formatNumber(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

function formatGrams(value: number) {
  return `${formatNumber(value, 1)} g`;
}

function formatSlot(slot: string | null) {
  if (!slot) return "Meal";
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

function correctionHref(mealId: string) {
  return `/chat?mealId=${encodeURIComponent(mealId)}&mode=correct`;
}

function shiftCalendarDate(value: string, days: number) {
  const base = new Date(`${value}T12:00:00+05:30`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function dateHref(date: string) {
  return `/today?date=${date}`;
}

function shiftDateHref(value: string | undefined, days: number) {
  if (!value) return "/today";
  return dateHref(shiftCalendarDate(value, days));
}

export function TodayDashboard({ dateLabel, selectedDate, meals }: TodayDashboardProps) {
  const totals = meals.reduce(
    (acc, meal) => {
      acc.kcalLow += meal.kcal_low;
      acc.kcalHigh += meal.kcal_high;
      acc.kcalLead += meal.kcal_lead ?? midpoint(meal.kcal_low, meal.kcal_high);
      acc.protein += midpoint(meal.protein_g_low, meal.protein_g_high);
      acc.carbs += midpoint(meal.carbs_g_low, meal.carbs_g_high);
      acc.fat += midpoint(meal.fat_g_low, meal.fat_g_high);
      acc.fiber += midpoint(meal.fiber_g_low, meal.fiber_g_high);
      return acc;
    },
    { kcalLow: 0, kcalHigh: 0, kcalLead: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{dateLabel}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Today</h1>
          <p className="text-sm text-muted-foreground">Daily totals, meal cards, and quick corrections.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Date navigation">
          <Button asChild variant="outline" size="sm">
            <Link href={shiftDateHref(selectedDate, -1)} aria-label="Previous day">
              <ArrowLeft aria-hidden="true" />
              Previous
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/today">Today</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={shiftDateHref(selectedDate, 1)} aria-label="Next day">
              Next
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </header>

      <section aria-label="Daily nutrition summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="surface-card rounded-2xl sm:col-span-2 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardDescription>{meals.length === 1 ? "1 meal logged" : `${meals.length} meals logged`}</CardDescription>
            <div className="text-3xl font-semibold leading-none tracking-tight">{formatNumber(totals.kcalLead)} kcal</div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatNumber(totals.kcalLow)}–{formatNumber(totals.kcalHigh)} kcal range
          </CardContent>
        </Card>

        {(["protein", "carbs", "fat", "fiber"] as MacroKey[]).map((key) => (
          <Card key={key} className="surface-card rounded-2xl">
            <CardHeader className="pb-3">
              <CardDescription className="capitalize">{macroLabels[key]}</CardDescription>
              <div className="text-xl font-semibold leading-none tracking-tight">
                {formatGrams(totals[key])} {macroLabels[key]}
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      {meals.length === 0 ? <EmptyTodayState /> : <MealTimeline meals={meals} />}
    </div>
  );
}

function EmptyTodayState() {
  return (
    <Card className="surface-card rounded-2xl border-dashed">
      <CardHeader>
        <CardTitle as="h2">No meals logged yet today</CardTitle>
        <CardDescription>Start with a quick text, voice note, or meal photo in Chat.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/chat">
            <MessageCircle aria-hidden="true" />
            Log your first meal
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function MealTimeline({ meals }: { meals: TodayMeal[] }) {
  return (
    <section aria-label="Meals logged today" className="grid gap-4 lg:grid-cols-2">
      {meals.map((meal) => {
        const slot = formatSlot(meal.meal_slot);
        const confidence = typeof meal.confidence === "number" ? Math.round(meal.confidence * 100) : null;
        const safetyFlags = meal.safety_flags ?? [];
        return (
          <Card key={meal.id} className="surface-card rounded-2xl">
            <article aria-label={`${slot} meal`}>
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle as="h2">{slot}</CardTitle>
                    <CardDescription>{meal.kcal_lead ?? midpoint(meal.kcal_low, meal.kcal_high)} kcal lead · {meal.kcal_low}–{meal.kcal_high} range</CardDescription>
                  </div>
                  {confidence !== null ? <Badge variant={confidence >= 75 ? "secondary" : "outline"}>{confidence}% confidence</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-foreground">{meal.source_text ?? "Saved meal"}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground" aria-label={`${slot} macro estimates`}>
                  <Badge variant="outline">P {formatGrams(midpoint(meal.protein_g_low, meal.protein_g_high))}</Badge>
                  <Badge variant="outline">C {formatGrams(midpoint(meal.carbs_g_low, meal.carbs_g_high))}</Badge>
                  <Badge variant="outline">F {formatGrams(midpoint(meal.fat_g_low, meal.fat_g_high))}</Badge>
                  <Badge variant="outline">Fiber {formatGrams(midpoint(meal.fiber_g_low, meal.fiber_g_high))}</Badge>
                </div>
                {meal.preparation_assumptions ? (
                  <p className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">Assumption: {meal.preparation_assumptions}</p>
                ) : null}
                {safetyFlags.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-destructive">
                    <ShieldAlert aria-hidden="true" className="size-4" />
                    {safetyFlags.map((flag) => <Badge key={flag} variant="destructive">{flag}</Badge>)}
                  </div>
                ) : null}
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                  <Link href={correctionHref(meal.id)} aria-label={`Correct ${meal.meal_slot ?? "meal"}`}>
                    <PencilLine aria-hidden="true" />
                    Correct estimate
                  </Link>
                </Button>
              </CardContent>
            </article>
          </Card>
        );
      })}
    </section>
  );
}
