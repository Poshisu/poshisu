import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-md space-y-2 text-center">
        <h1 className="text-2xl font-semibold">You&apos;re in.</h1>
        <p className="text-muted-foreground">Onboarding wizard coming in Phase 1. For now, head to the chat.</p>
        <a href="/chat" className="inline-block pt-2 text-sm font-medium underline-offset-4 hover:underline">
          Go to chat →
        </a>
      </div>
    </main>
  );
}
