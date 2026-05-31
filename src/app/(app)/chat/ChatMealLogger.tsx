"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Database, FlameKindling, Mic, Pencil, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TodayMeal } from "@/lib/meals/today";

type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type MealSlot = "breakfast" | "lunch" | "dinner" | "snack" | "beverage" | "other";

export type MealCandidateBlock = {
  type: "meal_log_candidate";
  summary: string;
  needsConfirmation: true;
  confidence: "high" | "medium" | "low";
  mealSlot?: MealSlot;
  estimate: { kcalMin: number; kcalMax: number; protein: number; carbs: number; fat: number; fiber: number };
  rationale: string;
  clarificationQuestions: string[];
  safetyFlags: { blocked: boolean; allergenFlags: string[]; conditionFlags: string[]; blockingReasons: string[] };
  displayAssumptions?: Array<{ label: string; detail: string }>;
  confirmPayload?: { mealSlot?: MealSlot; items?: Array<{ name?: string; household_unit?: string; quantity_g?: number }> } | unknown;
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

type ChatMealLoggerProps = {
  dateLabel?: string;
  initialMeals?: TodayMeal[];
  initialMessages?: ChatMessage[];
  initialCandidate?: MealCandidateBlock | null;
  saveStatus?: string;
  userName?: string;
};

const QUICK_CHIPS = ["2 rotis, dal, bhindi", "Idli, sambar, chutney", "Coffee with milk", "Chicken and sabzi"];

const MEAL_SLOTS: Array<{ value: MealSlot; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "snack", label: "Snack" },
  { value: "dinner", label: "Dinner" },
];

function renderAssistantText(blocks: AssistantBlock[] | undefined, fallback: string | undefined) {
  const textBlock = blocks?.find((block): block is TextBlock => block.type === "text");
  return textBlock?.text || fallback || "I received that. Tell me what you ate and I’ll estimate it.";
}

function midpoint(low: number | null | undefined, high: number | null | undefined) {
  if (typeof low === "number" && typeof high === "number") return (low + high) / 2;
  if (typeof low === "number") return low;
  if (typeof high === "number") return high;
  return 0;
}

