import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatMealLogger } from "./ChatMealLogger";
import { formatIstDateLabel, getSelectedIstCalendarDate, loadTodayMeals } from "@/lib/meals/today";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Home",
  description: "Your Nourish home for daily nutrition and meal logging.",
};

type ChatPageProps = {
  searchParams?: Promise<{ status?: string; date?: string }> | { status?: string; date?: string };
};

function displayNameFromUser(user: { email?: string | null; user_metadata?: Record<string, unknown> | null }) {
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.user_metadata?.first_name;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim().split(/\s+/)[0];
  if (user.email) return user.email.split("@")[0];
  return "there";
}

export default async function ChatPage({ searchParams }: ChatPageProps = {}) {
  const params = await searchParams;
  const selectedDate = getSelectedIstCalendarDate(params?.date);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { meals } = await loadTodayMeals(selectedDate);

  return (
    <ChatMealLogger
      dateLabel={formatIstDateLabel(selectedDate)}
      initialMeals={meals}
      saveStatus={params?.status}
      userName={displayNameFromUser(user)}
    />
  );
}
