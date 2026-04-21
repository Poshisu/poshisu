import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Welcome to Nourish. Your AI health coach is ready.",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const firstName =
    (user.user_metadata?.name as string | undefined)?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-svh items-center justify-center p-6 focus:outline-none">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Nourish, {firstName}.</h1>
        <p className="text-muted-foreground">
          Your coach learns about you from the way you eat and what you share. The more natural you are, the more useful
          it gets. Start by telling it about your last meal, or ask what to eat next.
        </p>
        <Link
          href="/chat"
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Open chat
          <span aria-hidden="true" className="ml-2">
            &rarr;
          </span>
        </Link>
      </div>
    </main>
  );
}
