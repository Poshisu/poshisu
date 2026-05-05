import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Chat",
  description: "Chat with your Nourish coach.",
};

const MOCK_ESTIMATE = {
  mealSlot: "lunch",
  sourceText: "2 rotis and a bowl of dal",
  items: [
    { name: "roti", quantity_g: 120, household_unit: "2 medium" },
    { name: "dal", quantity_g: 180, household_unit: "1 bowl" },
  ],
  kcalLow: 420,
  kcalHigh: 520,
  kcalLead: 470,
  confidence: 0.83,
} as const;

export default async function ChatPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="text-sm text-muted-foreground">Review this meal estimate and confirm to save.</p>
      </header>

      <Card className="surface-card-hero rounded-3xl">
        <CardHeader>
          <CardTitle as="h2">Estimated meal: 2 rotis and dal</CardTitle>
          <CardDescription>
            {MOCK_ESTIMATE.kcalLow}–{MOCK_ESTIMATE.kcalHigh} kcal · confidence {Math.round(MOCK_ESTIMATE.confidence * 100)}%
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>This is a minimal confirm-save flow for the first end-to-end logging loop.</p>
          <form action="/chat/confirm" method="post" className="space-y-2">
            <input type="hidden" name="payload" value={JSON.stringify(MOCK_ESTIMATE)} />
            <button type="submit" className="rounded-lg bg-[color:var(--brand)] px-3 py-2 font-medium text-[color:var(--brand-foreground)] hover:opacity-90">
              Looks right — save meal
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
