"use client";

import { useEffect, useMemo, useState } from "react";
import { completeOnboardingAction } from "@/app/(onboarding)/actions";
import { onboardingAnswersSchema } from "@/lib/onboarding/schema";
import type { OnboardingAnswers } from "@/lib/onboarding/types";

type Props = { firstName: string };
const DRAFT_STORAGE_KEY = "onboarding.chat.draft.v1";

const STARTING_DRAFT: OnboardingAnswers = { name: "", age: 25, gender: "prefer-not-to-say", height_cm: 165, weight_kg: 65, city: "Not shared", primary_goal: "maintain", goal_target_kg: undefined, goal_timeline_weeks: undefined, conditions: [], conditions_other: "", medications_affecting_diet: "", dietary_pattern: "none", allergies: [], dislikes: "", meal_times: { breakfast: "09:00", lunch: "13:00", dinner: "19:00" }, eating_context: "mixed", estimation_preference: "midpoint" };
const STEPS = ["Hey there!", "A bit about you", "What's your goal?", "How active are you?", "Health context", "One last thing", "Review your profile"] as const;
const GOAL_OPTIONS: Array<{ value: OnboardingAnswers["primary_goal"]; label: string }> = [
  { value: "lose-weight", label: "Lose weight" },
  { value: "maintain", label: "Maintain weight" },
  { value: "gain-weight", label: "Build muscle" },
  { value: "wellness", label: "Eat healthier" },
];
const ACTIVITY_OPTIONS: Array<{ value: OnboardingAnswers["eating_context"]; label: string }> = [
  { value: "home", label: "Mostly home-cooked" },
  { value: "mixed", label: "Mixed" },
  { value: "out", label: "Mostly outside" },
  { value: "varies", label: "Varies" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--foreground-on-dark-muted)]">{label}</span>
      {children}
    </label>
  );
}

