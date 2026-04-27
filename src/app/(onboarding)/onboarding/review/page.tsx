import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Profile review",
  description: "A quick look at the profile we just built for you.",
};

/**
 * Placeholder review page. Sub-task 8 turns this into a full
 * read/edit surface backed by the generated profile.md. For now, it
 * confirms the save and offers a one-click jump into chat so the user
 * doesn't get stuck after completing onboarding.
 */
export default async function OnboardingReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-svh items-center justify-center p-6 focus-visible:outline-none"
    >
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">You're all set.</h1>
        <p className="text-muted-foreground">
          Your profile is saved. The full edit-and-review experience lands soon — for now you can
          jump into chat and start logging.
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
