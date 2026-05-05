import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatOnboardingFlow } from "@/components/onboarding/ChatOnboardingFlow";

const completeOnboardingActionMock = vi.fn();

vi.mock("@/app/(onboarding)/actions", () => ({
  completeOnboardingAction: (...args: unknown[]) => completeOnboardingActionMock(...args),
}));

function completeReviewStep() {
  const messages = ["Aarti", "29", "Maintain", "None", "Vegetarian", "09:00 13:00 19:00"];
  for (const msg of messages) {
    fireEvent.change(screen.getByPlaceholderText("Type your answer naturally..."), { target: { value: msg } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
  }
}

describe("ChatOnboardingFlow conversational", () => {
  beforeEach(() => {
    completeOnboardingActionMock.mockReset();
  });
  it("disables submit while loading", async () => {
    completeOnboardingActionMock.mockImplementation(() => new Promise(() => {}));
    render(<ChatOnboardingFlow firstName="Aarti" />);

    completeReviewStep();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Start building" }));

    expect(screen.getByRole("button", { name: "Saving profile..." })).toBeDisabled();
    expect(screen.getByText("This can take a few seconds while we prepare your profile.")).toBeInTheDocument();
  });

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

  it("shows contextual chips and applies chip-driven updates", () => {
    render(<ChatOnboardingFlow firstName="Aarti" />);

    fireEvent.change(screen.getByPlaceholderText("Type your answer naturally..."), { target: { value: "Aarti" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.change(screen.getByPlaceholderText("Type your answer naturally..."), { target: { value: "29" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.change(screen.getByPlaceholderText("Type your answer naturally..."), { target: { value: "Maintain" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.click(screen.getByRole("button", { name: "None" }));
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.click(screen.getByRole("button", { name: "Vegetarian" }));
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.click(screen.getByRole("button", { name: "09:00 13:00 19:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("Diet: veg")).toBeInTheDocument();
    expect(screen.getByText("Conditions: none shared")).toBeInTheDocument();
  });

  it("shows low-confidence clarifier prompts for ambiguous inputs", () => {
    render(<ChatOnboardingFlow firstName="Aarti" />);
    const messages = ["Aarti", "29", "Maintain", "None", "allergy to peanuts but i dislike milk", "depends"];
    for (const msg of messages) {
      fireEvent.change(screen.getByPlaceholderText("Type your answer naturally..."), { target: { value: msg } });
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
    }

    expect(screen.getByText(/medical allergy or mostly a dislike/i)).toBeInTheDocument();
    expect(screen.getByText(/approximate times/i)).toBeInTheDocument();
    expect(screen.getAllByText("Confidence: low").length).toBeGreaterThan(0);
  });

  it("requires profile confirmation before continue", () => {
    render(<ChatOnboardingFlow firstName="Aarti" />);

    completeReviewStep();

    fireEvent.click(screen.getByRole("button", { name: "Start building" }));
    expect(screen.getByText("Please confirm the profile summary before we continue.")).toBeInTheDocument();
  });

  it("shows a clear server failure message and supports retry", async () => {
    completeOnboardingActionMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);

    render(<ChatOnboardingFlow firstName="Aarti" />);
    completeReviewStep();
    fireEvent.click(screen.getByRole("checkbox"));

    fireEvent.click(screen.getByRole("button", { name: "Start building" }));
    expect(await screen.findByText("We couldn’t save your onboarding yet. Check your connection and retry.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(completeOnboardingActionMock).toHaveBeenCalledTimes(2));
  });

  it("redirects to chat on successful submit", async () => {
    completeOnboardingActionMock.mockResolvedValue(undefined);
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { assign },
      writable: true,
    });

    render(<ChatOnboardingFlow firstName="Aarti" />);
    completeReviewStep();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Start building" }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/chat"));
  });
});
