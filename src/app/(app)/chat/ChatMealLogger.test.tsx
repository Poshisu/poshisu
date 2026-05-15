import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMealLogger } from "./ChatMealLogger";

const originalFetch = globalThis.fetch;

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
                    { name: "idli", quantity_g: 100, household_unit: "estimated serving" },
                    { name: "dal", quantity_g: 100, household_unit: "estimated serving" },
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
              { type: "text", text: "I can log this meal. Please confirm if the estimate looks right." },
            ],
            assistantMessage: {
              id: "msg-assistant-1",
              role: "assistant",
              kind: "text",
              content: "I can log this meal. Please confirm if the estimate looks right.",
              created_at: "2026-05-15T00:00:00.000Z",
              in_reply_to: "msg-user-1",
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("submits a text meal to /api/chat and renders a confirmable estimate", async () => {
    render(<ChatMealLogger />);

    fireEvent.change(screen.getByLabelText("Meal message"), {
      target: { value: "I had 2 idlis and sambar for breakfast" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "I had 2 idlis and sambar for breakfast" }),
      }),
    ));

    expect(await screen.findByText("I had 2 idlis and sambar for breakfast")).toBeInTheDocument();
    expect(screen.getByText("I can log this meal. Please confirm if the estimate looks right.")).toBeInTheDocument();
    expect(screen.getByText("Estimated meal: I had 2 idlis and sambar for breakfast")).toBeInTheDocument();
    expect(screen.getByText("185–251 kcal · confidence high")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Looks right — save meal" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("msg-assistant-1")).toHaveAttribute("name", "candidateId");
  });

  it("applies a quick chip through the same text submit path", async () => {
    render(<ChatMealLogger />);

    fireEvent.click(screen.getByRole("button", { name: "I had idli and sambar" }));
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "I had idli and sambar" }),
      }),
    ));
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
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("I need one quick clarification before I can save this.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Looks right — save meal" })).not.toBeInTheDocument();
  });
});
