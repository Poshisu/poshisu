"use client";

import { useEffect, useMemo, useState } from "react";
import { completeOnboardingAction } from "@/app/(onboarding)/actions";
import { onboardingAnswersSchema } from "@/lib/onboarding/schema";
import type { OnboardingAnswers } from "@/lib/onboarding/types";

type Props = { firstName: string };
const DRAFT_STORAGE_KEY = "onboarding.chat.draft.v1";

const STARTING_DRAFT: OnboardingAnswers = { name: "", age: 25, gender: "prefer-not-to-say", height_cm: 165, weight_kg: 65, city: "Not shared", primary_goal: "maintain", goal_target_kg: undefined, goal_timeline_weeks: undefined, conditions: [], conditions_other: "", medications_affecting_diet: "", dietary_pattern: "none", allergies: [], dislikes: "", meal_times: { breakfast: "09:00", lunch: "13:00", dinner: "19:00" }, eating_context: "mixed", estimation_preference: "midpoint" };
const STEPS = ["Hey there!", "A bit about you", "What's your goal?", "How active are you?", "Health context", "One last thing", "Review your profile"] as const;

const activityOptions: Array<{ value: OnboardingAnswers["eating_context"]; label: string }> = [{ value: "home", label: "Mostly home-cooked" }, { value: "mixed", label: "Home + outside mix" }, { value: "out", label: "Mostly outside food" }, { value: "varies", label: "Varies day to day" }];
const goalOptions: Array<{ value: OnboardingAnswers["primary_goal"]; label: string; detail: string }> = [
  { value: "lose-weight", label: "Lose weight", detail: "Steady fat loss with safe pacing." },
  { value: "maintain", label: "Maintain", detail: "Keep weight stable with better consistency." },
  { value: "gain-weight", label: "Build muscle", detail: "Lean gain with protein-forward guidance." },
  { value: "wellness", label: "General wellness", detail: "Improve overall energy and habits." },
];

function row(selected: boolean) {
  return `w-full rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-muted)] min-h-11 ${selected ? "border-[var(--brand-muted)] bg-[var(--surface-raised)] text-[var(--foreground-on-dark-strong)]" : "border-[var(--border-soft)] bg-[var(--surface-panel-dark)] text-[var(--foreground-on-dark)] hover:border-[var(--brand-muted)]"}`;
}

