/**
 * Three-dot pulse shown as an agent bubble while we wait for the next
 * agent message. Pure CSS animation (no JS), respects
 * `prefers-reduced-motion` via the global rule in `app/globals.css`.
 *
 * Accessibility:
 *   - `role="status"` + `aria-label="Coach is typing"` so screen readers
 *     announce activity without re-announcing every dot tick.
 *   - Hidden visually-only via `aria-hidden` on the dots; the role/label
 *     does the work.
 */
export function TypingIndicator() {
  return (
    <div className="flex w-full justify-start" data-author="agent">
      <div
        role="status"
        aria-label="Coach is typing"
        className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-3"
      >
        <span aria-hidden="true" className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
        <span aria-hidden="true" className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
        <span aria-hidden="true" className="size-2 animate-bounce rounded-full bg-muted-foreground/60" />
      </div>
    </div>
  );
}
