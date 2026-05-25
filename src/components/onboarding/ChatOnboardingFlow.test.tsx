import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatOnboardingFlow } from "@/components/onboarding/ChatOnboardingFlow";

const completeOnboardingActionMock = vi.fn();

vi.mock("@/app/(onboarding)/actions", () => ({
  completeOnboardingAction: (...args: unknown[]) => completeOnboardingActionMock(...args),
}));

describe("ChatOnboardingFlow progressive onboarding", () => {
  beforeEach(() => {
    completeOnboardingActionMock.mockReset();
    window.localStorage.clear();
  });

  it("renders step-by-step onboarding with progress", () => {
    render(<ChatOnboardingFlow firstName="Aarti" />);
    expect(screen.getByText("1 of 7")).toBeInTheDocument();
    expect(screen.getByText("Hey there!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("validates first step name before continue", () => {
    render(<ChatOnboardingFlow firstName="Aarti" />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter your name.");
  });

  it("restores saved draft state", () => {
    window.localStorage.setItem(
      "onboarding.chat.draft.v1",
      JSON.stringify({
        step: 1,
        draft: {
          name: "Aarti",
          age: 29,
          gender: "prefer-not-to-say",
          height_cm: 165,
          weight_kg: 65,
          city: "Not shared",
          primary_goal: "maintain",
          conditions: [],
          conditions_other: "",
          medications_affecting_diet: "",
          dietary_pattern: "none",
          allergies: [],
          dislikes: "",
          meal_times: { breakfast: "09:00", lunch: "13:00", dinner: "19:00" },
          eating_context: "mixed",
          estimation_preference: "midpoint",
        },
      }),
    );
    render(<ChatOnboardingFlow firstName="Aarti" />);
    expect(screen.getByText("2 of 7")).toBeInTheDocument();
    expect(screen.getByDisplayValue("29")).toBeInTheDocument();
  });
});