function formatNumber(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

function formatRange(min: number, max: number, unit = "") {
  const suffix = unit ? ` ${unit}` : "";
  return `${formatNumber(min)}–${formatNumber(max)}${suffix}`;
}

function formatGrams(value: number) {
  return `${formatNumber(value)}g`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getCandidateMealSlot(candidate: MealCandidateBlock | null): MealSlot {
  if (!candidate) return "breakfast";
  const payload = candidate.confirmPayload as { mealSlot?: MealSlot } | undefined;
  return candidate.mealSlot ?? payload?.mealSlot ?? "breakfast";
}

function getCandidateItems(candidate: MealCandidateBlock) {
  const payload = candidate.confirmPayload as { items?: Array<{ name?: string; household_unit?: string; quantity_g?: number }> } | undefined;
  if (payload?.items?.length) return payload.items;
  return [{ name: candidate.summary, household_unit: "estimated portion" }];
}

function conciseMealSummary(summary: string) {
  const cleaned = summary
    .replace(/^for\s+(breakfast|lunch|dinner|snack)\s+i\s+(had|ate|drank)[:\s-]*/i, "")
    .replace(/^i\s+(had|ate|drank)\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/[.。]+$/, "")
    .trim();
  if (!cleaned) return "this meal";
  return cleaned.length <= 72 ? cleaned : `${cleaned.slice(0, 69).trim()}…`;
}

function itemServingLabel(item: { household_unit?: string; quantity_g?: number }) {
  if (item.household_unit && item.household_unit !== "estimated serving") return item.household_unit;
  if (typeof item.quantity_g === "number") return `~${formatNumber(item.quantity_g)} g`;
  return "estimated portion";
}

const REGULAR_THINKING_COPY = [
  "Stirring up a thoughtful reply…",
  "Letting the tadka bloom…",
  "Plating a careful answer…",
];

function isLikelyMealMessage(text: string | null) {
  if (!text) return false;
  if (/\b(remember|recall|what did i have|what have i eaten)\b/i.test(text)) return false;
  return /\b(ate|had|drank|breakfast|lunch|dinner|snack|meal|plate|bowl|roti|rice|dal|paneer|chicken|fish|curd|beer|coffee|tea|kcal|protein|carbs|fat|portion|serving|grams?|g|ml)\b/i.test(text);
}

function thinkingCopy(text: string | null) {
  if (isLikelyMealMessage(text)) return "Checking portions and prep style…";
  const index = Math.abs(text?.length ?? 0) % REGULAR_THINKING_COPY.length;
  return REGULAR_THINKING_COPY[index];
}

function pendingCandidateContext(candidate: MealCandidateBlock | null, selectedSlot: MealSlot) {
  if (!candidate) return undefined;
  return {
    summary: candidate.summary,
    mealSlot: selectedSlot,
    items: getCandidateItems(candidate).map((item) => ({
      name: item.name,
      householdUnit: item.household_unit,
      quantityG: item.quantity_g,
    })),
  };
}

function dailyTotals(meals: TodayMeal[]) {
  return meals.reduce(
    (acc, meal) => {
      acc.kcalLow += meal.kcal_low;
      acc.kcalHigh += meal.kcal_high;
      acc.kcalLead += meal.kcal_lead ?? midpoint(meal.kcal_low, meal.kcal_high);
      acc.protein += midpoint(meal.protein_g_low, meal.protein_g_high);
      acc.carbs += midpoint(meal.carbs_g_low, meal.carbs_g_high);
      acc.fat += midpoint(meal.fat_g_low, meal.fat_g_high);
      acc.fiber += midpoint(meal.fiber_g_low, meal.fiber_g_high);
      return acc;
    },
    { kcalLow: 0, kcalHigh: 0, kcalLead: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

export function ChatMealLogger({ dateLabel = "Today", initialMeals = [], initialMessages = [], initialCandidate = null, saveStatus, userName = "there" }: ChatMealLoggerProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.length > 0
      ? initialMessages
      : [
          {
            id: "assistant-welcome",
            role: "assistant",
            content: "Tell me what you ate. I’ll estimate it, show assumptions, and only save after you confirm.",
          },
        ],
  );
  const [candidate, setCandidate] = useState<MealCandidateBlock | null>(initialCandidate);
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>(getCandidateMealSlot(initialCandidate));
  const [isSending, setIsSending] = useState(false);
  const [pendingMessageText, setPendingMessageText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const totals = useMemo(() => dailyTotals(initialMeals), [initialMeals]);
  const canSend = input.trim().length > 0 && !isSending;
  const latestMeal = initialMeals[0];
  const mealCountLabel = initialMeals.length === 1 ? "1 meal logged today." : `${initialMeals.length} meals logged today.`;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      transcriptEndRef.current?.scrollIntoView?.({ block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages.length, isSending, candidate?.assistantMessageId]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const candidateBeforeSend = candidate;

    setIsSending(true);
    setPendingMessageText(text);
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
        body: JSON.stringify({ text, pendingCandidate: pendingCandidateContext(candidateBeforeSend, selectedSlot) }),
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
      setSelectedSlot(getCandidateMealSlot(persistedCandidate));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not send message. Please try again.");
    } finally {
      setPendingMessageText(null);
      setIsSending(false);
    }
  }

  async function toggleRecording() {
    setMediaNotice(null);
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMediaNotice("Voice capture is not supported in this browser. You can still type your meal.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setMediaNotice("Voice captured. ElevenLabs transcription will be wired in the next voice slice; type the transcript here for now.");
      };
      recorder.start();
      setIsRecording(true);
      setMediaNotice("Recording voice note… tap the mic again to stop.");
    } catch {
      setMediaNotice("Microphone permission was not granted. You can still type your meal.");
    }
  }

  return (
    <div className="min-h-[calc(100svh-3.5rem)] bg-[var(--surface-canvas)] text-[var(--foreground)] md:min-h-svh">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-44 pt-5 sm:px-6 md:max-w-5xl md:pb-12 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
        <section className="space-y-6" aria-label="Home meal logging">
          <DailySummaryHero
            dateLabel={dateLabel}
            greetingName={userName}
            mealCountLabel={mealCountLabel}
            totals={totals}
          />

          {saveStatus === "saved" ? (
            <p role="status" className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-brand-soft)] px-4 py-3 text-sm font-medium text-[var(--brand)]">
              Meal saved. Your Home totals are updated.
            </p>
          ) : null}

          <TodayMealsPreview meals={initialMeals} latestMeal={latestMeal} />

          <StickyDailySummary totals={totals} />

          <section aria-label="Chat transcript" className="space-y-4">
            <h1 className="sr-only">Home</h1>
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {isSending ? <ThinkingBubble text={thinkingCopy(pendingMessageText)} /> : null}
            <div ref={transcriptEndRef} aria-hidden="true" />
          </section>

          {candidate ? (
            <MealEstimateCard
              candidate={candidate}
              selectedSlot={selectedSlot}
              onSelectedSlotChange={setSelectedSlot}
              onDismiss={() => setCandidate(null)}
            />
          ) : null}

          {error ? <p role="alert" className="rounded-2xl bg-[var(--error-surface)] p-4 text-sm font-medium text-[var(--error-foreground)]">{error}</p> : null}
        </section>

        <aside className="hidden space-y-4 lg:block" aria-label="Home details">
          <div className="rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-card)]">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--foreground-on-dark-muted)]">Today</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{formatRange(totals.kcalLow, totals.kcalHigh, "kcal")}</p>
            <p className="mt-2 text-sm text-muted-foreground">Daily range from confirmed meals. Keep logging naturally to refine the picture.</p>
          </div>
          <div className="rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold">Quick prompts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setInput(chip)}
                  className="min-h-11 rounded-full bg-[var(--surface-canvas)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--surface-brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <form
        onSubmit={submitMessage}
        className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-20 border-t border-[var(--border-soft)] bg-[var(--surface-canvas)]/95 px-4 py-4 backdrop-blur md:bottom-0 md:left-60 md:border-t md:px-6 lg:left-60"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-raised)] px-4 py-3 shadow-[var(--shadow-card)]">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Camera input"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setMediaNotice(file ? "Photo selected. Image analysis will be wired in the next media slice; describe the meal to estimate it now." : null);
            }}
          />
          <button
            type="button"
            aria-label="Add meal photo"
            onClick={() => photoInputRef.current?.click()}
            className="grid size-11 shrink-0 place-items-center rounded-full text-[var(--foreground)] transition hover:bg-[var(--surface-brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Camera aria-hidden="true" className="size-5" />
          </button>

          <div className="min-w-0 flex-1">
            <label htmlFor="meal-message" className="sr-only">Meal message</label>
            <textarea
              id="meal-message"
              aria-label="Meal message"
              placeholder="Describe what you ate — e.g. 2 rotis, dal, bhindi"
              value={input}
              disabled={isSending}
              rows={2}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }}
              className="max-h-32 min-h-[3.5rem] w-full resize-none border-0 bg-transparent text-lg leading-snug text-[var(--foreground)] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <button
            type="button"
            aria-label={isRecording ? "Stop voice recording" : "Record voice note"}
            aria-pressed={isRecording}
            onClick={toggleRecording}
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isRecording ? "bg-[var(--surface-brand-soft)] text-[var(--brand)]" : "text-[var(--foreground)] hover:bg-[var(--surface-brand-soft)]",
            )}
          >
            <Mic aria-hidden="true" className="size-5" />
          </button>
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send meal message"
            className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--brand-muted)] text-[var(--brand-foreground)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send aria-hidden="true" className="size-6" />
          </button>
        </div>
        {mediaNotice ? <p role="status" className="mx-auto mt-2 max-w-3xl px-2 text-sm text-muted-foreground">{mediaNotice}</p> : null}
      </form>
    </div>
  );
}

