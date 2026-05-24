"use client";

import { useEffect, useMemo, useState } from "react";
import { completeOnboardingAction } from "@/app/(onboarding)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { onboardingAnswersSchema } from "@/lib/onboarding/schema";
import type { OnboardingAnswers } from "@/lib/onboarding/types";

type Props = { firstName: string };
const DRAFT_STORAGE_KEY = "onboarding.chat.draft.v1";

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

const STEPS = [
  { title: "Hey there!", subtitle: "Let’s start with your name." },
  { title: "A bit about you", subtitle: "Helps us personalise calorie estimates." },
  { title: "What’s your goal?", subtitle: "No pressure — you can change this any time." },
  { title: "How active are you?", subtitle: "On a typical day." },
  { title: "Health context", subtitle: "Helps with safer suggestions." },
  { title: "One last thing", subtitle: "Safety first." },
] as const;

type DraftState = { step: number; draft: OnboardingAnswers };

export function ChatOnboardingFlow({ firstName }: Props) {
  const readStored = (): DraftState | null => {
    if (typeof window === "undefined") return null;
    try {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved) as DraftState;
      if (typeof parsed.step !== "number" || !parsed.draft) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const initialStored = readStored();
  const [step, setStep] = useState(initialStored?.step ?? 0);
  const [draft, setDraft] = useState<OnboardingAnswers>(initialStored?.draft ?? STARTING_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const payload: DraftState = { step, draft };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  }, [step, draft]);

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

  function next() {
    setError(null);
    if (step === 0 && draft.name.trim().length < 2) return setError("Please enter your name.");
    if (step === 1 && (draft.age < 13 || draft.age > 100)) return setError("Age must be between 13 and 100.");
    if (step === 5 && !accepted) return setError("Please acknowledge the safety notice to continue.");
    setStep((s) => Math.min(s + 1, STEPS.length));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function finish() {
    setError(null);
    const parsed = onboardingAnswersSchema.safeParse(draft);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check your details.");
    setSaving(true);
    try {
      await completeOnboardingAction(parsed.data);
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      window.location.assign("/chat");
    } catch {
      setError("We couldn’t save your onboarding yet. Check your connection and retry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-svh w-full max-w-3xl bg-[#050706] px-4 py-6 text-[#eef2ed]">
      <Card className="border-[var(--border-soft)] bg-[#050706] shadow-none">
        <CardHeader>
          <div className="text-center text-sm text-[#7b867f]">{Math.min(step + 1, 6)} of 6</div>
          <CardTitle as="h1" className="text-5xl text-[#f1f5f0]">{STEPS[Math.min(step, 5)]?.title}</CardTitle>
          <CardDescription className="text-xl text-[#8f9d95]">{STEPS[Math.min(step, 5)]?.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 0 && (
            <Input value={draft.name} placeholder="Priya, Rahul, Ananya..." onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          )}
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input type="number" value={draft.age} onChange={(e) => setDraft((d) => ({ ...d, age: Number(e.target.value) || d.age }))} placeholder="Age" />
              <Input type="number" value={draft.height_cm} onChange={(e) => setDraft((d) => ({ ...d, height_cm: Number(e.target.value) || d.height_cm }))} placeholder="Height (cm)" />
              <Input type="number" value={draft.weight_kg} onChange={(e) => setDraft((d) => ({ ...d, weight_kg: Number(e.target.value) || d.weight_kg }))} placeholder="Weight (kg)" />
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-3">
              {[
                ["lose-weight", "Lose weight"],
                ["maintain", "Maintain weight"],
                ["gain-weight", "Build muscle"],
                ["wellness", "Eat healthier"],
              ].map(([value, label]) => (
                <Button key={value} type="button" variant={draft.primary_goal === value ? "default" : "outline"} onClick={() => setDraft((d) => ({ ...d, primary_goal: value as OnboardingAnswers["primary_goal"] }))} className="justify-start">
                  {label}
                </Button>
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-3">
              {["mostly-sitting", "light-activity", "moderately-active", "very-active"].map((opt) => (
                <Button key={opt} type="button" variant={draft.eating_context === "mixed" && opt === "moderately-active" ? "default" : "outline"} onClick={() => setDraft((d) => ({ ...d, eating_context: "mixed" }))} className="justify-start">
                  {opt.replace("-", " ")}
                </Button>
              ))}
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <Input placeholder="Health conditions (comma separated) or None" onChange={(e) => setDraft((d) => ({ ...d, conditions_other: e.target.value }))} value={draft.conditions_other} />
              <Input placeholder="Diet preference (veg, non-veg, vegan, etc.)" onChange={(e) => setDraft((d) => ({ ...d, dietary_pattern: e.target.value as OnboardingAnswers["dietary_pattern"] }))} value={draft.dietary_pattern} />
              <Input placeholder="Meal times (e.g. 09:00 13:00 19:00)" onChange={(e) => {
                const found = e.target.value.match(/(\d{1,2}:\d{2})/g) ?? [];
                setDraft((d) => ({ ...d, meal_times: { breakfast: found[0] ?? d.meal_times.breakfast, lunch: found[1] ?? d.meal_times.lunch, dinner: found[2] ?? d.meal_times.dinner } }));
              }} />
            </div>
          )}
          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[#0f1713] p-4 text-[#9faca4]">
                <p>Poshisu provides general nutrition guidance based on the information you share.</p>
                <p className="mt-2">This is not medical advice and should not replace a qualified doctor.</p>
              </div>
              <label className="flex items-start gap-2 text-lg">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-6 w-6" />
                I understand Poshisu provides nutrition guidance only, not medical advice.
              </label>
            </div>
          )}
          {step >= STEPS.length && (
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[#0f1713] p-5">
              <p className="mb-3 text-xl">What I understood</p>
              <ul className="list-disc space-y-1 pl-5 text-[#cfd8d2]">
                {summary.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          {error ? <div role="alert" className="rounded-xl border border-[#e4b8b0] bg-[#f3e3e1] p-4 text-[#be3f31]">{error}</div> : null}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={back} disabled={step === 0 || saving}>Back</Button>
            {step < STEPS.length ? (
              <Button type="button" onClick={next} className="flex-1">Continue</Button>
            ) : (
              <Button type="button" onClick={() => void finish()} disabled={saving} className="flex-1">
                {saving ? "Saving profile..." : "Let's begin"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
