"use client";

import { useRef, useState } from "react";
import { AnswerChips } from "@/components/chat/AnswerChips";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatThread } from "@/components/chat/ChatThread";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
import type { Message } from "@/components/chat/types";
import { onboardingAnswersSchema, parseAnswer } from "@/lib/onboarding/parser";
import {
  type OnboardingQuestion,
  type OnboardingQuestionId,
  QUESTIONS,
  nextQuestion,
} from "@/lib/onboarding/questions";
import type { OnboardingAnswers, OnboardingDraft } from "@/lib/onboarding/types";

let _msgCounter = 0;
function nextMsgId(): string {
  _msgCounter += 1;
  return `m_${_msgCounter}`;
}

interface InputHandle {
  focus: () => void;
}

/**
 * Result the parent's onComplete handler can return:
 *   - undefined / { ok: true } — success. The handler has either already
 *     redirected (server action) or is fire-and-forget. We never see the
 *     { ok: true } branch in practice because the redirect throws first.
 *   - { ok: false, error } — show the error in the chat and let the user
 *     try again. The flow drops out of the "putting together" state and
 *     appends an error bubble.
 *   - throw — server action redirected (NEXT_REDIRECT control-flow error).
 *     Propagates naturally; the user navigates away.
 */
export type OnboardingCompleteResult = void | { ok: true } | { ok: false; error: string };

export interface OnboardingChatFlowProps {
  /** Personalises the opening message. Falls back to a generic greeting if absent. */
  firstName?: string;
  /**
   * Called once with the validated, complete answers when every question
   * is answered. May be a server action (redirects on success). Errors
   * surfaced via `{ ok: false, error }` are rendered inline as an agent
   * bubble so the user can read them in context.
   */
  onComplete?: (answers: OnboardingAnswers) => Promise<OnboardingCompleteResult> | OnboardingCompleteResult;
}

/**
 * The chat-based onboarding flow.
 *
 * Flow logic lives entirely in `handleSend` — no `useEffect` reacting to
 * state changes. Each Send press synchronously decides:
 *   - whether the answer parses (ok → advance, clarify → re-prompt),
 *   - whether the next question exists (no → validate + call onComplete).
 *
 * Live-region split: the user bubble and the agent bubble are appended in
 * TWO separate setMessages calls (the agent bubble via setTimeout). This
 * gives the `role="log"` live region two distinct DOM mutation events,
 * which all major SR + browser combos handle reliably. Inserting both in
 * a single React commit can make NVDA + Chrome announce only one of them.
 *
 * Initial messages are seeded via the lazy useState initializer so they're
 * present on first render with no extra render trip.
 *
 * Non-goals (deliberate, see docs/BACKLOG.md):
 *   - localStorage persistence (refresh restarts the flow).
 *   - Streaming voice transcription (we wait for the full text).
 *   - Multi-language UI.
 */

const AGENT_BUBBLE_DELAY_MS = 100;

/**
 * Count the questions that will fire given the current draft, accounting
 * for `skipIf`. Used to give SR users an accurate "Question N of M".
 */
function totalQuestionsForDraft(draft: OnboardingDraft): number {
  return QUESTIONS.filter((q) => !q.skipIf?.(draft)).length;
}

function buildOpeningMessages(firstName: string | undefined, firstQuestion: OnboardingQuestion): Message[] {
  const opening = firstName
    ? `Hey ${firstName} — six quick questions and we're done. About four minutes.`
    : "Hey — six quick questions and we're done. About four minutes.";
  // The first question gets the "Question 1 of M" prefix for SR users.
  const total = totalQuestionsForDraft({});
  return [
    { id: nextMsgId(), author: "agent", content: opening },
    {
      id: nextMsgId(),
      author: "agent",
      content: firstQuestion.prompt,
      srPrefix: `Question 1 of ${total}`,
    },
  ];
}

