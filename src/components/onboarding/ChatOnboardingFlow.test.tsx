import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatOnboardingFlow } from "@/components/onboarding/ChatOnboardingFlow";

describe("ChatOnboardingFlow", () => {
  it("renders first step and moves forward after valid name", () => {
    render(<ChatOnboardingFlow firstName="Aarti" />);

    expect(screen.getByText("Step 1 of 6")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 6")).toBeInTheDocument();
  });

  it("shows validation error when name is too short", () => {
    render(<ChatOnboardingFlow firstName="A" />);

    const input = screen.getByLabelText("What should I call you?");
    fireEvent.change(input, { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Please share a name with at least 2 letters.")).toBeInTheDocument();
  });
});
