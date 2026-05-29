import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMealLogger } from "./ChatMealLogger";
import type { TodayMeal } from "@/lib/meals/today";

const originalFetch = globalThis.fetch;

const meals: TodayMeal[] = [
  {
    id: "meal-1",
    meal_slot: "breakfast",
    source_text: "Ate 1 grilled chicken breast with broccoli and beans",
    kcal_low: 180,
    kcal_high: 240,
    kcal_lead: 210,
    protein_g_low: 22,
    protein_g_high: 28,
    carbs_g_low: 2,
    carbs_g_high: 6,
    fat_g_low: 8,
    fat_g_high: 14,
    fiber_g_low: 0,
    fiber_g_high: 1,
    confidence: 0.86,
    preparation_assumptions: "Chicken breast estimated at 100g cooked.",
    safety_flags: [],
    logged_at: "2026-05-29T04:30:00.000Z",
  },
];

describe("ChatMealLogger", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          requestId: "req-chat-1",
          data: {
            intent: "meal_log_candidate",
            blocks: [
              {
                type: "meal_log_candidate",
                summary: "I had 2 idlis and sambar for breakfast",
                needsConfirmation: true,
                confidence: "high",
                mealSlot: "breakfast",
                confirmPayload: {
                  mealSlot: "breakfast",
                  sourceText: "I had 2 idlis and sambar for breakfast",
                  items: [
                    { name: "idli", quantity_g: 100, household_unit: "2 pieces" },
                    { name: "sambar", quantity_g: 100, household_unit: "1 bowl" },
                  ],
                  kcalLow: 185,
                  kcalHigh: 251,
                  kcalLead: 218,
                  confidence: 0.9,
                },
                estimate: { kcalMin: 185, kcalMax: 251, protein: 11, carbs: 35, fat: 3, fiber: 8 },
                rationale: "Assumed typical Indian home-style prep.",
                clarificationQuestions: [],
                safetyFlags: { blocked: false, allergenFlags: [], conditionFlags: [], blockingReasons: [] },
              },
              { type: "text", text: "Got it. Looks like a meal with idli and sambar." },
            ],
            assistantMessage: {
              id: "msg-assistant-1",
              role: "assistant",
              content: "Got it. Looks like a meal with idli and sambar.",
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("renders the combined Home summary, meal preview, and accessible composer", () => {
    render(<ChatMealLogger dateLabel="29 May 2026" initialMeals={meals} userName="Atu" />);

    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByText(/Good (morning|afternoon|evening), Atu/i)).toBeInTheDocument();
    expect(screen.getByText("1 meal logged today.")).toBeInTheDocument();
    expect(screen.getAllByText("180–240")[0]).toBeInTheDocument();
    expect(screen.getAllByText("25g")[0]).toBeInTheDocument();
    expect(screen.getByText("Today's meals (1)")).toBeInTheDocument();
    expect(screen.getByText("Ate 1 grilled chicken breast with broccoli and beans")).toBeInTheDocument();
    expect(screen.getByLabelText("Meal message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add meal photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record voice note" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send meal message" })).toBeDisabled();
  });

  it("sends a meal message and renders the rich estimate card with confirm action", async () => {
    render(<ChatMealLogger initialMeals={meals} />);

    fireEvent.change(screen.getByLabelText("Meal message"), { target: { value: "I had 2 idlis and sambar for breakfast" } });
    fireEvent.click(screen.getByRole("button", { name: "Send meal message" }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ text: "I had 2 idlis and sambar for breakfast" }),
        }),
      );
    });

    expect(await screen.findByText("Got it. Looks like a meal with idli and sambar.")).toBeInTheDocument();
    const estimate = screen.getByRole("region", { name: "Meal estimate" });
    expect(within(estimate).getByRole("heading", { name: "185–251 kcal" })).toBeInTheDocument();
    expect(within(estimate).getByText("Based on your logs")).toBeInTheDocument();
    expect(within(estimate).getByText("Carbs")).toBeInTheDocument();
    expect(within(estimate).getByText("35g")).toBeInTheDocument();
    expect(within(estimate).getByText("idli")).toBeInTheDocument();
    expect(within(estimate).getByText("2 pieces")).toBeInTheDocument();
    expect(within(estimate).getByRole("button", { name: "Breakfast" })).toHaveAttribute("aria-pressed", "true");
    expect(within(estimate).getByRole("button", { name: "Looks right" })).toBeInTheDocument();
  });

  it("does not render a broken save form when the assistant has no confirm payload", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          requestId: "req-chat-2",
          data: {
            blocks: [
              {
                type: "meal_log_candidate",
                summary: "I had unknown food",
                needsConfirmation: true,
                confidence: "low",
                estimate: { kcalMin: 0, kcalMax: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
                rationale: "I could not identify a specific food item.",
                clarificationQuestions: ["What food should I estimate?"],
                safetyFlags: { blocked: false, allergenFlags: [], conditionFlags: [], blockingReasons: [] },
              },
              { type: "text", text: "I need one quick clarification before I can save this." },
            ],
            assistantMessage: {
              id: "msg-assistant-2",
              content: "I need one quick clarification before I can save this.",
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as typeof fetch;

    render(<ChatMealLogger />);

    fireEvent.change(screen.getByLabelText("Meal message"), { target: { value: "I had unknown food" } });
    fireEvent.click(screen.getByRole("button", { name: "Send meal message" }));

    expect(await screen.findByText("I need one quick clarification before I can save this.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Looks right" })).not.toBeInTheDocument();
  });
});
