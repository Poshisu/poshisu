"use client";

import { useState } from "react";
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

  const chips =
    questionIndex === 3
      ? ["None", "Skip for now"]
      : questionIndex === 4
        ? ["Vegetarian", "Vegan", "None", "Skip for now"]
        : questionIndex === 5
          ? ["09:00 13:00 19:00", "Skip for now"]
          : ["Skip for now"];



  function addAttachmentMessage(content: string) {
    setMessages((current) => [...current, { role: "user", content }]);
  }

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


  const summary = [
      `Name: ${draft.name || firstName}`,
      `Age: ${draft.age}`,
      `Goal: ${draft.primary_goal}`,
      `Conditions: ${draft.conditions.length ? draft.conditions.join(", ") : "none shared"}`,
      `Diet: ${draft.dietary_pattern}`,
      `Meal times: ${draft.meal_times.breakfast}, ${draft.meal_times.lunch}, ${draft.meal_times.dinner}`,
  ];

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
      <Card className="surface-card-hero rounded-3xl">
        <CardHeader>
          <CardTitle as="h1" className="text-2xl text-[color:var(--brand-muted)]">Nourish onboarding</CardTitle>
          <CardDescription className="text-[color:var(--muted-foreground)]">
            A short conversational setup so your coach understands your context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[52vh] space-y-3 overflow-y-auto rounded-2xl bg-[color:var(--surface-soft)] p-4 shadow-[var(--shadow-soft)]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === "assistant" ? "bg-[color:var(--surface-brand-soft)] text-[color:var(--brand-muted)]" : "ml-auto bg-[color:var(--brand)] text-[color:var(--brand-foreground)]"}`}>
                {msg.content}
                {msg.confidence ? <div className="mt-1 text-[10px] opacity-70">Confidence: {msg.confidence}</div> : null}
              </div>
            ))}
          </div>

          {isReviewStep ? (
            <div className="surface-card space-y-3 rounded-2xl border p-4 text-sm text-foreground">
              <p className="font-medium">What I understood</p>
              <ul className="list-disc space-y-1 pl-5">
                {summary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={confirmed} disabled={loading} onChange={(e) => setConfirmed(e.target.checked)} />
                This looks right. Start building my health context.
              </label>
              <Button onClick={confirmAndContinue} disabled={loading} className="rounded-full bg-[color:var(--brand)] text-[color:var(--brand-foreground)] hover:opacity-90">
                {loading ? "Saving profile..." : "Start building"}
              </Button>
              {loading ? <p className="text-xs text-muted-foreground">This can take a few seconds while we prepare your profile.</p> : null}
              {canRetry && !loading ? (
                <Button type="button" variant="outline" onClick={() => void confirmAndContinue()} className="rounded-full border-[color:var(--border-soft)]">
                  Retry save
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Button key={chip} type="button" variant="outline" className="rounded-full" onClick={() => setInput(chip)}>
                  {chip}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <label className="cursor-pointer rounded-full border px-3 py-1">
                Upload photo
                <input aria-label="Upload photo" type="file" accept="image/*" className="sr-only" onChange={(e)=>{const f=e.target.files?.[0]; if(f) addAttachmentMessage(`Shared photo: ${f.name}`);}} />
              </label>
              <label className="cursor-pointer rounded-full border px-3 py-1">
                Use camera
                <input aria-label="Use camera" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e)=>{const f=e.target.files?.[0]; if(f) addAttachmentMessage(`Shared photo: ${f.name}`);}} />
              </label>
              <label className="cursor-pointer rounded-full border px-3 py-1">
                Upload file
                <input aria-label="Upload file" type="file" className="sr-only" onChange={(e)=>{const f=e.target.files?.[0]; if(f) addAttachmentMessage(`Uploaded file: ${f.name}`);}} />
              </label>
              <Button type="button" variant="outline" className="rounded-full" onClick={()=>addAttachmentMessage("Voice note captured (placeholder)")}>Voice</Button>
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
                className="rounded-full border-[color:var(--border-soft)] bg-[color:var(--surface-raised)]"
              />
              <Button onClick={() => void submitMessage()} className="rounded-full bg-[color:var(--brand)] text-[color:var(--brand-foreground)] hover:opacity-90">
                Send
              </Button>
            </div>
            </>
          )}

          {error ? <p className="rounded-xl border border-[color:var(--warning)] bg-[color:var(--surface-raised)] px-3 py-2 text-sm text-[color:var(--warning)]">{error}</p> : null}

          <p className="text-xs text-muted-foreground">
            Prefer to skip for now? <Link href="/chat" className="underline">Open chat</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
