import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrendsDashboard } from "./TrendsDashboard";
import type { TrendsViewModel } from "@/lib/trends";

const trendData: TrendsViewModel = {
  selectedPeriod: "week",
  selectedDate: "2026-05-14",
  dateLabel: "14 May 2026",
  rangeLabel: "8 May–14 May",
  days: [
    { date: "2026-05-08", label: "8 May", mealCount: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    { date: "2026-05-09", label: "9 May", mealCount: 2, kcal: 1400, protein: 52, carbs: 180, fat: 42, fiber: 18 },
    { date: "2026-05-10", label: "10 May", mealCount: 3, kcal: 1700, protein: 66, carbs: 210, fat: 51, fiber: 24 },
    { date: "2026-05-11", label: "11 May", mealCount: 2, kcal: 1550, protein: 58, carbs: 190, fat: 49, fiber: 20 },
    { date: "2026-05-12", label: "12 May", mealCount: 1, kcal: 900, protein: 35, carbs: 125, fat: 28, fiber: 14 },
    { date: "2026-05-13", label: "13 May", mealCount: 3, kcal: 1900, protein: 74, carbs: 235, fat: 60, fiber: 27 },
    { date: "2026-05-14", label: "14 May", mealCount: 2, kcal: 1480, protein: 61, carbs: 223, fat: 38, fiber: 23 },
  ],
  summary: {
    daysLogged: 6,
    totalDays: 7,
    consistencyPct: 86,
    avgKcal: 1488,
    avgProtein: 58,
    avgFiber: 21,
    currentStreak: 6,
    longestStreak: 6,
  },
  insights: [
    { title: "Protein consistency is improving", body: "You averaged 58g protein on logged days.", tone: "positive" },
    { title: "Fiber is close but uneven", body: "Two days were below the weekly average.", tone: "warning" },
  ],
};

describe("TrendsDashboard", () => {
  it("renders period tabs, summary cards, charts, streaks, and insights", () => {
    render(<TrendsDashboard data={trendData} />);

    expect(screen.getByRole("heading", { name: "Trends" })).toBeInTheDocument();
    expect(screen.getByText("8 May–14 May")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Week" })).toHaveAttribute("href", "/trends?period=week&date=2026-05-14");
    expect(screen.getByRole("link", { name: "Month" })).toHaveAttribute("href", "/trends?period=month&date=2026-05-14");
    expect(screen.getByRole("link", { name: "3-Month" })).toHaveAttribute("href", "/trends?period=quarter&date=2026-05-14");

    expect(screen.getByText("86% consistency")).toBeInTheDocument();
    expect(screen.getByText("1,488 kcal avg")).toBeInTheDocument();
    expect(screen.getByText("58.0 g protein avg")).toBeInTheDocument();
    expect(screen.getByText("6 day current streak")).toBeInTheDocument();

    const calorieChart = screen.getByRole("img", { name: "Calorie trend chart" });
    expect(within(calorieChart).getByText("1,900")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Macro distribution chart" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Period radar chart" })).toBeInTheDocument();

    expect(screen.getByText("Protein consistency is improving")).toBeInTheDocument();
    expect(screen.getByText("Fiber is close but uneven")).toBeInTheDocument();
  });

  it("renders an honest empty state when there is not enough data", () => {
    render(<TrendsDashboard data={{ ...trendData, days: trendData.days.map((day) => ({ ...day, mealCount: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })), summary: { daysLogged: 0, totalDays: 7, consistencyPct: 0, avgKcal: 0, avgProtein: 0, avgFiber: 0, currentStreak: 0, longestStreak: 0 }, insights: [] }} />);

    expect(screen.getByText("Not enough trend data yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log a meal in Chat" })).toHaveAttribute("href", "/chat");
  });
});
