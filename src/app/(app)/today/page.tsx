import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadTodayMeals } from "@/lib/meals/today";

export const metadata: Metadata = {
  title: "Today",
  description: "Your meals, totals, and balance for today.",
};

export default async function TodayPage() {
  const { user, meals } = await loadTodayMeals();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">Your meals, totals, and balance.</p>
      </header>

      {meals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle as="h2">No meals logged yet today</CardTitle>
            <CardDescription>Confirm an estimate in Chat and it will appear here immediately.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        meals.map((meal) => (
          <Card key={meal.id}>
            <CardHeader>
              <CardTitle as="h2" className="capitalize">{meal.meal_slot ?? "Meal"}</CardTitle>
              <CardDescription>{meal.kcal_low}–{meal.kcal_high} kcal</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{meal.source_text ?? "Saved meal"}</CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
