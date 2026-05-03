import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatOnboardingFlow } from "@/components/onboarding/ChatOnboardingFlow";

describe("ChatOnboardingFlow conversational", () => {
  it("renders chat onboarding and first assistant prompt", () => {
    render(<ChatOnboardingFlow firstName="Aarti" />);
    expect(screen.getByText("Nourish onboarding")).toBeInTheDocument();
    expect(screen.getByText("What should I call you?")).toBeInTheDocument();
  });

  it("advances through conversational questions", () => {
    render(<ChatOnboardingFlow firstName="Aarti" />);

    const messages = ["Aarti", "29", "Lose weight", "None", "Vegetarian", "09:00 13:00 19:00"];
    for (const msg of messages) {
      fireEvent.change(screen.getByPlaceholderText("Type your answer naturally..."), { target: { value: msg } });
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
    }

    expect(screen.getByText("What I understood")).toBeInTheDocument();
  });

  it("requires profile confirmation before continue", () => {
    Object.defineProperty(window, "location", {
      value: { assign: vi.fn() },
      writable: true,
    });

    render(<ChatOnboardingFlow firstName="Aarti" />);

    const messages = ["Aarti", "29", "Maintain", "None", "Vegetarian", "09:00 13:00 19:00"];
    for (const msg of messages) {
      fireEvent.change(screen.getByPlaceholderText("Type your answer naturally..."), { target: { value: msg } });
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
    }

    fireEvent.click(screen.getByRole("button", { name: "Start building" }));
    expect(screen.getByText("Please confirm the profile summary before we continue.")).toBeInTheDocument();
  });
});
