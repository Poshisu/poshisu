"use client";

import { cn } from "@/lib/utils";

interface AnswerChipsProps {
  /** The 0–6 chip labels to render. Order is preserved. */
  chips: ReadonlyArray<string>;
  /** Called when the user taps a chip — caller should fill the input and focus it. Does NOT auto-send. */
  onSelect: (chip: string) => void;
  /** Optional default chip — visually highlighted to nudge the choice without forcing it. */
  defaultChip?: string;
  /** Optional aria-label for the chip group. Defaults to "Suggested answers". */
  ariaLabel?: string;
  /** When true, chips are non-interactive (e.g. while waiting for an agent reply). */
  disabled?: boolean;
}

/**
 * Horizontal row of suggested-answer pills shown above the chat input.
 *
 * Behaviour:
 *   - Tap fills the input with the chip's label and moves focus there.
 *     Does NOT auto-submit — the user must edit (if they want) and tap Send.
 *   - Overflow scrolls horizontally on narrow screens; chips never wrap
 *     to a second row (avoids tap-target stack confusion).
 *   - The `defaultChip` (e.g. "Midpoint" on estimation_preference) gets a
 *     subtle ring so the eye lands on it first.
 *
 * Accessibility:
 *   - Wrapped in a `<div role="group">` with `aria-label` so screen readers
 *     announce the cluster as "Suggested answers, 4 buttons".
 *   - Each chip is a real `<button type="button">` — keyboard accessible
 *     by default, no mouse-only handlers.
 *   - Tap target is 44px tall (`h-11`) — meets WCAG 2.5.5 AA on mobile
 *     even when chips are tightly packed.
 *   - `whitespace-nowrap` on each chip keeps the label on a single line so
 *     vertical alignment in the scroll row stays consistent.
 */
export function AnswerChips({ chips, onSelect, defaultChip, ariaLabel = "Suggested answers", disabled = false }: AnswerChipsProps) {
  if (chips.length === 0) return null;

  const disabledReasonId = "answer-chips-disabled-reason";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {disabled ? (
        <span id={disabledReasonId} className="sr-only">
          Suggestions unavailable while the coach is responding.
        </span>
      ) : null}
      <div className="mx-auto flex w-fit max-w-2xl items-center gap-2">
        {chips.map((chip) => {
          const isDefault = chip === defaultChip;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => onSelect(chip)}
              disabled={disabled}
              aria-describedby={disabled ? disabledReasonId : undefined}
              className={cn(
                "inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isDefault
                  ? "border-primary bg-accent text-accent-foreground hover:bg-accent/80"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              {chip}
            </button>
          );
        })}
      </div>
    </div>
  );
}
