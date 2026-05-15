"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type MealCandidateBlock = {
  type: "meal_log_candidate";
  summary: string;
  needsConfirmation: true;
  confidence: "high" | "medium" | "low";
  estimate: { kcalMin: number; kcalMax: number; protein: number; carbs: number; fat: number; fiber: number };
  rationale: string;
  clarificationQuestions: string[];
  safetyFlags: { blocked: boolean; allergenFlags: string[]; conditionFlags: string[]; blockingReasons: string[] };
  confirmPayload?: unknown;
  assistantMessageId?: string;
};

type TextBlock = { type: "text"; text: string };
type AssistantBlock = MealCandidateBlock | TextBlock;

type ChatApiResponse =
  | {
      ok: true;
      requestId: string;
      data: {
        assistantMessage?: { id?: string; content?: string; role?: string };
        blocks?: AssistantBlock[];
      };
    }
  | { ok: false; requestId?: string; error?: { code?: string; message?: string } };

const QUICK_CHIPS = [
  "I had idli and sambar",
  "I had roti and dal",
  "I had rice and curd",
  "Need estimate",
];

function renderAssistantText(blocks: AssistantBlock[] | undefined, fallback: string | undefined) {
  const textBlock = blocks?.find((block): block is TextBlock => block.type === "text");
  return textBlock?.text || fallback || "I received that. Tell me what you ate and I’ll estimate it.";
}

export function ChatMealLogger() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      content: "Tell me what you ate — for example, ‘I had 2 idlis, sambar, and coconut chutney for breakfast.’",
    },
  ]);
  const [candidate, setCandidate] = useState<MealCandidateBlock | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = input.trim().length > 0 && !isSending;
  const candidateDescription = useMemo(() => {
    if (!candidate) return null;
    return `${candidate.estimate.kcalMin}–${candidate.estimate.kcalMax} kcal · confidence ${candidate.confidence}`;
  }, [candidate]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setError(null);
    setCandidate(null);
    setInput("");
    const localUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((current) => [...current, localUserMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload = (await response.json()) as ChatApiResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok === false ? payload.error?.message : "Could not send message.");
      }

      const blocks = payload.data.blocks ?? [];
      const assistantMessageId = payload.data.assistantMessage?.id;
      const mealCandidate = blocks.find((block): block is MealCandidateBlock => block.type === "meal_log_candidate") ?? null;
      const persistedCandidate = mealCandidate?.confirmPayload && assistantMessageId ? { ...mealCandidate, assistantMessageId } : null;
      const assistantText = renderAssistantText(blocks, payload.data.assistantMessage?.content);

      setMessages((current) => [
        ...current,
        {
          id: payload.data.assistantMessage?.id ?? `assistant-${Date.now()}`,
          role: "assistant",
          content: assistantText,
        },
      ]);
      setCandidate(persistedCandidate);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="text-sm text-muted-foreground">Log a meal in plain text, review the estimate, then confirm-save it to Today.</p>
      </header>

      <section aria-label="Chat transcript" className="flex min-h-[18rem] flex-col gap-3 rounded-3xl border bg-card p-4 shadow-sm">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6",
              message.role === "user"
                ? "ml-auto bg-[color:var(--brand)] text-[color:var(--brand-foreground)]"
                : "mr-auto bg-muted text-foreground",
            )}
          >
            {message.content}
          </div>
        ))}
        {isSending ? (
          <div role="status" className="mr-auto rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            Estimating your meal…
          </div>
        ) : null}
      </section>

      {candidate ? (
        <Card className="surface-card-hero rounded-3xl">
          <CardHeader>
            <CardTitle as="h2">Estimated meal: {candidate.summary}</CardTitle>
            {candidateDescription ? <CardDescription>{candidateDescription}</CardDescription> : null}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{candidate.rationale}</p>
            {candidate.clarificationQuestions.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {candidate.clarificationQuestions.map((question) => <li key={question}>{question}</li>)}
              </ul>
            ) : null}
            {candidate.safetyFlags.blocked ? (
              <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-destructive">
                Review safety warnings before saving: {candidate.safetyFlags.blockingReasons.join("; ")}
              </p>
            ) : null}
            {!candidate.safetyFlags.blocked ? (
              <form action="/chat/confirm" method="post" className="space-y-2">
                <input type="hidden" name="candidateId" value={candidate.assistantMessageId} />
                <Button type="submit">
                  Looks right — save meal
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {error ? <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2" aria-label="Quick meal prompts">
        {QUICK_CHIPS.map((chip) => (
          <Button key={chip} type="button" variant="outline" size="sm" onClick={() => setInput(chip)}>
            {chip}
          </Button>
        ))}
      </div>

      <form onSubmit={submitMessage} className="space-y-3">
        <label htmlFor="meal-message" className="text-sm font-medium">Meal message</label>
        <Textarea
          id="meal-message"
          aria-label="Meal message"
          placeholder="Type what you ate..."
          value={input}
          disabled={isSending}
          onChange={(event) => setInput(event.target.value)}
        />
        <Button type="submit" disabled={!canSend}>
          {isSending ? "Sending…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
