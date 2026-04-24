import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Trends",
  description: "See your weekly and monthly patterns.",
};

export default async function TrendsPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">Trends</h1>
        <p className="text-sm text-muted-foreground">Weekly and monthly patterns.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle as="h2">A few days of logging and this page comes alive</CardTitle>
          <CardDescription>
            You&apos;ll see weekday vs weekend patterns, protein and fiber consistency, macro balance over time, and the
            nudges that actually moved the needle for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Start logging in Chat and check back in a week — the charts need a few data points to be honest.</p>
        </CardContent>
      </Card>
    </div>
  );
}
