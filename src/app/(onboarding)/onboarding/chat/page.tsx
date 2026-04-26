import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingChatFlow } from "@/components/onboarding/OnboardingChatFlow";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Getting started",
  description: "A six-step chat to get your Nourish coach calibrated.",
};

export default async function OnboardingChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const firstName =
    (user.user_metadata?.name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    undefined;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex h-svh flex-col focus-visible:outline-none"
    >
      <OnboardingChatFlow firstName={firstName} />
    </main>
  );
}