export function ChatOnboardingFlow({ firstName }: Props) {
  const initialStored = typeof window === "undefined" ? null : (() => { try { const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY); return raw ? (JSON.parse(raw) as { step: number; draft: OnboardingAnswers }) : null; } catch { return null; } })();
  const [step, setStep] = useState(initialStored?.step ?? 0);
  const [draft, setDraft] = useState<OnboardingAnswers>(initialStored?.draft ?? STARTING_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => { window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ step, draft })); }, [step, draft]);

  const progress = ((step + 1) / STEPS.length) * 100;
  const summary = useMemo(() => [
    `Name: ${draft.name || firstName}`,
    `About: ${draft.age} years · ${draft.height_cm} cm · ${draft.weight_kg} kg`,
    `Goal: ${draft.primary_goal}`,
    `Activity: ${draft.eating_context}`,
    `Health notes: ${draft.conditions_other || "None shared"}`,
    `Diet: ${draft.dietary_pattern}`,
  ], [draft, firstName]);

  const next = () => { setError(null); if (step === 0 && draft.name.trim().length < 2) return setError("Please enter your name."); if (step === 1 && (draft.age < 13 || draft.age > 100)) return setError("Age must be between 13 and 100."); if (step === 5 && !accepted) return setError("Please acknowledge the safety notice to continue."); setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function finish() {
    const parsed = onboardingAnswersSchema.safeParse(draft);
    if (!parsed.success) return setError("Please review your details before continuing.");
    setSaving(true);
    try { await completeOnboardingAction(parsed.data); window.localStorage.removeItem(DRAFT_STORAGE_KEY); window.location.assign("/chat"); } catch { setError("We couldn’t save yet. Please retry."); } finally { setSaving(false); }
  }

  return <main className="min-h-svh bg-[var(--surface-app-dark)] text-[var(--foreground-on-dark)]"><div className="mx-auto flex w-full max-w-2xl flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6"><div className="mb-5"><div className="mb-2 h-1.5 w-full rounded-full bg-[var(--surface-panel-dark)]"><div className="h-full rounded-full bg-[var(--brand-muted)]" style={{ width: `${progress}%` }} /></div><p className="text-xs text-[var(--foreground-on-dark-muted)]">{step + 1} of {STEPS.length}</p></div><section className="flex-1 space-y-5 overflow-y-auto pb-28"><h1 className="text-4xl text-[var(--foreground-on-dark-strong)]">{STEPS[step]}</h1>
    {step === 0 && <label className="block"><span className="mb-2 block text-sm">First name</span><input className={row(false)} value={draft.name} onChange={(e)=>setDraft((d)=>({...d,name:e.target.value}))} placeholder="Your first name" /></label>}
    {step === 1 && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[["Age","age"],["Height (cm)","height_cm"],["Weight (kg)","weight_kg"]].map(([label,key])=><label key={key} className="block"><span className="mb-2 block text-sm">{label}</span><input inputMode="numeric" className={row(false)} value={String(draft[key as keyof OnboardingAnswers] as number)} onChange={(e)=>setDraft((d)=>({...d,[key]:Number(e.target.value)||d[key as keyof OnboardingAnswers]}))} /></label>)}</div>}
    {step === 2 && <div className="space-y-3">{goalOptions.map((g)=><button key={g.value} type="button" className={row(draft.primary_goal===g.value)} onClick={()=>setDraft((d)=>({...d,primary_goal:g.value}))}><div className="font-semibold">{g.label}</div><div className="text-sm opacity-80">{g.detail}</div></button>)}</div>}
    {step === 3 && <div className="space-y-3">{activityOptions.map((opt)=><button type="button" key={opt.value} className={row(draft.eating_context===opt.value)} onClick={()=>setDraft((d)=>({...d,eating_context:opt.value}))}>{opt.label}</button>)}</div>}
    {step === 4 && <div className="space-y-3"><label className="block"><span className="mb-2 block text-sm">Health conditions (optional)</span><input className={row(false)} value={draft.conditions_other} onChange={(e)=>setDraft((d)=>({...d,conditions_other:e.target.value}))} placeholder="Example: thyroid, none"/></label><label className="block"><span className="mb-2 block text-sm">Dietary pattern</span><select className={row(false)} value={draft.dietary_pattern} onChange={(e)=>setDraft((d)=>({...d,dietary_pattern:e.target.value as OnboardingAnswers['dietary_pattern']}))}><option value="none">No restriction</option><option value="veg">Vegetarian</option><option value="veg-egg">Eggetarian</option><option value="non-veg">Non-vegetarian</option><option value="vegan">Vegan</option></select></label></div>}
    {step===5 && <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-dark)] p-4"><p className="text-sm">Nourish provides general nutrition guidance, not medical diagnosis or treatment.</p><label className="mt-4 flex items-start gap-3"><button type="button" aria-pressed={accepted} onClick={()=>setAccepted((v)=>!v)} className={`mt-1 h-5 w-5 rounded border ${accepted?"border-[var(--brand-muted)] bg-[var(--brand-muted)]":"border-[var(--border-soft)] bg-transparent"}`}>{accepted?"✓":""}</button><span>I understand and want to continue.</span></label></div>}
    {step===6 && <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-dark)] p-4"><ul className="space-y-2 text-sm">{summary.map((item)=><li key={item}>{item}</li>)}</ul></div>}
    {error && <p role="alert" className="rounded-xl border border-[var(--error-border)] bg-[var(--error-surface)] p-3 text-sm text-[var(--error-foreground)]">{error}</p>}
  </section><footer className="sticky bottom-0 mt-4 flex gap-3 border-t border-[var(--border-soft)] bg-[var(--surface-app-dark)] py-3"><button type="button" onClick={back} disabled={step===0||saving} className="min-h-11 rounded-xl border border-[var(--border-soft)] px-4">Back</button>{step<STEPS.length-1?<button type="button" onClick={next} className="min-h-11 flex-1 rounded-xl bg-[var(--brand)] px-4 text-[var(--brand-foreground)]">Continue</button>:<button type="button" onClick={()=>void finish()} disabled={saving} className="min-h-11 flex-1 rounded-xl bg-[var(--brand)] px-4 text-[var(--brand-foreground)]">{saving?"Saving...":"Begin with Nourish"}</button>}</footer></div></main>;
}
