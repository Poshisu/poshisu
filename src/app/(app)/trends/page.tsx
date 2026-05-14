import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TrendsDashboard } from "./TrendsDashboard";
import { getTrendsParams, loadTrendsData } from "@/lib/trends";

export const metadata: Metadata = {
  title: "Trends",
  description: "See your weekly and monthly patterns.",
};

type TrendsPageProps = {
  searchParams?: Promise<{ period?: string; date?: string }> | { period?: string; date?: string };
};

export default async function TrendsPage({ searchParams }: TrendsPageProps = {}) {
  const params = await searchParams;
  const { period, selectedDate } = getTrendsParams(params);
  const { user, data } = await loadTrendsData({ period, selectedDate });

  if (!user) {
    redirect("/login");
  }

  return <TrendsDashboard data={data} />;
}
