import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMealLogger } from "./ChatMealLogger";
import type { TodayMeal } from "@/lib/meals/today";

const originalFetch = globalThis.fetch;
const originalScrollIntoView = Element.prototype.scrollIntoView;

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
    Element.prototype.scrollIntoView = vi.fn();
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
                  targetLocalDate: "2026-05-31",
                },
                estimate: { kcalMin: 185, kcalMax: 251, protein: 11, carbs: 35, fat: 3, fiber: 8 },
                rationale: "Assumed typical Indian home-style prep.",
                displayAssumptions: [
                  { label: "Portion", detail: "idli: 2 medium pieces; sambar: 1 bowl" },
                  { label: "Preparation", detail: "Steamed idli with home-style sambar and light tempering" },
                ],
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
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it("renders the combined Home summary, meal preview, and accessible composer", () => {
    render(<ChatMealLogger dateLabel="29 May 2026" initialMeals={meals} userName="Atu" />);

    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByText(/Good (morning|afternoon|evening), Atu/i)).toBeInTheDocument();
    expect(screen.getByText("1 meal logged today.")).toBeInTheDocument();
    expect(screen.getAllByText("180–240")[0]).toBeInTheDocument();
    expect(screen.getAllByText("25g")[0]).toBeInTheDocument();
    const stickySummary = screen.getByRole("button", { name: "Open daily nutrition details" });
    expect(within(stickySummary).getByText("210 kcal")).toBeInTheDocument();
    expect(within(stickySummary).getByText("11g")).toBeInTheDocument();
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
    expect(within(estimate).getByRole("heading", { name: "218 kcal" })).toBeInTheDocument();
    expect(within(estimate).getByText("Likely range 185–251 kcal")).toBeInTheDocument();
    expect(within(estimate).getByText("Based on your logs")).toBeInTheDocument();
    expect(within(estimate).getByText("Carbs")).toBeInTheDocument();
    expect(within(estimate).getByText("35g")).toBeInTheDocument();
    expect(within(estimate).getByText("idli")).toBeInTheDocument();
    expect(within(estimate).getByText("2 pieces")).toBeInTheDocument();
    expect(within(estimate).getByText("Portion")).toBeInTheDocument();
    expect(within(estimate).getByText("idli: 2 medium pieces; sambar: 1 bowl")).toBeInTheDocument();
    expect(within(estimate).getByRole("button", { name: "Breakfast" })).toHaveAttribute("aria-pressed", "true");
    expect(within(estimate).getByLabelText("Log date")).toHaveValue("2026-05-31");
    expect(within(estimate).getByText(/totals for 31 May 2026/)).toBeInTheDocument();
    expect(within(estimate).getByRole("button", { name: "Looks right" })).toBeInTheDocument();
  });



  it("sends with Enter on desktop-style keyboard input and keeps Shift+Enter as multiline", async () => {
    render(<ChatMealLogger initialMeals={meals} />);
    const composer = screen.getByLabelText("Meal message");

    fireEvent.change(composer, { target: { value: "I had 2 idlis and sambar for breakfast" } });
    fireEvent.keyDown(composer, { key: "Enter", code: "Enter", shiftKey: true });
    expect(globalThis.fetch).not.toHaveBeenCalled();

    fireEvent.keyDown(composer, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("hydrates persisted chat messages and pending estimate after refresh", () => {
    render(
      <ChatMealLogger
        initialMessages={[
          { id: "msg-user-old", role: "user", content: "I had paneer and roti" },
          { id: "msg-assistant-old", role: "assistant", content: "Got it — I estimated this meal." },
        ]}
        initialCandidate={{
          type: "meal_log_candidate",
          summary: "paneer and roti",
          needsConfirmation: true,
          confidence: "high",
          mealSlot: "dinner",
          assistantMessageId: "msg-assistant-old",
          confirmPayload: {
            mealSlot: "dinner",
            items: [{ name: "paneer", quantity_g: 100, household_unit: "~100 g paneer portion" }],
          },
          estimate: { kcalMin: 320, kcalMax: 430, protein: 22, carbs: 24, fat: 20, fiber: 3 },
          rationale: "Portion: paneer ~100 g",
          displayAssumptions: [{ label: "Preparation", detail: "Medium-spice paneer with moderate oil" }],
          clarificationQuestions: [],
          safetyFlags: { blocked: false, allergenFlags: [], conditionFlags: [], blockingReasons: [] },
        }}
      />,
    );

    expect(screen.getByText("I had paneer and roti")).toBeInTheDocument();
    expect(screen.getByText("Got it — I estimated this meal.")).toBeInTheDocument();
    expect(screen.queryByText(/Tell me what you ate/i)).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Meal estimate" })).toBeInTheDocument();
    expect(screen.getByText("~100 g paneer portion")).toBeInTheDocument();
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

  it("uses non-estimate thinking copy for general chat while waiting", async () => {
    let resolveResponse: (value: Response) => void = () => {};
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    ) as typeof fetch;

    render(<ChatMealLogger />);

    fireEvent.change(screen.getByLabelText("Meal message"), { target: { value: "Do you remember what I had for dinner?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send meal message" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/Stirring up|tadka|Plating/);
    expect(screen.queryByText("Estimating your meal…")).not.toBeInTheDocument();

    resolveResponse(
      new Response(
        JSON.stringify({
          ok: true,
          requestId: "req-general",
          data: {
            blocks: [{ type: "text", text: "You logged a dinner earlier today." }],
            assistantMessage: { id: "msg-general", content: "You logged a dinner earlier today." },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    expect(await screen.findByText("You logged a dinner earlier today.")).toBeInTheDocument();
  });

  it("sends pending estimate context when the user adjusts a confirmation card", async () => {
    render(
      <ChatMealLogger
        initialCandidate={{
          type: "meal_log_candidate",
          summary: "paneer tikka and rice",
          needsConfirmation: true,
          confidence: "medium",
          mealSlot: "dinner",
          assistantMessageId: "msg-candidate",
          confirmPayload: {
            mealSlot: "dinner",
            items: [
              { name: "paneer", quantity_g: 100, household_unit: "~100 g paneer tikka" },
              { name: "rice", quantity_g: 150, household_unit: "~1 bowl cooked rice" },
            ],
          },
          estimate: { kcalMin: 420, kcalMax: 560, protein: 24, carbs: 58, fat: 18, fiber: 4 },
          rationale: "Portion estimate",
          clarificationQuestions: [],
          safetyFlags: { blocked: false, allergenFlags: [], conditionFlags: [], blockingReasons: [] },
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Meal message"), { target: { value: "Make that half the rice" } });
    fireEvent.click(screen.getByRole("button", { name: "Send meal message" }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            text: "Make that half the rice",
            pendingCandidate: {
              summary: "paneer tikka and rice",
              mealSlot: "dinner",
              estimate: { kcalMin: 420, kcalMax: 560, protein: 24, carbs: 58, fat: 18, fiber: 4 },
              items: [
                { name: "paneer", householdUnit: "~100 g paneer tikka", quantityG: 100 },
                { name: "rice", householdUnit: "~1 bowl cooked rice", quantityG: 150 },
              ],
            },
          }),
        }),
      );
    });

    expect(await screen.findByRole("region", { name: "Meal estimate" })).toBeInTheDocument();
  });


  it("sends pending estimate context when the user asks to log the visible estimate", async () => {
    render(
      <ChatMealLogger
        initialCandidate={{
          type: "meal_log_candidate",
          summary: "fish sauce and Vietnamese sweet dipping sauce lunch",
          needsConfirmation: true,
          confidence: "medium",
          mealSlot: "lunch",
          assistantMessageId: "msg-candidate",
          confirmPayload: {
            mealSlot: "lunch",
            items: [
              { name: "rice paper rolls", quantity_g: 180, household_unit: "~2 medium rolls" },
              { name: "fish sauce", quantity_g: 15, household_unit: "~1 tbsp thin fish sauce" },
            ],
          },
          estimate: { kcalMin: 310, kcalMax: 610, protein: 22, carbs: 58, fat: 14, fiber: 4 },
          rationale: "Best guess from the current confirmation card.",
          clarificationQuestions: [],
          safetyFlags: { blocked: false, allergenFlags: [], conditionFlags: [], blockingReasons: [] },
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Meal message"), { target: { value: "cool please log this meal" } });
    fireEvent.click(screen.getByRole("button", { name: "Send meal message" }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            text: "cool please log this meal",
            pendingCandidate: {
              summary: "fish sauce and Vietnamese sweet dipping sauce lunch",
              mealSlot: "lunch",
              estimate: { kcalMin: 310, kcalMax: 610, protein: 22, carbs: 58, fat: 14, fiber: 4 },
              items: [
                { name: "rice paper rolls", householdUnit: "~2 medium rolls", quantityG: 180 },
                { name: "fish sauce", householdUnit: "~1 tbsp thin fish sauce", quantityG: 15 },
              ],
            },
          }),
        }),
      );
    });
  });

  it("opens a readable daily nutrition sheet from the sticky summary", () => {
    render(<ChatMealLogger dateLabel="29 May 2026" initialMeals={meals} />);

    fireEvent.click(screen.getByRole("button", { name: "Open daily nutrition details" }));

    const dialog = screen.getByRole("dialog", { name: "Daily nutrition details" });
    expect(within(dialog).getByText("Dishes eaten")).toBeInTheDocument();
    expect(within(dialog).getByText("Ate 1 grilled chicken breast with broccoli and beans")).toBeInTheDocument();
    expect(within(dialog).getByText("Macros vs daily value")).toBeInTheDocument();
    expect(within(dialog).getByRole("row", { name: /Protein 25g 50g 50%/ })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Micronutrients" })).toBeInTheDocument();
  });

  it("does not send a pending estimate when the user asks for daily totals", async () => {
    render(
      <ChatMealLogger
        initialCandidate={{
          type: "meal_log_candidate",
          summary: "paneer tikka and rice",
          needsConfirmation: true,
          confidence: "medium",
          mealSlot: "dinner",
          assistantMessageId: "msg-candidate",
          confirmPayload: {
            mealSlot: "dinner",
            items: [{ name: "paneer", quantity_g: 100, household_unit: "~100 g paneer tikka" }],
          },
          estimate: { kcalMin: 420, kcalMax: 560, protein: 24, carbs: 58, fat: 18, fiber: 4 },
          rationale: "Portion estimate",
          clarificationQuestions: [],
          safetyFlags: { blocked: false, allergenFlags: [], conditionFlags: [], blockingReasons: [] },
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Meal message"), { target: { value: "What are my totals on macros and micros for the day vs DVA?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send meal message" }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({
          body: JSON.stringify({ text: "What are my totals on macros and micros for the day vs DVA?" }),
        }),
      );
    });
  });

});
