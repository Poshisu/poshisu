import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingChatFlow } from "./OnboardingChatFlow";

// VoiceRecorder hits navigator.mediaDevices and fetch — neither matters for
// flow-level tests. Mock it to a no-op button.
vi.mock("@/components/chat/VoiceRecorder", () => ({
  VoiceRecorder: () => null,
}));

function getInput(): HTMLTextAreaElement {
  // The aria-label is the current question's prompt; we look up by role to
  // avoid coupling tests to specific wording for every question.
  return screen.getByRole("textbox") as HTMLTextAreaElement;
}

function answer(text: string) {
  fireEvent.change(getInput(), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
}

async function waitForBubble(matcher: RegExp | string) {
  await waitFor(() => {
    expect(screen.getByText(matcher)).toBeInTheDocument();
  });
}

describe("OnboardingChatFlow", () => {
  beforeEach(() => {
    // Each test starts fresh.
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the opening line and the first question on mount", async () => {
    render(<OnboardingChatFlow firstName="Aarti" />);
    await waitForBubble(/Hey Aarti/);
    await waitForBubble(/What should I call you/);
  });

  it("falls back to a generic opening when firstName is absent", async () => {
    render(<OnboardingChatFlow />);
    await waitForBubble(/Hey — six quick questions/);
  });

  it("advances to the next question when an answer parses", async () => {
    render(<OnboardingChatFlow firstName="Aarti" />);
    await waitForBubble(/What should I call you/);

    answer("Aarti");

    // User bubble + next question both rendered.
    await waitForBubble("Aarti");
    await waitForBubble(/How old are you/);
  });

  it("re-prompts when an answer fails to parse", async () => {
    render(<OnboardingChatFlow />);
    await waitForBubble(/What should I call you/);

    answer("Aarti");
    await waitForBubble(/How old are you/);

    // 12 is below the 13–100 valid range → clarification.
    answer("12");
    await waitForBubble(/ages 13–100/i);

    // Question stays active — input is empty, ready for retry.
    expect(getInput().value).toBe("");
  });

  it("fills the input when a chip is tapped, but does not auto-send", async () => {
    render(<OnboardingChatFlow firstName="Aarti" />);
    await waitForBubble(/What should I call you/);

    // Advance to gender (which has chips).
    answer("Aarti");
    await waitForBubble(/How old are you/);
    answer("34");
    await waitForBubble(/gender/i);

    // Chip tap fills input but doesn't progress to next question.
    fireEvent.click(screen.getByRole("button", { name: "Female" }));
    expect(getInput().value).toBe("Female");
    // The "How old are you" agent bubble was the last bubble. Confirm we
    // haven't advanced past gender yet by checking the next question's
    // prompt isn't on screen.
    expect(screen.queryByText(/Roughly how tall/)).not.toBeInTheDocument();
  });

  it("highlights the default chip on estimation_preference", async () => {
    render(<OnboardingChatFlow firstName="Aarti" />);
    // Walk through the entire flow up to estimation_preference.
    const ANSWERS: Array<string> = [
      "Aarti",
      "34",
      "Female",
      "162",
      "68",
      "Bengaluru",
      "Eat better", // → maintain (skips goal_target_and_timeline)
      "None",
      "None",
      "Vegetarian",
      "None",
      "Skip",
      "Standard",
      "Mostly cook",
    ];
    for (const ans of ANSWERS) {
      await waitFor(() => expect(getInput()).toBeInTheDocument());
      answer(ans);
    }
    await waitForBubble(/calorie estimates/i);
    const midpoint = screen.getByRole("button", { name: "Midpoint" });
    expect(midpoint.className).toContain("border-primary");
  });

  it("calls onComplete with validated answers when every question is answered", async () => {
    const onComplete = vi.fn();
    render(<OnboardingChatFlow firstName="Aarti" onComplete={onComplete} />);

    const ANSWERS: Array<string> = [
      "Aarti",
      "34",
      "Female",
      "162",
      "68",
      "Bengaluru",
      "Eat better",
      "None",
      "None",
      "Vegetarian",
      "None",
      "Skip",
      "Standard",
      "Mostly cook",
      "Midpoint",
    ];
    for (const ans of ANSWERS) {
      await waitFor(() => expect(getInput()).toBeInTheDocument());
      answer(ans);
    }

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    const submitted = onComplete.mock.calls[0][0];
    expect(submitted).toMatchObject({
      name: "Aarti",
      age: 34,
      gender: "female",
      height_cm: 162,
      weight_kg: 68,
      city: "Bengaluru",
      primary_goal: "maintain",
      conditions: [],
      dietary_pattern: "veg",
      allergies: [],
      eating_context: "home",
      estimation_preference: "midpoint",
      meal_times: { breakfast: "08:00", lunch: "13:00", dinner: "20:00" },
    });

    // Finalising message appears.
    await waitForBubble(/putting your profile together/i);
  });

  it("includes goal_target_and_timeline when goal is lose-weight", async () => {
    const onComplete = vi.fn();
    render(<OnboardingChatFlow firstName="Aarti" onComplete={onComplete} />);

    const ANSWERS: Array<string> = [
      "Aarti",
      "34",
      "Female",
      "162",
      "68",
      "Bengaluru",
      "Lose weight",
      "60 kg in 24 weeks", // conditional question fires
      "None",
      "None",
      "Vegetarian",
      "None",
      "Skip",
      "Standard",
      "Mostly cook",
      "Midpoint",
    ];
    for (const ans of ANSWERS) {
      await waitFor(() => expect(getInput()).toBeInTheDocument());
      answer(ans);
    }

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    const submitted = onComplete.mock.calls[0][0];
    expect(submitted.primary_goal).toBe("lose-weight");
    expect(submitted.goal_target_kg).toBe(60);
    expect(submitted.goal_timeline_weeks).toBe(24);
  });

  it("clears the input after a valid send", async () => {
    render(<OnboardingChatFlow firstName="Aarti" />);
    await waitForBubble(/What should I call you/);

    answer("Aarti");
    await waitForBubble(/How old are you/);

    expect(getInput().value).toBe("");
  });

  it("does nothing when Send is clicked with empty input", async () => {
    const onComplete = vi.fn();
    render(<OnboardingChatFlow firstName="Aarti" onComplete={onComplete} />);
    await waitForBubble(/What should I call you/);

    // Send button is disabled when input is empty — confirm that.
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("includes a screen-reader-only 'Question N of M' prefix on each question prompt", async () => {
    render(<OnboardingChatFlow firstName="Aarti" />);
    await waitForBubble(/What should I call you/);

    // M = 15 for a non-weight-loss goal flow (16 - 1 conditional skipped).
    // For the very first question we don't yet know the goal, so M reflects
    // "what would fire given an empty draft" — also 15 (skipIf returns true
    // when primary_goal is undefined ≠ lose/gain).
    expect(screen.getByText(/Question 1 of 15/)).toBeInTheDocument();
  });

  it("advances the SR progress prefix each time a question is answered", async () => {
    render(<OnboardingChatFlow firstName="Aarti" />);
    await waitForBubble(/What should I call you/);

    answer("Aarti");
    await waitForBubble(/How old are you/);

    // After answering the first question, the second question's bubble
    // should carry the "Question 2 of 15" prefix.
    expect(screen.getByText(/Question 2 of 15/)).toBeInTheDocument();
  });
});
