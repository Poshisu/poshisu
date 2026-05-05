"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { completeOnboardingAction } from "@/app/(onboarding)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { onboardingAnswersSchema } from "@/lib/onboarding/schema";
import type { OnboardingAnswers } from "@/lib/onboarding/types";

type Props = { firstName: string };
type ConfidenceLabel = "high" | "medium" | "low";
type ChatMessage = { role: "assistant" | "user"; content: string; confidence?: ConfidenceLabel };
type SuggestionChip = { label: string; value: string };

const QUESTIONS = [
  "What should I call you?",
  "How old are you?",
  "What is your primary health goal right now?",
  "Any conditions I should know (diabetes, PCOS, hypertension, etc.)?",
  "Any diet pattern or allergies to remember?",
  "What are your usual meal times? (e.g. breakfast 09:00, lunch 13:00, dinner 19:00)",
] as const;

const STARTING_DRAFT: OnboardingAnswers = {
  name: "",
  age: 25,
  gender: "prefer-not-to-say",
  height_cm: 165,
  weight_kg: 65,
  city: "Not shared",
  primary_goal: "maintain",
  goal_target_kg: undefined,
  goal_timeline_weeks: undefined,
  conditions: [],
  conditions_other: "",
  medications_affecting_diet: "",
  dietary_pattern: "none",
  allergies: [],
  dislikes: "",
  meal_times: { breakfast: "09:00", lunch: "13:00", dinner: "19:00" },
  eating_context: "mixed",
  estimation_preference: "midpoint",
};

