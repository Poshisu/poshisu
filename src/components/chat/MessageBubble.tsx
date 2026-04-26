import { cn } from "@/lib/utils";
import type { Message } from "./types";

/**
 * One message bubble — agent on the left, user on the right.
 *
 * Visual conventions (per Phase 1 design defaults):
 *   - Agent: `bg-muted` light grey, all corners rounded.
 *   - User: `bg-primary` with `text-primary-foreground`, bottom-right
 *     corner squared off (the corner closest to the input area).
 *
 * Honours newlines (`whitespace-pre-wrap`). Long URLs / words wrap with
 * `break-words` so they don't blow out the layout on narrow screens.
 *
 * Accessibility notes:
 *   - Bubbles are wrapped in `<li>` by ChatThread; this component just
 *     renders the content.
 *   - The author is conveyed visually (side, colour) and via the
 *     `data-author` attribute (useful for tests and screen-reader CSS).
 *   - We don't add `role="article"` because the parent `<ol>` + author
 *     prefix in the live region already gives screen readers the context
 *     they need.
 */
export function MessageBubble({ message }: { message: Message }) {
  const isAgent = message.author === "agent";

  return (
    <div
      data-author={message.author}
      className={cn("flex w-full", isAgent ? "justify-start" : "justify-end")}
    >
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%]",
          isAgent
            ? "rounded-bl-md bg-muted text-foreground"
            : "rounded-br-md bg-primary text-primary-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
