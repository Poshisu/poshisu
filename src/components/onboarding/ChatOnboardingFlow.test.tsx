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
    expect(screen.getByLabelText("Upload photo")).toBeInTheDocument();
    expect(screen.getByLabelText("Use camera")).toBeInTheDocument();
    expect(screen.getByLabelText("Upload file")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voice" })).toBeInTheDocument();
  });

  it("adds image, file, and audio messages with attachment metadata", async () => {
    render(<ChatOnboardingFlow firstName="Aarti" />);

    const photo = new File(["img"], "meal.jpg", { type: "image/jpeg" });
    const doc = new File(["pdf"], "report.pdf", { type: "application/pdf" });

    fireEvent.change(screen.getByLabelText("Upload photo"), { target: { files: [photo] } });
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [doc] } });
    fireEvent.click(screen.getByRole("button", { name: "Voice" }));

    expect(await screen.findByText("Shared photo: meal.jpg")).toBeInTheDocument();
    expect(screen.getByText("Uploaded file: report.pdf")).toBeInTheDocument();
    expect(screen.getByText("Voice note captured (placeholder)")).toBeInTheDocument();
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
