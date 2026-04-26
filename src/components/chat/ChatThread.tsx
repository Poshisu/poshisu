"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import type { Message } from "./types";

/**
 * Distance from the bottom (px) below which we treat the user as "still
 * reading the latest" and auto-scroll on new messages. Anything above
 * this — the user has deliberately scrolled up — and we leave the scroll
 * position alone so they can finish reading.
 */
const STICKY_BOTTOM_THRESHOLD_PX = 100;

interface ChatThreadProps {
  messages: ReadonlyArray<Message>;
  /** When true, show the typing indicator at the bottom of the thread. */
  isAgentTyping?: boolean;
}

/**
 * The message log. Mobile-first scrollable column, smooth auto-scroll to
 * the bottom on new messages with a "sticky read-back" affordance: if the
 * user has manually scrolled up, we stop auto-scrolling so they can finish
 * reading.
 *
 * Accessibility:
 *   - `role="log"` + `aria-live="polite"` + `aria-atomic="false"` so each
 *     new message is announced once without re-reading the whole thread.
 *   - `<ol>` for stable structure; each message is an `<li>` so screen
 *     readers can navigate with list shortcuts.
 *   - Reduced-motion: scroll behaviour falls back to `auto` via the
 *     global stylesheet rule in `app/globals.css`.
 */
export function ChatThread({ messages, isAgentTyping = false }: ChatThreadProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;
    if (!container || !end) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom <= STICKY_BOTTOM_THRESHOLD_PX) {
      // CSS prefers-reduced-motion zeroes out CSS animations but does NOT
      // override the JS scrollIntoView API in every browser. Read the media
      // query directly and force `behavior: "auto"` for reduced-motion users.
      const reducedMotion =
        typeof window !== "undefined" && window.matchMedia
          ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
          : false;
      end.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "end" });
    }
  }, [messages.length, isAgentTyping]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6">
      <ol
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Conversation"
        className="mx-auto flex w-full max-w-2xl flex-col gap-3"
      >
        {messages.map((message) => (
          <li key={message.id}>
            <MessageBubble message={message} />
          </li>
        ))}
        {isAgentTyping ? (
          <li>
            <TypingIndicator />
          </li>
        ) : null}
      </ol>
      <div ref={endRef} aria-hidden="true" />
    </div>
  );
}
