"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingAnswers } from "@/lib/onboarding/types";

type Props = { firstName: string };

type Draft = Partial<OnboardingAnswers>;

const STEPS = ["Basics", "Body", "Goal", "Medical", "Food boundaries", "How you eat"] as const;

export function ChatOnboardingFlow({ firstName }: Props) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    name: firstName,
    age: 25,
    gender: "prefer-not-to-say",
    height_cm: 165,
    weight_kg: 65,
    primary_goal: "maintain",
    conditions: [],
    dietary_pattern: "none",
    allergies: [],
    meal_times: {
      breakfast: "08:00",
      lunch: "13:00",
      dinner: "20:00",
    },
    eating_context: "mixed",
    estimation_preference: "midpoint",
  });

  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

  function next() {
    if (step === 0 && (!draft.name || draft.name.trim().length < 2)) {
      setError("Please share a name with at least 2 letters.");
      return;
    }

    if (step === 3 && !draft.conditions) {
      setError("Please choose at least 'none' by leaving conditions empty.");
      return;
    }

    setError(null);
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 0));
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
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">What should I call you?</Label>
                <Input
                  id="name"
                  value={draft.name ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={draft.age ?? 25}
                    onChange={(e) => setDraft((d) => ({ ...d, age: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={draft.gender}
                    onValueChange={(value: OnboardingAnswers["gender"]) => setDraft((d) => ({ ...d, gender: value }))}
                  >
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
          )}

          {step > 0 && (
            <p className="text-sm text-muted-foreground">
              This checkpoint UI is intentionally lightweight for now. We&apos;ll wire full validation, parser integration,
              and persistence in the next tasks.
            </p>
          )}

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={back} disabled={step === 0}>Back</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>Next</Button>
            ) : (
              <Button asChild>
                <Link href="/chat">Finish and open chat</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function getPrompt(step: number): string {
  switch (step) {
    case 0:
      return "Let's start with basics so I can personalize your guidance.";
    case 1:
      return "These numbers help me set realistic calorie and macro ranges.";
    case 2:
      return "Tell me the main outcome you want so I can optimize recommendations.";
    case 3:
      return "This is the most important part for safe guidance.";
    case 4:
      return "Let me know your hard food boundaries so I never suggest the wrong thing.";
    case 5:
      return "Last step — this helps me set context-aware reminders and estimates.";
    default:
      return "";
  }
}
