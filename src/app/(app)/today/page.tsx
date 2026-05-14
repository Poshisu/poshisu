import { redirect } from "next/navigation";
import { TodayDashboard } from "./TodayDashboard";
import { formatIstDateLabel, getSelectedIstCalendarDate, loadTodayMeals } from "@/lib/meals/today";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Today",
  description: "Your meals, totals, and balance for today.",
};

type TodayPageProps = {
  searchParams?: Promise<{ date?: string }> | { date?: string };
};

export default async function TodayPage({ searchParams }: TodayPageProps = {}) {
  const params = await searchParams;
  const selectedDate = getSelectedIstCalendarDate(params?.date);
  const { user, meals } = await loadTodayMeals(selectedDate);

  if (!user) {
    redirect("/login");
  }

  return (
    <TodayDashboard
      dateLabel={formatIstDateLabel(selectedDate)}
      selectedDate={selectedDate}
      meals={meals}
    />
  );
}
