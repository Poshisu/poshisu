import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Today",
  description: "Your meals, totals, and balance for today.",
};

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">Your meals, totals, and balance.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle as="h2">No meals logged yet today</CardTitle>
          <CardDescription>
            As soon as your coach is live, everything you tell it will show up here — running totals for calories,
            protein, fiber, hydration, and a daily radar that shows what&apos;s balanced and what&apos;s off.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Start in Chat — even a rough note like &ldquo;idli and sambar for breakfast&rdquo; works.</p>
        </CardContent>
      </Card>
    </div>
  );
}
