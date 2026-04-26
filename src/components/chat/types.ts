/**
 * Shared types for the chat-shell primitives. Reused by Phase 1 onboarding
 * and Phase 2 chat. Kept narrow on purpose — Phase 2 may extend `Message`
 * with a discriminated union for richer payloads (meal cards, photo
 * attachments, etc.) without breaking these primitives.
 */

export type MessageAuthor = "agent" | "user";

export interface Message {
  /** Stable identifier — used for React keys and aria-relevant lookups. */
  id: string;
  /** Who wrote the message. Drives bubble styling and side. */
  author: MessageAuthor;
  /** Plain text content. Preserves explicit newlines (`\n`). */
  content: string;
  /** Optional timestamp. Phase 1 doesn't render this; reserved for date dividers in Phase 2. */
  timestamp?: Date;
}