function DailySummaryHero({
  dateLabel,
  greetingName,
  mealCountLabel,
  totals,
}: {
  dateLabel: string;
  greetingName: string;
  mealCountLabel: string;
  totals: ReturnType<typeof dailyTotals>;
}) {
  return (
    <section
      aria-label="Daily nutrition summary"
      className="overflow-hidden rounded-[2.5rem] bg-[radial-gradient(circle_at_80%_100%,var(--brand-muted),var(--brand)_55%,var(--brand))] p-6 text-[var(--brand-foreground)] shadow-[var(--shadow-lifted)] sm:p-8"
    >
      <p className="font-sans text-sm font-semibold uppercase tracking-[0.28em] text-[var(--foreground-on-dark-muted)]">
        {greeting()}, {greetingName}
      </p>
      <p className="mt-6 font-display text-4xl leading-tight tracking-tight sm:text-5xl">{mealCountLabel}</p>
      <p className="mt-2 text-sm text-[var(--foreground-on-dark-muted)]">{dateLabel}</p>
      <dl className="mt-7 grid grid-cols-4 gap-4 text-left">
        <MacroStat label="Kcal" value={formatRange(totals.kcalLow, totals.kcalHigh)} />
        <MacroStat label="Carbs" value={formatGrams(totals.carbs)} />
        <MacroStat label="Protein" value={formatGrams(totals.protein)} />
        <MacroStat label="Fibre" value={formatGrams(totals.fiber)} />
      </dl>
    </section>
  );
}

function MacroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-on-dark-muted)] sm:text-sm">{label}</dt>
      <dd className="mt-1 font-display text-2xl leading-none tracking-tight sm:text-3xl">{value}</dd>
    </div>
  );
}

function StickyDailySummary({ totals }: { totals: ReturnType<typeof dailyTotals> }) {
  return (
    <section
      aria-label="Sticky daily nutrition summary"
      className="sticky top-3 z-10 rounded-[1.75rem] border border-[var(--border-soft)] bg-[var(--surface-canvas)]/95 p-3 shadow-[var(--shadow-card)] backdrop-blur supports-[backdrop-filter]:bg-[var(--surface-canvas)]/85 lg:hidden"
    >
      <dl className="grid grid-cols-5 gap-2 text-center">
        <CompactMacroStat label="Kcal" value={formatRange(totals.kcalLow, totals.kcalHigh)} />
        <CompactMacroStat label="Carbs" value={formatGrams(totals.carbs)} />
        <CompactMacroStat label="Protein" value={formatGrams(totals.protein)} />
        <CompactMacroStat label="Fat" value={formatGrams(totals.fat)} />
        <CompactMacroStat label="Fibre" value={formatGrams(totals.fiber)} />
      </dl>
    </section>
  );
}

function CompactMacroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[1rem] bg-[var(--surface-brand-soft)] px-2 py-2">
      <dt className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold leading-none text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function ThinkingBubble({ text }: { text: string }) {
  return (
    <div role="status" className="mr-auto max-w-[86%] rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-raised)] px-5 py-4 text-base text-[var(--foreground)] shadow-[var(--shadow-card)]">
      <span className="sr-only">Nourish is replying.</span>
      {text}
    </div>
  );
}

function TodayMealsPreview({ meals, latestMeal }: { meals: TodayMeal[]; latestMeal?: TodayMeal }) {
  return (
    <section aria-label="Today's meals" className="space-y-4">
      <details className="rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-canvas)] p-4 shadow-[var(--shadow-soft)]" open>
        <summary className="cursor-pointer list-none text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span aria-hidden="true" className="mr-2">▸</span>Today&apos;s meals ({meals.length})
        </summary>
        {latestMeal ? (
          <p className="mt-4 rounded-[1.5rem] bg-[var(--brand)] px-5 py-4 text-lg leading-relaxed text-[var(--brand-foreground)] shadow-[var(--shadow-card)]">
            {latestMeal.source_text ?? "Saved meal"}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No meals logged yet. Describe what you ate and confirm the estimate to start your day.</p>
        )}
      </details>
    </section>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[86%] rounded-[1.75rem] bg-[var(--brand)] px-5 py-4 text-lg leading-relaxed text-[var(--brand-foreground)] shadow-[var(--shadow-card)]">
        {message.content}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <span className="mt-2 grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] shadow-[var(--shadow-soft)]" aria-hidden="true">
        <Sparkles className="size-5" />
      </span>
      <div className="max-w-[86%] rounded-[1.75rem] border border-[var(--border-soft)] bg-[var(--surface-raised)] px-5 py-4 text-lg leading-relaxed text-[var(--foreground)] shadow-[var(--shadow-card)]">
        {message.content}
      </div>
    </div>
  );
}

