"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, FlameKindling, Mic, Pencil, Send, Sparkles, X } from "lucide-react";
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

type DailyTotals = ReturnType<typeof dailyTotals>;

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
  confirmPayload?: { mealSlot?: MealSlot; targetLocalDate?: string; items?: Array<{ name?: string; household_unit?: string; quantity_g?: number }> } | unknown;
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
  selectedDate?: string;
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

function formatKcalLead(value: number) {
  return `${formatNumber(Math.round(value))} kcal`;
}

function estimateLead(estimate: MealCandidateBlock["estimate"]) {
  return Math.round(midpoint(estimate.kcalMin, estimate.kcalMax));
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


function getCandidateTargetLocalDate(candidate: MealCandidateBlock | null, fallbackDate: string) {
  const payload = candidate?.confirmPayload as { targetLocalDate?: string } | undefined;
  return payload?.targetLocalDate ?? fallbackDate;
}

function formatDateInputLabel(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00+05:30`));
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

function isDailyTotalsQuestion(text: string | null) {
  if (!text) return false;
  const hasTotalsIntent = /\b(total|totals|summary|dva|dri|daily value|recommended intake|macro|macros|micro|micros|nutrients?|nutrition)\b/i.test(text);
  const hasDayIntent = /\b(today|day|daily|so far|dva|dri|recommended|intake|versus|vs\.?)\b/i.test(text);
  return hasTotalsIntent && hasDayIntent;
}

function isPendingEstimateUpdate(text: string | null) {
  if (!text || isDailyTotalsQuestion(text)) return false;
  return /\b(actually|instead|make that|change|correct|correction|adjust|remove|add|swap|replace|half|double|extra|less|more|slightly|oily|oil|ghee|butter|sauce|fried|portion|serving|grams?|g|ml|sweetened|unsweetened|log this|save this|confirm|confirmed|looks right|yes|yep|yeah|ok|okay)\b/i.test(text);
}

function isLikelyMealMessage(text: string | null) {
  if (!text) return false;
  if (/\b(remember|recall|what did i have|what have i eaten)\b/i.test(text)) return false;
  if (isDailyTotalsQuestion(text)) return false;
  return /\b(ate|had|drank|breakfast|lunch|dinner|snack|meal|plate|bowl|roti|rice|dal|paneer|chicken|fish|curd|beer|coffee|tea|kcal|protein|carbs|fat|portion|serving|grams?|g|ml)\b/i.test(text);
}

function thinkingCopy(text: string | null) {
  if (isLikelyMealMessage(text)) return "Checking portions and prep style…";
  const index = Math.abs(text?.length ?? 0) % REGULAR_THINKING_COPY.length;
  return REGULAR_THINKING_COPY[index];
}

function pendingCandidateContext(candidate: MealCandidateBlock | null, selectedSlot: MealSlot, text: string) {
  if (!candidate || !isPendingEstimateUpdate(text)) return undefined;
  return {
    summary: candidate.summary,
    mealSlot: selectedSlot,
    estimate: candidate.estimate,
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

export function ChatMealLogger({ dateLabel = "Today", initialMeals = [], initialMessages = [], initialCandidate = null, saveStatus, userName = "there", selectedDate = new Date().toISOString().slice(0, 10) }: ChatMealLoggerProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.length > 0
      ? initialMessages
      : [
          {
            id: "assistant-welcome",
            role: "assistant",
            content: "Tell me what you ate. I’ll make a best-guess estimate first, then you can confirm or correct it.",
          },
        ],
  );
  const [candidate, setCandidate] = useState<MealCandidateBlock | null>(initialCandidate);
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>(getCandidateMealSlot(initialCandidate));
  const [targetLocalDate, setTargetLocalDate] = useState(getCandidateTargetLocalDate(initialCandidate, selectedDate));
  const [isSending, setIsSending] = useState(false);
  const [pendingMessageText, setPendingMessageText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isDailySheetOpen, setIsDailySheetOpen] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const totals = useMemo(() => dailyTotals(initialMeals), [initialMeals]);
  const canSend = input.trim().length > 0 && !isSending;
  const latestMeal = initialMeals[0];
  const mealCountLabel = initialMeals.length === 1 ? "1 meal logged today." : `${initialMeals.length} meals logged today.`;
  const hasActiveEstimate = Boolean(candidate);

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
      const pendingCandidate = pendingCandidateContext(candidateBeforeSend, selectedSlot, text);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(pendingCandidate ? { text, pendingCandidate } : { text }),
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
      setTargetLocalDate(getCandidateTargetLocalDate(persistedCandidate, selectedDate));
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-44 pt-5 sm:px-6 md:max-w-6xl md:pb-12 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8 xl:max-w-7xl">
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

          <StickyDailySummary totals={totals} onOpen={() => setIsDailySheetOpen(true)} />

          <section aria-label="Chat transcript" className="rounded-[2.5rem] border border-[var(--border-soft)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)] sm:p-6 lg:min-h-[52svh]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Nourish chat</p>
                <p className="mt-1 text-sm text-muted-foreground">Log naturally. Confirm the card when the estimate looks right.</p>
              </div>
              {hasActiveEstimate ? <span className="rounded-full bg-[var(--surface-brand-soft)] px-3 py-1 text-sm font-semibold text-[var(--brand)]">Estimate ready</span> : null}
            </div>
            <div className="space-y-4">
            <h1 className="sr-only">Home</h1>
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {isSending ? <ThinkingBubble text={thinkingCopy(pendingMessageText)} /> : null}
              <div ref={transcriptEndRef} aria-hidden="true" />
            </div>
          </section>

          {candidate ? (
            <MealEstimateCard
              candidate={candidate}
              selectedSlot={selectedSlot}
              onSelectedSlotChange={setSelectedSlot}
              targetLocalDate={targetLocalDate}
              onTargetLocalDateChange={setTargetLocalDate}
              currentDate={selectedDate}
              onDismiss={() => setCandidate(null)}
            />
          ) : null}

          {error ? <p role="alert" className="rounded-2xl bg-[var(--error-surface)] p-4 text-sm font-medium text-[var(--error-foreground)]">{error}</p> : null}
        </section>

        <DailyNutritionSheet open={isDailySheetOpen} onClose={() => setIsDailySheetOpen(false)} totals={totals} meals={initialMeals} dateLabel={dateLabel} />

        <aside className="hidden space-y-4 lg:block" aria-label="Home details">
          <div className="rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-card)]">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--foreground-on-dark-muted)]">Today</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{formatRange(totals.kcalLow, totals.kcalHigh, "kcal")}</p>
            <p className="mt-2 text-sm text-muted-foreground">Confirmed meals only. Corrections should update the visible estimate before you save.</p>
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

function StickyDailySummary({ totals, onOpen }: { totals: DailyTotals; onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label="Open daily nutrition details"
      onClick={onOpen}
      className="sticky top-3 z-10 w-full rounded-[1.85rem] border border-[var(--border-soft)] bg-[var(--surface-canvas)]/95 p-3 text-left shadow-[var(--shadow-card)] backdrop-blur transition hover:bg-[var(--surface-brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring supports-[backdrop-filter]:bg-[var(--surface-canvas)]/90 lg:hidden"
    >
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Today so far · tap for details</span>
      <dl className="grid grid-cols-5 gap-2 text-center">
        <CompactMacroStat label="Kcal" value={formatKcalLead(totals.kcalLead)} emphasis />
        <CompactMacroStat label="Carbs" value={formatGrams(totals.carbs)} />
        <CompactMacroStat label="Protein" value={formatGrams(totals.protein)} />
        <CompactMacroStat label="Fat" value={formatGrams(totals.fat)} />
        <CompactMacroStat label="Fibre" value={formatGrams(totals.fiber)} />
      </dl>
    </button>
  );
}

function CompactMacroStat({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0 rounded-[1.15rem] bg-[var(--surface-brand-soft)] px-2 py-2.5">
      <dt className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 truncate font-semibold leading-none text-[var(--foreground)]", emphasis ? "text-[0.95rem]" : "text-base")}>{value}</dd>
    </div>
  );
}

const DAILY_VALUE_TARGETS = {
  kcal: 2000,
  carbs: 275,
  protein: 50,
  fat: 78,
  fiber: 28,
};

function percentOfDailyValue(value: number, target: number) {
  if (!target) return "—";
  return `${formatNumber(Math.round((value / target) * 100))}%`;
}

function dailyValueRows(totals: DailyTotals) {
  return [
    { label: "Calories", current: formatKcalLead(totals.kcalLead), target: "2,000 kcal", percent: percentOfDailyValue(totals.kcalLead, DAILY_VALUE_TARGETS.kcal) },
    { label: "Carbs", current: formatGrams(totals.carbs), target: "275g", percent: percentOfDailyValue(totals.carbs, DAILY_VALUE_TARGETS.carbs) },
    { label: "Protein", current: formatGrams(totals.protein), target: "50g", percent: percentOfDailyValue(totals.protein, DAILY_VALUE_TARGETS.protein) },
    { label: "Fat", current: formatGrams(totals.fat), target: "78g", percent: percentOfDailyValue(totals.fat, DAILY_VALUE_TARGETS.fat) },
    { label: "Fibre", current: formatGrams(totals.fiber), target: "28g", percent: percentOfDailyValue(totals.fiber, DAILY_VALUE_TARGETS.fiber) },
  ];
}

function DailyNutritionSheet({ open, onClose, totals, meals, dateLabel }: { open: boolean; onClose: () => void; totals: DailyTotals; meals: TodayMeal[]; dateLabel: string }) {
  if (!open) return null;

  const rows = dailyValueRows(totals);

  return (
    <div className="fixed inset-0 z-40" role="presentation">
      <button type="button" aria-label="Close daily nutrition details" className="absolute inset-0 bg-black/20" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Daily nutrition details"
        className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 max-h-[82svh] overflow-y-auto rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-canvas)] p-5 shadow-[var(--shadow-lifted)] md:inset-auto md:left-1/2 md:top-1/2 md:w-[min(42rem,calc(100vw-3rem))] md:-translate-x-1/2 md:-translate-y-1/2"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{dateLabel}</p>
            <h2 className="mt-1 font-display text-3xl leading-tight tracking-tight">Daily nutrition details</h2>
            <p className="mt-2 text-sm text-muted-foreground">Confirmed meals only. Micronutrients stay blank until Nourish captures reliable source data.</p>
          </div>
          <button type="button" aria-label="Close details" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--surface-raised)] text-[var(--foreground)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--surface-brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <section className="mt-6" aria-labelledby="daily-dishes-heading">
          <h3 id="daily-dishes-heading" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Dishes eaten</h3>
          {meals.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {meals.map((meal) => (
                <li key={meal.id} className="rounded-[1.25rem] bg-[var(--surface-raised)] px-4 py-3 text-sm leading-relaxed shadow-[var(--shadow-soft)]">
                  {meal.source_text ?? `${meal.meal_slot ?? "Meal"} · ${formatRange(meal.kcal_low, meal.kcal_high, "kcal")}`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-[1.25rem] bg-[var(--surface-raised)] px-4 py-3 text-sm text-muted-foreground">No confirmed meals yet today.</p>
          )}
        </section>

        <section className="mt-6" aria-labelledby="daily-value-heading">
          <h3 id="daily-value-heading" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Macros vs daily value</h3>
          <div className="mt-3 overflow-hidden rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-raised)] shadow-[var(--shadow-soft)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-brand-soft)] text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Nutrient</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Today</th>
                  <th scope="col" className="px-4 py-3 font-semibold">DV</th>
                  <th scope="col" className="px-4 py-3 font-semibold">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-[var(--border-soft)]">
                    <th scope="row" className="px-4 py-3 font-medium">{row.label}</th>
                    <td className="px-4 py-3">{row.current}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.target}</td>
                    <td className="px-4 py-3 font-semibold">{row.percent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] bg-[var(--surface-brand-soft)] p-4 text-sm leading-relaxed" aria-labelledby="micros-heading">
          <h3 id="micros-heading" className="font-semibold">Micronutrients</h3>
          <p className="mt-2 text-muted-foreground">Not enough reliable micronutrient data is stored yet for sodium, calcium, iron, vitamins, or potassium. Nourish will show these here once each confirmed estimate includes source-backed micronutrients.</p>
        </section>
      </section>
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
  targetLocalDate,
  onTargetLocalDateChange,
  currentDate,
  onDismiss,
}: {
  candidate: MealCandidateBlock;
  selectedSlot: MealSlot;
  onSelectedSlotChange: (slot: MealSlot) => void;
  targetLocalDate: string;
  onTargetLocalDateChange: (date: string) => void;
  currentDate: string;
  onDismiss: () => void;
}) {
  const items = getCandidateItems(candidate);
  const canSave = !candidate.safetyFlags.blocked;
  const leadKcal = estimateLead(candidate.estimate);
  const isDifferentTargetDate = targetLocalDate !== currentDate;

  return (
    <section
      aria-label="Meal estimate"
      className="mx-auto max-w-2xl rounded-[2.5rem] border border-[var(--border-soft)] bg-[var(--surface-canvas)] p-5 shadow-[var(--shadow-lifted)] sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <FlameKindling aria-hidden="true" className="size-7 text-[var(--brand)]" />
            <h2 className="font-display text-4xl leading-none tracking-tight">{formatNumber(leadKcal)} kcal</h2>
          </div>
          <p className="mt-2 text-sm font-medium text-muted-foreground">Likely range {formatRange(candidate.estimate.kcalMin, candidate.estimate.kcalMax, "kcal")}</p>
          <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">Looks like {conciseMealSummary(candidate.summary)}. Confirm now, or type a correction like “less rice” or “extra ghee”.</p>
        </div>
        <span className="inline-flex min-h-11 items-center rounded-full bg-[var(--surface-brand-soft)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
          Best guess
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
          <p className="font-semibold">Optional clarification — you can still confirm now:</p>
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

      <div className="mt-7 grid gap-3 rounded-[1.75rem] border border-[var(--border-soft)] bg-[var(--surface-raised)] p-4">
        <label htmlFor="meal-target-date" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Log date
        </label>
        <input
          id="meal-target-date"
          type="date"
          value={targetLocalDate}
          onChange={(event) => onTargetLocalDateChange(event.target.value)}
          className="min-h-12 rounded-full border border-[var(--border-soft)] bg-[var(--surface-canvas)] px-4 text-base text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-sm leading-relaxed text-muted-foreground">
          This confirmation will update totals for {isDifferentTargetDate ? formatDateInputLabel(targetLocalDate) : "today"}. For after-midnight dinners, check this date before saving.
        </p>
      </div>

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
            <input type="hidden" name="targetLocalDate" value={targetLocalDate} />
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
