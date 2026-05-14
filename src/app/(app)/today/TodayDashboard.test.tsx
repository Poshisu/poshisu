import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TodayDashboard } from "./TodayDashboard";
import type { TodayMeal } from "@/lib/meals/today";

const meals: TodayMeal[] = [
  {
    id: "meal-1",
    meal_slot: "breakfast",
    source_text: "Akki roti, chutney, chikoo, and whey",
    kcal_low: 850,
    kcal_high: 950,
    kcal_lead: 900,
    protein_g_low: 35,
    protein_g_high: 45,
    carbs_g_low: 125,
    carbs_g_high: 145,
    fat_g_low: 20,
    fat_g_high: 28,
    fiber_g_low: 12,
    fiber_g_high: 16,
    confidence: 0.82,
    preparation_assumptions: "Dark chocolate estimated at 5g.",
    safety_flags: [],
    logged_at: "2026-05-14T04:30:00.000Z",
  },
  {
    id: "meal-2",
    meal_slot: "lunch",
    source_text: "Dal, rice, curd",
    kcal_low: 520,
    kcal_high: 640,
    kcal_lead: 580,
    protein_g_low: 18,
    protein_g_high: 24,
    carbs_g_low: 80,
    carbs_g_high: 95,
    fat_g_low: 11,
    fat_g_high: 16,
    fiber_g_low: 7,
    fiber_g_high: 10,
    confidence: 0.68,
    preparation_assumptions: null,
    safety_flags: ["high sodium estimate"],
    logged_at: "2026-05-14T08:15:00.000Z",
  },
];

describe("TodayDashboard", () => {
  it("renders production daily totals, macro summary, and meal correction actions", () => {
    render(<TodayDashboard dateLabel="14 May 2026" selectedDate="2026-05-14" meals={meals} />);

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("14 May 2026")).toBeInTheDocument();
    expect(screen.getByText("2 meals logged")).toBeInTheDocument();
    expect(screen.getByText("1,480 kcal")).toBeInTheDocument();
    expect(screen.getByText("1,370–1,590 kcal range")).toBeInTheDocument();
    expect(screen.getByText("61.0 g protein")).toBeInTheDocument();
    expect(screen.getByText("222.5 g carbs")).toBeInTheDocument();
    expect(screen.getByText("37.5 g fat")).toBeInTheDocument();
    expect(screen.getByText("22.5 g fiber")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous day" })).toHaveAttribute("href", "/today?date=2026-05-13");
    expect(screen.getByRole("link", { name: "Next day" })).toHaveAttribute("href", "/today?date=2026-05-15");

    const breakfast = screen.getByRole("article", { name: /breakfast/i });
    expect(within(breakfast).getByText("Akki roti, chutney, chikoo, and whey")).toBeInTheDocument();
    expect(within(breakfast).getByText("900 kcal lead · 850–950 range")).toBeInTheDocument();
    expect(within(breakfast).getByRole("link", { name: "Correct breakfast" })).toHaveAttribute(
      "href",
      "/chat?mealId=meal-1&mode=correct",
    );

    const lunch = screen.getByRole("article", { name: /lunch/i });
    expect(within(lunch).getByText("high sodium estimate")).toBeInTheDocument();
    expect(within(lunch).getByRole("link", { name: "Correct lunch" })).toHaveAttribute(
      "href",
      "/chat?mealId=meal-2&mode=correct",
    );
  });

  it("renders a useful empty state with a chat CTA", () => {
    render(<TodayDashboard dateLabel="14 May 2026" meals={[]} />);

    expect(screen.getByText("No meals logged yet today")).toBeInTheDocument();
    expect(screen.getByText("Start with a quick text, voice note, or meal photo in Chat.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log your first meal" })).toHaveAttribute("href", "/chat");
  });
});