function MealEstimateCard({
  candidate,
  selectedSlot,
  onSelectedSlotChange,
  onDismiss,
}: {
  candidate: MealCandidateBlock;
  selectedSlot: MealSlot;
  onSelectedSlotChange: (slot: MealSlot) => void;
  onDismiss: () => void;
}) {
  const items = getCandidateItems(candidate);
  const canSave = !candidate.safetyFlags.blocked;

  return (
    <section
      aria-label="Meal estimate"
      className="mx-auto max-w-2xl rounded-[2.5rem] border border-[var(--border-soft)] bg-[var(--surface-canvas)] p-5 shadow-[var(--shadow-lifted)] sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <FlameKindling aria-hidden="true" className="size-7 text-[var(--brand)]" />
            <h2 className="font-display text-4xl leading-none tracking-tight">{formatRange(candidate.estimate.kcalMin, candidate.estimate.kcalMax, "kcal")}</h2>
          </div>
          <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">Looks like {conciseMealSummary(candidate.summary)}.</p>
        </div>
        <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--surface-brand-soft)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
          <Database aria-hidden="true" className="size-4" />
          Based on your logs
        </span>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-4">
        <EstimateMacro label="Carbs" value={formatGrams(candidate.estimate.carbs)} />
        <EstimateMacro label="Protein" value={formatGrams(candidate.estimate.protein)} />
        <EstimateMacro label="Fat" value={formatGrams(candidate.estimate.fat)} />
        <EstimateMacro label="Fibre" value={formatGrams(candidate.estimate.fiber)} />
      </div>

      <div className="mt-7 space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Items</p>
        {items.map((item, index) => (
          <div key={`${item.name ?? "item"}-${index}`} className="flex items-start justify-between gap-4 text-lg">
            <span>{item.name ?? candidate.summary}</span>
            <span className="max-w-[52%] text-right text-base leading-snug text-muted-foreground">{itemServingLabel(item)}</span>
          </div>
        ))}
      </div>

      <details className="mt-7 rounded-[1.75rem] bg-[var(--surface-raised)] px-5 py-4 text-base text-[var(--foreground)] shadow-[var(--shadow-soft)]">
        <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Assumptions ({candidate.displayAssumptions?.length ?? (candidate.rationale ? 1 : 0)})</summary>
        {candidate.displayAssumptions?.length ? (
          <dl className="mt-4 space-y-3 text-sm leading-relaxed">
            {candidate.displayAssumptions.map((assumption) => (
              <div key={`${assumption.label}-${assumption.detail}`}>
                <dt className="font-semibold text-[var(--foreground)]">{assumption.label}</dt>
                <dd className="mt-1 text-muted-foreground">{assumption.detail}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{candidate.rationale || "Estimated from typical home-style portions."}</p>
        )}
      </details>

      {candidate.clarificationQuestions.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-[var(--surface-brand-soft)] p-4 text-sm text-[var(--foreground)]">
          <p className="font-semibold">One quick clarification may improve this:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {candidate.clarificationQuestions.map((question) => <li key={question}>{question}</li>)}
          </ul>
        </div>
      ) : null}

      {candidate.safetyFlags.blocked ? (
        <p role="alert" className="mt-5 rounded-2xl bg-[var(--error-surface)] p-4 text-sm font-medium text-[var(--error-foreground)]">
          Review safety warnings before saving: {candidate.safetyFlags.blockingReasons.join("; ")}
        </p>
      ) : null}

      <div className="mt-7 flex flex-wrap gap-3" role="group" aria-label="Meal slot">
        {MEAL_SLOTS.map((slot) => (
          <button
            key={slot.value}
            type="button"
            aria-pressed={selectedSlot === slot.value}
            onClick={() => onSelectedSlotChange(slot.value)}
            className={cn(
              "min-h-11 rounded-full px-5 py-2 text-base font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedSlot === slot.value
                ? "bg-[var(--brand)] text-[var(--brand-foreground)]"
                : "bg-[var(--surface-raised)] text-[var(--foreground)] hover:bg-[var(--surface-brand-soft)]",
            )}
          >
            {slot.label}
          </button>
        ))}
      </div>

      <div className="mt-7 space-y-3">
        {canSave ? (
          <form action="/chat/confirm" method="post">
            <input type="hidden" name="candidateId" value={candidate.assistantMessageId} />
            <input type="hidden" name="mealSlot" value={selectedSlot} />
            <Button type="submit" className="h-14 w-full rounded-full text-lg">
              <Check aria-hidden="true" className="size-5" />
              Looks right
            </Button>
          </form>
        ) : null}
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" className="h-12 rounded-full px-5" onClick={() => document.getElementById("meal-message")?.focus()}>
            <Pencil aria-hidden="true" />
            Adjust meal
          </Button>
          <button
            type="button"
            aria-label="Dismiss meal estimate"
            onClick={onDismiss}
            className="grid size-12 place-items-center rounded-full text-[var(--foreground)] transition hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-6" />
          </button>
        </div>
      </div>
    </section>
  );
}

function EstimateMacro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-[var(--surface-brand-soft)] p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold leading-none">{value}</p>
    </div>
  );
}