export function ChatOnboardingFlow({ firstName }: Props) {
  const initialStored =
    typeof window === "undefined"
      ? null
      : (() => {
          try {
            const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
            return raw ? (JSON.parse(raw) as { step: number; draft: OnboardingAnswers }) : null;
          } catch {
            return null;
          }
        })();

  const [step, setStep] = useState(initialStored?.step ?? 0);
  const [draft, setDraft] = useState<OnboardingAnswers>(initialStored?.draft ?? STARTING_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ step, draft }));
  }, [step, draft]);

  const summary = useMemo(
    () => [
      `Name: ${draft.name || firstName}`,
      `Age: ${draft.age}`,
      `Goal: ${draft.primary_goal}`,
      `Conditions: ${draft.conditions_other || "none shared"}`,
      `Diet: ${draft.dietary_pattern}`,
      `Meal times: ${draft.meal_times.breakfast}, ${draft.meal_times.lunch}, ${draft.meal_times.dinner}`,
    ],
    [draft, firstName],
  );

  const next = () => {
    setError(null);
    if (step === 0 && draft.name.trim().length < 2) return setError("Please enter your name.");
    if (step === 1 && (draft.age < 13 || draft.age > 100)) return setError("Age must be between 13 and 100.");
    if (step === 5 && !accepted) return setError("Please acknowledge the safety notice to continue.");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  async function finish() {
    const parsed = onboardingAnswersSchema.safeParse(draft);
    if (!parsed.success) return setError("Please review your details before continuing.");
    setSaving(true);
    try {
      await completeOnboardingAction(parsed.data);
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      window.location.assign("/chat");
    } catch {
      setError("We couldn’t save your profile yet. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  const selectedRow = "border-[var(--brand-muted)] bg-[linear-gradient(90deg,#0f3828,#135a3e)] text-[var(--foreground-on-dark-strong)]";
  const baseRow = "w-full min-h-11 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-dark)] px-4 py-3 text-left text-[var(--foreground-on-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-muted)]";

  return (
    <main className="min-h-svh w-full bg-[var(--surface-app-dark)] text-[var(--foreground-on-dark)]">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-7">
        <header className="mb-5 grid gap-3">
          <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-panel-dark)]">
            <div className="h-full bg-[var(--brand-muted)]" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={back} disabled={step === 0 || saving} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-soft)] text-xl text-[var(--foreground-on-dark-muted)] disabled:opacity-40" aria-label="Go back">←</button>
            <p className="text-sm text-[var(--foreground-on-dark-muted)]">{step + 1} of {STEPS.length}</p>
          </div>
        </header>

        <section className="flex-1 space-y-5 overflow-y-auto pb-28">
          <h1 className="text-5xl text-[var(--foreground-on-dark-strong)]">{STEPS[step]}</h1>
          {step === 0 && (
            <Field label="Your name">
              <input className={baseRow} value={draft.name} placeholder="Priya, Rahul, Ananya..." onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </Field>
          )}
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Age (years)"><input inputMode="numeric" className={baseRow} value={draft.age} onChange={(e) => setDraft((d) => ({ ...d, age: Number(e.target.value) || d.age }))} /></Field>
              <Field label="Height (cm)"><input inputMode="numeric" className={baseRow} value={draft.height_cm} onChange={(e) => setDraft((d) => ({ ...d, height_cm: Number(e.target.value) || d.height_cm }))} /></Field>
              <Field label="Weight (kg)"><input inputMode="numeric" className={baseRow} value={draft.weight_kg} onChange={(e) => setDraft((d) => ({ ...d, weight_kg: Number(e.target.value) || d.weight_kg }))} /></Field>
            </div>
          )}
          {step === 2 && <fieldset className="grid gap-3">{GOAL_OPTIONS.map((g) => <button key={g.value} type="button" className={`${baseRow} ${draft.primary_goal === g.value ? selectedRow : ""}`} onClick={() => setDraft((d) => ({ ...d, primary_goal: g.value }))}>{g.label}</button>)}</fieldset>}
          {step === 3 && <fieldset className="grid gap-3">{ACTIVITY_OPTIONS.map((g) => <button key={g.value} type="button" className={`${baseRow} ${draft.eating_context === g.value ? selectedRow : ""}`} onClick={() => setDraft((d) => ({ ...d, eating_context: g.value }))}>{g.label}</button>)}</fieldset>}
          {step === 4 && (
            <div className="grid gap-3">
              <Field label="Health conditions (optional)"><input className={baseRow} value={draft.conditions_other} onChange={(e) => setDraft((d) => ({ ...d, conditions_other: e.target.value }))} placeholder="None, thyroid, PCOS..." /></Field>
              <Field label="Dietary preference">
                <select className={baseRow} value={draft.dietary_pattern} onChange={(e) => setDraft((d) => ({ ...d, dietary_pattern: e.target.value as OnboardingAnswers["dietary_pattern"] }))}>
                  <option value="none">No restriction</option><option value="veg">Vegetarian</option><option value="veg-egg">Eggetarian</option><option value="non-veg">Non-vegetarian</option><option value="vegan">Vegan</option><option value="jain">Jain</option>
                </select>
              </Field>
              <Field label="Meal times"><input className={baseRow} value={`${draft.meal_times.breakfast} ${draft.meal_times.lunch} ${draft.meal_times.dinner}`} onChange={(e) => {
                const t = e.target.value.match(/\d{1,2}:\d{2}/g) ?? [];
                setDraft((d) => ({ ...d, meal_times: { breakfast: t[0] ?? d.meal_times.breakfast, lunch: t[1] ?? d.meal_times.lunch, dinner: t[2] ?? d.meal_times.dinner } }));
              }} placeholder="09:00 13:00 19:00"/></Field>
            </div>
          )}
          {step === 5 && (
            <div className="grid gap-4 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-panel-dark)] p-5">
              <p className="text-[var(--foreground-on-dark-muted)]">Nourish is a nutrition coach, not a medical service. Always consult a doctor for medical conditions.</p>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[#121a15] p-4 text-[var(--foreground-on-dark-muted)]">
                Nourish provides general nutrition guidance based on the information you share. This is not medical advice.
              </div>
              <button type="button" onClick={() => setAccepted((x) => !x)} className="flex min-h-11 items-start gap-3 text-left">
                <span className={`mt-1 inline-block h-7 w-7 rounded-md border-2 ${accepted ? "border-[var(--brand-muted)] bg-[var(--brand)]" : "border-[var(--border-soft)]"}`} />
                <span>I understand Nourish provides nutrition guidance only, not medical advice.</span>
              </button>
            </div>
          )}
          {step === 6 && <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-panel-dark)] p-5"><p className="mb-2 text-xl text-[var(--foreground-on-dark-strong)]">What I understood</p><ul className="list-disc space-y-1 pl-6 text-[var(--foreground-on-dark)]">{summary.map((line) => <li key={line}>{line}</li>)}</ul></div>}
          {error && <p role="alert" className="rounded-2xl border border-[var(--error-border)] bg-[var(--error-surface)] p-4 text-[var(--error-foreground)]">{error}</p>}
        </section>

        <footer className="sticky bottom-0 mt-4 grid grid-cols-[110px,1fr] gap-3 border-t border-[var(--border-soft)] bg-[var(--surface-app-dark)] py-3">
          <button type="button" onClick={back} disabled={step === 0 || saving} className="min-h-11 rounded-xl border border-[var(--border-soft)] text-[var(--foreground-on-dark)] disabled:opacity-40">Back</button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="min-h-11 rounded-xl bg-[var(--brand)] text-[var(--brand-foreground)]">Continue</button>
          ) : (
            <button type="button" onClick={() => void finish()} disabled={saving} className="min-h-11 rounded-xl bg-[var(--brand)] text-[var(--brand-foreground)] disabled:opacity-60">{saving ? "Saving profile..." : "Let's begin"}</button>
          )}
        </footer>
      </div>
    </main>
  );
}
