import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatOnboardingFlow } from "@/components/onboarding/ChatOnboardingFlow";
import { isOnboardingComplete } from "@/lib/auth/onboardingState";
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

  const { data: onboardingRow } = await supabase
    .from("users" as never)
    .select("onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  if (isOnboardingComplete(onboardingRow as { onboarded_at: string | null } | null)) {
    redirect("/chat");
  }

  const firstName =
    (user.user_metadata?.name as string | undefined)?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";

  return <ChatOnboardingFlow firstName={firstName} />;
}
