"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useImperativeHandle, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_ROWS = 6;

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** Placeholder for the textarea. */
  placeholder?: string;
  /** When true, the input and send button are non-interactive. */
  disabled?: boolean;
  /** Visible label tying the textarea to a `<label>` for screen readers. Required for a11y. */
  ariaLabel: string;
  /**
   * Imperative ref — lets the parent move focus into the input after a
   * chip selection or programmatically. We expose `focus()` only so the
   * parent can't accidentally read/write internal state.
   */
  inputRef?: React.Ref<{ focus: () => void }>;
  /** Optional slot rendered at the start of the toolbar (left of textarea). Sub-task 5 plugs the voice button in here. */
  leftSlot?: React.ReactNode;
}

/**
 * Multiline chat input bar with a primary send button.
 *
 * Behaviour:
 *   - Auto-resizes from 1 line up to MAX_ROWS, then scrolls.
 *   - Enter submits, Shift+Enter inserts a newline. Matches WhatsApp / iMessage.
 *   - Submit is disabled when value is empty or only whitespace.
 *   - Voice button slot is left-pluggable (sub-task 5 wires VoiceRecorder here).
 *
 * Accessibility:
 *   - `aria-label` is required from the caller — the visible context
 *     (e.g. "Type your answer") is a per-question prompt above, not a
 *     persistent label here.
 *   - Send button has its own aria-label so SR users hear "Send" instead
 *     of relying on the icon alone.
 *   - Disabled states honour both `disabled` prop and an empty value.
 *   - safe-area-inset-bottom padding so the input doesn't sit under the
 *     iOS home indicator on full-screen PWAs.
 */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Type your answer…",
  disabled = false,
  ariaLabel,
  inputRef,
  leftSlot,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useImperativeHandle(inputRef, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  // Autosize the textarea from 1 line up to MAX_ROWS on every value change.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const padding = 16; // py-2 on textarea adds ~16px combined.
    const maxHeight = lineHeight * MAX_ROWS + padding;
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  const isEmpty = value.trim().length === 0;
  const sendDisabled = disabled || isEmpty;

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!sendDisabled) onSubmit();
    }
  }

  return (
    <div
      className="border-t border-border bg-background px-4 pt-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
        {leftSlot}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          disabled={disabled}
          rows={1}
          className={cn(
            "min-h-[44px] flex-1 resize-none py-2.5 leading-snug",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
          )}
        />
        <Button
          type="button"
          size="icon"
          onClick={onSubmit}
          disabled={sendDisabled}
          aria-label="Send"
          className="size-11 shrink-0 rounded-full"
        >
          <ArrowUp aria-hidden="true" className="size-5" />
        </Button>
      </div>
    </div>
  );
}
