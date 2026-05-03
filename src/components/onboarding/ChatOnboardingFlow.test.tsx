import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatOnboardingFlow } from "@/components/onboarding/ChatOnboardingFlow";

describe("ChatOnboardingFlow", () => {
  it("renders first step and moves forward after valid name", () => {
    render(<ChatOnboardingFlow firstName="Aarti" />);

    expect(screen.getByText("Step 1 of 7")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 7")).toBeInTheDocument();
  });

  it("shows validation error when name is too short", () => {
    render(<ChatOnboardingFlow firstName="A" />);

    const input = screen.getByLabelText("What should I call you?");
    fireEvent.change(input, { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Please share a name with at least 2 letters.")).toBeInTheDocument();
  });

  it("requires profile confirmation before opening chat", () => {
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { assign: assignSpy },
      writable: true,
    });

    render(<ChatOnboardingFlow firstName="Aarti" />);

    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(screen.getByText("Step 7 of 7")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and open chat" }));

    expect(screen.getByText("Please confirm your profile before continuing to chat.")).toBeInTheDocument();
    expect(assignSpy).not.toHaveBeenCalled();
  });
});
