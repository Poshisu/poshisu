"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { onboardingAnswersSchema } from "@/lib/onboarding/schema";
import type { OnboardingAnswers, PrimaryGoal } from "@/lib/onboarding/types";

type Props = { firstName: string };

const STEPS = ["Basics", "Body", "Goal", "Medical", "Food boundaries", "How you eat", "Review"] as const;

export function ChatOnboardingFlow({ firstName }: Props) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [draft, setDraft] = useState<OnboardingAnswers>({
    name: firstName,
    age: 25,
    gender: "prefer-not-to-say",
    height_cm: 165,
    weight_kg: 65,
    city: "",
    primary_goal: "maintain",
    conditions: [],
    conditions_other: "",
    medications_affecting_diet: "",
    dietary_pattern: "none",
    allergies: [],
    dislikes: "",
    meal_times: {
      breakfast: "09:00",
      lunch: "13:00",
      dinner: "19:00",
      snacks: "",
    },
    eating_context: "mixed",
    estimation_preference: "midpoint",
  });

  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

  function next() {
    const validationMessage = validateCurrentStep(step, draft);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError(null);
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function back() {
    if (saving) return;
    setError(null);
    setStep((prev) => Math.max(prev - 1, 0));
  }

  async function confirmAndContinue() {
    setError(null);

    if (!confirmed) {
      setError("Please confirm your profile before continuing to chat.");
      return;
    }

    const parsed = onboardingAnswersSchema.safeParse({
      ...draft,
      city: draft.city?.trim() || undefined,
      conditions_other: draft.conditions_other?.trim() || undefined,
      medications_affecting_diet: draft.medications_affecting_diet?.trim() || undefined,
      dislikes: draft.dislikes?.trim() || undefined,
      allergies: draft.allergies.filter(Boolean),
      meal_times: {
        ...draft.meal_times,
        snacks: draft.meal_times.snacks?.trim() || undefined,
      },
    });

    if (!parsed.success) {
      setError("A few fields still need fixing. Please review your details and try again.");
      return;
    }

    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    setSaving(false);
    window.location.assign("/chat");
  }

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Let&apos;s set up your coach, {firstName}.</h1>
        <p className="text-sm text-muted-foreground">Quick chat-style setup. You can edit everything later.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle as="h2">{STEPS[step]}</CardTitle>
          <CardDescription>{getPrompt(step)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <StepFields step={step} draft={draft} setDraft={setDraft} />

          {error ? (
            <p aria-live="polite" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={back} disabled={step === 0 || saving}>
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={next} disabled={saving}>Next</Button>
            ) : (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    aria-label="I confirm this profile looks right"
                  />
                  I confirm this profile looks right
                </label>
                <Button onClick={confirmAndContinue} disabled={saving}>
                  {saving ? "Saving..." : "Confirm and open chat"}
                </Button>
              </div>
            )}
          </div>

          {step === STEPS.length - 1 ? (
            <p className="text-xs text-muted-foreground">
              By continuing, you agree that Nourish can use this profile to personalize coaching. You can update this any
              time.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Need to skip for now? <Link href="/chat" className="underline">Open chat anyway</Link>
      </p>
    </main>
  );
}

function StepFields({ step, draft, setDraft }: { step: number; draft: OnboardingAnswers; setDraft: React.Dispatch<React.SetStateAction<OnboardingAnswers>> }) {
  if (step === 0) {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="name">What should I call you?</Label>
          <Input id="name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input id="age" type="number" value={draft.age} onChange={(e) => setDraft((d) => ({ ...d, age: Number(e.target.value) }))} />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={draft.gender} onValueChange={(value: OnboardingAnswers["gender"]) => setDraft((d) => ({ ...d, gender: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </>
    );
  }

  if (step === 1) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="height">Height (cm)</Label>
          <Input id="height" type="number" value={draft.height_cm} onChange={(e) => setDraft((d) => ({ ...d, height_cm: Number(e.target.value) }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input id="weight" type="number" value={draft.weight_kg} onChange={(e) => setDraft((d) => ({ ...d, weight_kg: Number(e.target.value) }))} />
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Primary goal</Label>
          <Select value={draft.primary_goal} onValueChange={(value: PrimaryGoal) => setDraft((d) => ({ ...d, primary_goal: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lose-weight">Lose weight</SelectItem>
              <SelectItem value="gain-weight">Gain weight / build muscle</SelectItem>
              <SelectItem value="maintain">Maintain and eat better</SelectItem>
              <SelectItem value="manage-condition">Manage a health condition</SelectItem>
              <SelectItem value="wellness">General wellness and energy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="space-y-2">
        <Label htmlFor="conditions">Conditions (comma separated, optional)</Label>
        <Input
          id="conditions"
          placeholder="e.g. pcos-pcod, hypertension"
          value={draft.conditions.join(", ")}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              conditions: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean) as OnboardingAnswers["conditions"],
            }))
          }
        />
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="space-y-2">
        <Label>Dietary pattern</Label>
        <Select value={draft.dietary_pattern} onValueChange={(value: OnboardingAnswers["dietary_pattern"]) => setDraft((d) => ({ ...d, dietary_pattern: value }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="veg">Vegetarian</SelectItem>
            <SelectItem value="veg-egg">Vegetarian + eggs</SelectItem>
            <SelectItem value="non-veg">Non-vegetarian</SelectItem>
            <SelectItem value="vegan">Vegan</SelectItem>
            <SelectItem value="jain">Jain</SelectItem>
            <SelectItem value="pescetarian">Pescetarian</SelectItem>
            <SelectItem value="none">No restrictions</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="breakfast">Breakfast</Label>
          <Input id="breakfast" value={draft.meal_times.breakfast ?? ""} onChange={(e) => setDraft((d) => ({ ...d, meal_times: { ...d.meal_times, breakfast: e.target.value } }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lunch">Lunch</Label>
          <Input id="lunch" value={draft.meal_times.lunch ?? ""} onChange={(e) => setDraft((d) => ({ ...d, meal_times: { ...d.meal_times, lunch: e.target.value } }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dinner">Dinner</Label>
          <Input id="dinner" value={draft.meal_times.dinner ?? ""} onChange={(e) => setDraft((d) => ({ ...d, meal_times: { ...d.meal_times, dinner: e.target.value } }))} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3 text-sm">
      <p><strong>Name:</strong> {draft.name}</p>
      <p><strong>Goal:</strong> {draft.primary_goal}</p>
      <p><strong>Meal check-ins:</strong> {draft.meal_times.breakfast}, {draft.meal_times.lunch}, {draft.meal_times.dinner}</p>
      <p className="text-muted-foreground">You can always update this later in your profile.</p>
    </div>
  );
}

function validateCurrentStep(step: number, draft: OnboardingAnswers): string | null {
  if (step === 0) {
    if (!draft.name || draft.name.trim().length < 2) return "Please share a name with at least 2 letters.";
    if (draft.age < 13 || draft.age > 100) return "Age should be between 13 and 100.";
  }

  if (step === 1) {
    if (draft.height_cm < 100 || draft.height_cm > 250) return "Height should be between 100 and 250 cm.";
    if (draft.weight_kg < 25 || draft.weight_kg > 250) return "Weight should be between 25 and 250 kg.";
  }

  if (step === 5) {
    const hhMm = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!draft.meal_times.breakfast || !hhMm.test(draft.meal_times.breakfast)) return "Breakfast time must be HH:mm.";
    if (!draft.meal_times.lunch || !hhMm.test(draft.meal_times.lunch)) return "Lunch time must be HH:mm.";
    if (!draft.meal_times.dinner || !hhMm.test(draft.meal_times.dinner)) return "Dinner time must be HH:mm.";
  }

  return null;
}

function getPrompt(step: number): string {
  switch (step) {
    case 0:
      return "Let's start with basics so I can personalize your guidance.";
    case 1:
      return "These help me set realistic targets for you.";
    case 2:
      return "Tell me the main outcome you want so I can optimize recommendations.";
    case 3:
      return "This is the most important part for safe guidance.";
    case 4:
      return "Let me know your hard food boundaries so I never suggest the wrong thing.";
    case 5:
      return "Default meal check-ins are 9am, 1pm, and 7pm. We'll personalize as we learn your schedule.";
    case 6:
      return "Review your profile before we start chat.";
    default:
      return "";
  }
}
