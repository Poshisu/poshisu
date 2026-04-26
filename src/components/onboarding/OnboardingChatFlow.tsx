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

export interface OnboardingChatFlowProps {
  /** Personalises the opening message. Falls back to a generic greeting if absent. */
  firstName?: string;
  /** Called once with the validated, complete answers when every question is answered. */
  onComplete?: (answers: OnboardingAnswers) => void;
}

/**
 * The 16-question chat-based onboarding flow.
 *
 * Flow logic lives entirely in `handleSend` — no `useEffect` reacting to
 * state changes. Each Send press synchronously decides:
 *   - whether the answer parses (ok → advance, clarify → re-prompt),
 *   - whether the next question exists (no → validate + call onComplete),
 *   - what messages to append in a single setMessages batch.
 *
 * Initial messages are seeded via the lazy useState initializer so they're
 * present on first render with no extra render trip.
 *
 * Non-goals (deliberate, see docs/BACKLOG.md):
 *   - localStorage persistence (refresh restarts the flow).
 *   - Streaming voice transcription (we wait for the full text).
 *   - Multi-language UI.
 */
function buildOpeningMessages(firstName: string | undefined, firstQuestion: OnboardingQuestion): Message[] {
  const opening = firstName
    ? `Hey ${firstName} — six quick questions and we're done. About four minutes.`
    : "Hey — six quick questions and we're done. About four minutes.";
  return [
    { id: nextMsgId(), author: "agent", content: opening },
    { id: nextMsgId(), author: "agent", content: firstQuestion.prompt },
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

  function handleSend() {
    if (!currentQuestion) return;
    const raw = inputValue.trim();
    if (raw.length === 0) return;

    const userMsg: Message = { id: nextMsgId(), author: "user", content: raw };
    const result = parseAnswer(currentQuestion.id, raw, draft);

    if (!result.ok) {
      // Same question stays active; append user bubble + clarification bubble.
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: nextMsgId(), author: "agent", content: result.ask },
      ]);
    } else {
      const newDraft: OnboardingDraft = { ...draft, ...result.fields };
      const newAnswered = new Set(answeredIds);
      newAnswered.add(currentQuestion.id);
      const next = nextQuestion(newDraft, newAnswered);
      setDraft(newDraft);
      setAnsweredIds(newAnswered);

      if (next) {
        setMessages((prev) => [
          ...prev,
          userMsg,
          { id: nextMsgId(), author: "agent", content: next.prompt },
        ]);
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
        setMessages((prev) => [...prev, userMsg, finalising]);
        if (validated.success) {
          setIsFinalising(true);
          onComplete?.(validated.data);
        }
      }
    }

    setInputValue("");
    setVoiceError(null);
    // Keep focus in the input for fast next-question entry on keyboard users.
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleChipSelect(chip: string) {
    setInputValue(chip);
    setVoiceError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleTranscript(text: string) {
    // If the user already had something in the input, append. Otherwise
    // replace. Either way, focus moves to the input so the user can edit
    // before sending.
    setInputValue((prev) => (prev.trim().length > 0 ? `${prev.trim()} ${text}` : text));
    setVoiceError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleVoiceError(message: string) {
    setVoiceError(message);
  }

  // The 16th question's accessible name is the prompt text. We pass that
  // straight into ChatInput as the `ariaLabel` to keep accessible name
  // and visible context aligned (WCAG 2.5.3, label-in-name).
  const inputAriaLabel = currentQuestion?.prompt ?? "Onboarding answer";
  const inputPlaceholder = currentQuestion?.optional
    ? "Type, skip, or use voice"
    : "Type or use voice";

  return (
    <div className="flex h-svh flex-col bg-background">
      <ChatThread messages={messages} isAgentTyping={isFinalising} />

      {currentQuestion ? (
        <div className="border-t-0">
          <AnswerChips
            chips={currentQuestion.chips}
            onSelect={handleChipSelect}
            defaultChip={currentQuestion.defaultChip}
          />

          {voiceError ? (
            <p
              role="alert"
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
