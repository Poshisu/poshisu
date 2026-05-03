import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatOnboardingFlow } from "@/components/onboarding/ChatOnboardingFlow";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Welcome to Nourish. Let's quickly set up your coach.",
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

  return <ChatOnboardingFlow firstName={firstName} />;
}