export function ChatOnboardingFlow({ firstName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        `Hey ${firstName}. I’ll set up your health context in a short conversation. You can type naturally — no rigid forms.`,
      confidence: "high",
    },
    { role: "assistant", content: QUESTIONS[0], confidence: "high" },
  ]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [draft, setDraft] = useState<OnboardingAnswers>(STARTING_DRAFT);

  const isReviewStep = questionIndex >= QUESTIONS.length;

  const chips: SuggestionChip[] = useMemo(() => {
    if (isReviewStep) return [];
    if (questionIndex === 3) return [{ label: "None", value: "None" }, { label: "Skip for now", value: "Skip for now" }];
    if (questionIndex === 4) return [{ label: "Vegetarian", value: "Vegetarian" }, { label: "Vegan", value: "Vegan" }, { label: "None", value: "None" }, { label: "Skip for now", value: "Skip for now" }];
    if (questionIndex === 5) return [{ label: "09:00 13:00 19:00", value: "09:00 13:00 19:00" }, { label: "Skip for now", value: "Skip for now" }];
    return [{ label: "Skip for now", value: "Skip for now" }];
  }, [isReviewStep, questionIndex]);

  function inferConfidenceAndClarifier(idx: number, text: string): { confidence: ConfidenceLabel; clarifier?: string } {
    const lower = text.toLowerCase();
    if (lower.includes("skip for now") || lower === "skip") {
      return { confidence: "low", clarifier: "No problem — we can revisit this later in chat." };
    }
    if (idx === 4 && (lower.includes("allergy") || lower.includes("allergic")) && (lower.includes("dislike") || lower.includes("hate"))) {
      return { confidence: "low", clarifier: "Quick check: is that a medical allergy or mostly a dislike? This helps me avoid unsafe suggestions." };
    }
    if (idx === 5 && !/(\d{1,2}:\d{2})/.test(lower)) {
      return { confidence: "low", clarifier: "Could you share approximate times (like 09:00, 13:00, 19:00)? Even rough times are fine." };
    }
    if (idx === 5 && (lower.includes("depends") || lower.includes("random") || lower.includes("varies"))) {
      return { confidence: "low", clarifier: "Got it. Rough windows still help — do you usually eat early, mid, or late for each meal?" };
    }
    if (idx <= 1 && text.trim().length < 2) {
      return { confidence: "medium", clarifier: "Could you share a bit more so I capture this correctly?" };
    }
    return { confidence: "high" };
  }


  const summary = useMemo(
    () => [
      `Name: ${draft.name || firstName}`,
      `Age: ${draft.age}`,
      `Goal: ${draft.primary_goal}`,
      `Conditions: ${draft.conditions.length ? draft.conditions.join(", ") : "none shared"}`,
      `Diet: ${draft.dietary_pattern}`,
      `Meal times: ${draft.meal_times.breakfast}, ${draft.meal_times.lunch}, ${draft.meal_times.dinner}`,
    ],
    [draft, firstName],
  );

  function captureAnswer(idx: number, answer: string) {
    const text = answer.trim();
    if (!text) return;

    setDraft((current) => {
      const next = { ...current };
      if (idx === 0) next.name = text;
      if (idx === 1) next.age = Number.parseInt(text, 10) || current.age;
      if (idx === 2) {
        const lower = text.toLowerCase();
        if (lower.includes("lose")) next.primary_goal = "lose-weight";
        else if (lower.includes("gain") || lower.includes("muscle")) next.primary_goal = "gain-weight";
        else if (lower.includes("condition")) next.primary_goal = "manage-condition";
        else if (lower.includes("well")) next.primary_goal = "wellness";
        else next.primary_goal = "maintain";
      }
      if (idx === 3) {
        const lower = text.toLowerCase();
        const conditions: OnboardingAnswers["conditions"] = [];
        if (lower.includes("diabetes")) conditions.push("type-2-diabetes");
        if (lower.includes("pcos") || lower.includes("pcod")) conditions.push("pcos-pcod");
        if (lower.includes("hyper") || lower.includes("blood pressure")) conditions.push("hypertension");
        next.conditions = conditions;
        next.conditions_other = !conditions.length && !lower.includes("none") ? text : "";
      }
      if (idx === 4) {
        const lower = text.toLowerCase();
        if (lower.includes("jain")) next.dietary_pattern = "jain";
        else if (lower.includes("vegan")) next.dietary_pattern = "vegan";
        else if (lower.includes("egg")) next.dietary_pattern = "veg-egg";
        else if (lower.includes("non")) next.dietary_pattern = "non-veg";
        else if (lower.includes("veg")) next.dietary_pattern = "veg";
        else next.dietary_pattern = "none";
      }
      if (idx === 5) {
        const found = text.match(/(\d{1,2}:\d{2})/g) ?? [];
        next.meal_times = {
          breakfast: found[0] ?? current.meal_times.breakfast,
          lunch: found[1] ?? current.meal_times.lunch,
          dinner: found[2] ?? current.meal_times.dinner,
        };
      }
      return next;
    });
  }

  async function submitMessage() {
    const text = input.trim();
    if (!text) return;

    setError(null);
    setMessages((m) => [...m, { role: "user", content: text }]);
    captureAnswer(questionIndex, text);
    setInput("");
    const assessment = inferConfidenceAndClarifier(questionIndex, text);
    if (assessment.clarifier) {
      setMessages((m) => [...m, { role: "assistant", content: assessment.clarifier!, confidence: assessment.confidence }]);
    }

    if (questionIndex < QUESTIONS.length - 1) {
      const nextIndex = questionIndex + 1;
      setQuestionIndex(nextIndex);
      setMessages((m) => [...m, { role: "assistant", content: QUESTIONS[nextIndex], confidence: "high" }]);
      return;
    }

    setQuestionIndex(QUESTIONS.length);
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        content:
          "Thanks. I drafted your profile summary below. Confirm when this looks right — you can always edit later from your profile.",
        confidence: "high",
      },
    ]);
  }

  async function confirmAndContinue() {
    if (loading) return;
    if (!confirmed) {
      setError("Please confirm the profile summary before we continue.");
      return;
    }

    const parsed = onboardingAnswersSchema.safeParse(draft);
    if (!parsed.success) {
      setError("I still need a few details to be sure this is accurate. Please answer in a bit more detail.");
      return;
    }

    setLoading(true);
    setCanRetry(false);
    setError(null);
    try {
      await completeOnboardingAction(parsed.data);
      window.location.assign("/chat");
    } catch {
      setError("We couldn’t save your onboarding yet. Check your connection and retry.");
      setCanRetry(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-svh w-full max-w-2xl p-4 md:p-6">
      <Card className="rounded-[28px] border-[#D9CBB7] bg-[#FFFDF8] shadow-[0_8px_28px_rgba(17,28,24,0.08)]">
        <CardHeader>
          <CardTitle as="h1" className="text-2xl text-[#0B3F35]">Nourish onboarding</CardTitle>
          <CardDescription className="text-[#34433C]">
            A short conversational setup so your coach understands your context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[52vh] space-y-3 overflow-y-auto rounded-2xl bg-[#FBF7EF] p-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === "assistant" ? "bg-[#EEF7F1] text-[#0B3F35]" : "ml-auto bg-[#0B3F35] text-[#FFFDF8]"}`}>
                <span>{msg.content}</span>
                {msg.role === "assistant" && msg.confidence ? <span className="mt-2 block text-[11px] opacity-70">Confidence: {msg.confidence}</span> : null}
              </div>
            ))}
          </div>

          {isReviewStep ? (
            <div className="space-y-3 rounded-2xl border border-[#D9CBB7] bg-white p-4 text-sm text-[#111C18]">
              <p className="font-medium">What I understood</p>
              <ul className="list-disc space-y-1 pl-5">
                {summary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <label className="flex items-center gap-2 text-sm text-[#34433C]">
                <input type="checkbox" checked={confirmed} disabled={loading} onChange={(e) => setConfirmed(e.target.checked)} />
                This looks right. Start building my health context.
              </label>
              <Button onClick={confirmAndContinue} disabled={loading} className="rounded-full bg-[#0B3F35] text-[#FFFDF8] hover:bg-[#105846]">
                {loading ? "Saving profile..." : "Start building"}
              </Button>
              {loading ? <p className="text-xs text-[#34433C]">This can take a few seconds while we prepare your profile.</p> : null}
              {canRetry && !loading ? (
                <Button type="button" variant="outline" onClick={() => void confirmAndContinue()} className="rounded-full border-[#D9CBB7]">
                  Retry save
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <Button key={chip.label} type="button" variant="outline" className="rounded-full border-[#D9CBB7]" onClick={() => setInput(chip.value)}>
                    {chip.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type your answer naturally..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitMessage();
                    }
                  }}
                  className="rounded-full border-[#D9CBB7]"
                />
                <Button onClick={() => void submitMessage()} className="rounded-full bg-[#0B3F35] text-[#FFFDF8] hover:bg-[#105846]">
                  Send
                </Button>
              </div>
            </div>
          )}

          {error ? <p className="rounded-xl border border-[#B94A48] bg-[#fff2f2] px-3 py-2 text-sm text-[#B94A48]">{error}</p> : null}

          <p className="text-xs text-[#6C7A73]">
            Prefer to skip for now? <Link href="/chat" className="underline">Open chat</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