export function OnboardingChatFlow({ firstName, onComplete }: OnboardingChatFlowProps) {
  const firstQuestion = nextQuestion({}, new Set());
  const [messages, setMessages] = useState<Message[]>(() =>
    firstQuestion ? buildOpeningMessages(firstName, firstQuestion) : [],
  );
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [answeredIds, setAnsweredIds] = useState<Set<OnboardingQuestionId>>(new Set());
  const [inputValue, setInputValue] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isFinalising, setIsFinalising] = useState(false);
  const inputRef = useRef<InputHandle | null>(null);

  const currentQuestion: OnboardingQuestion | null = nextQuestion(draft, answeredIds);

  /**
   * Append a single message immediately (synchronous setState).
   */
  function appendMessage(msg: Message) {
    setMessages((prev) => [...prev, msg]);
  }

  /**
   * Append an agent message after a short delay so the live region sees a
   * separate DOM mutation event from the preceding user message.
   */
  function appendAgentMessageDelayed(msg: Message) {
    setTimeout(() => {
      setMessages((prev) => [...prev, msg]);
    }, AGENT_BUBBLE_DELAY_MS);
  }

  /**
   * Schedule a focus restore after the browser has finished processing the
   * current activation event. requestAnimationFrame is the right primitive
   * here — `setTimeout(..., 0)` races the click handler on Safari iOS +
   * VoiceOver and can re-assert focus to the just-clicked button.
   */
  function focusInputNextFrame() {
    if (typeof window === "undefined") return;
    if (typeof window.requestAnimationFrame !== "function") {
      inputRef.current?.focus();
      return;
    }
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleSend() {
    if (!currentQuestion) return;
    const raw = inputValue.trim();
    if (raw.length === 0) return;

    const userMsg: Message = { id: nextMsgId(), author: "user", content: raw };
    const result = parseAnswer(currentQuestion.id, raw, draft);

    // 1. User bubble appears synchronously.
    appendMessage(userMsg);

    // 2. Agent bubble appears in a separate DOM mutation event so SR users
    //    hear "You: <answer>" and the next agent message as distinct
    //    announcements.
    if (!result.ok) {
      appendAgentMessageDelayed({
        id: nextMsgId(),
        author: "agent",
        content: result.ask,
      });
    } else {
      const newDraft: OnboardingDraft = { ...draft, ...result.fields };
      const newAnswered = new Set(answeredIds);
      newAnswered.add(currentQuestion.id);
      const next = nextQuestion(newDraft, newAnswered);
      setDraft(newDraft);
      setAnsweredIds(newAnswered);

      if (next) {
        const totalAfterAdvance = totalQuestionsForDraft(newDraft);
        appendAgentMessageDelayed({
          id: nextMsgId(),
          author: "agent",
          content: next.prompt,
          srPrefix: `Question ${newAnswered.size + 1} of ${totalAfterAdvance}`,
        });
      } else {
        // Last question just answered — validate the draft and call
        // onComplete. The per-question parsers should have built a
        // schema-valid draft already; the safeParse is defence in depth.
        const validated = onboardingAnswersSchema.safeParse(newDraft);
        const finalising: Message = {
          id: nextMsgId(),
          author: "agent",
          content: validated.success
            ? "Got it — putting your profile together…"
            : "Hmm, something looks off in your answers. Mind starting over?",
        };
        appendAgentMessageDelayed(finalising);
        if (validated.success) {
          setIsFinalising(true);
          // Fire onComplete and surface any returned error inline. A
          // server action that redirects on success will throw a
          // NEXT_REDIRECT error here — the framework handles the navigation,
          // so we don't need to catch it.
          void Promise.resolve(onComplete?.(validated.data))
            .then((result) => {
              if (result && "ok" in result && result.ok === false) {
                setIsFinalising(false);
                appendAgentMessageDelayed({
                  id: nextMsgId(),
                  author: "agent",
                  content: `${result.error} You can also tap Send again to retry.`,
                });
              }
            })
            .catch(() => {
              // Re-thrown errors that aren't NEXT_REDIRECT (those are
              // intercepted upstream) are unexpected. Reset the spinner
              // and show a generic message.
              setIsFinalising(false);
              appendAgentMessageDelayed({
                id: nextMsgId(),
                author: "agent",
                content: "Something went wrong saving your profile. Please tap Send again to retry.",
              });
            });
        }
      }
    }

    setInputValue("");
    setVoiceError(null);
    focusInputNextFrame();
  }

  function handleChipSelect(chip: string) {
    setInputValue(chip);
    setVoiceError(null);
    focusInputNextFrame();
  }

  function handleTranscript(text: string) {
    // If the user already had something in the input, append. Otherwise
    // replace. Either way, focus moves to the input so the user can edit
    // before sending.
    setInputValue((prev) => (prev.trim().length > 0 ? `${prev.trim()} ${text}` : text));
    setVoiceError(null);
    focusInputNextFrame();
  }

  function handleVoiceError(message: string) {
    setVoiceError(message);
  }

  // The textarea's accessible name is the visible question prompt — keeps
  // accessible name and visible context aligned (WCAG 2.5.3 label-in-name).
  const inputAriaLabel = currentQuestion?.prompt ?? "Onboarding answer";
  const inputPlaceholder = currentQuestion?.optional
    ? "Type, skip, or use voice"
    : "Type or use voice";

  // Inner h-full (not h-svh) — the parent <main> already pins the page to
  // h-svh. Stacking two h-svh containers is redundant and risks fragility
  // with iOS safe-area + viewport-fit.
  return (
    <div className="flex h-full flex-col bg-background">
      <ChatThread messages={messages} isAgentTyping={isFinalising} />

      {currentQuestion ? (
        <div>
          <AnswerChips
            chips={currentQuestion.chips}
            onSelect={handleChipSelect}
            defaultChip={currentQuestion.defaultChip}
          />

          {voiceError ? (
            <p
              role="status"
              aria-live="polite"
              className="mx-auto max-w-2xl px-4 pb-1 text-xs text-destructive"
            >
              {voiceError}
            </p>
          ) : null}

          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSend}
            placeholder={inputPlaceholder}
            ariaLabel={inputAriaLabel}
            inputRef={inputRef}
            leftSlot={
              <VoiceRecorder
                onTranscript={handleTranscript}
                onError={handleVoiceError}
              />
            }
          />
        </div>
      ) : null}
    </div>
  );
}
