"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, HeartHandshake, MessageCircle, Save, ShieldAlert, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileMemoryInspectorViewModel, ProfileMemoryRow } from "@/lib/memory/inspector";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function layerLabel(memory: ProfileMemoryRow) {
  return `${memory.title} notes`;
}

function friendlyMemoryDescription(memory: ProfileMemoryRow) {
  if (memory.layer === "profile") return "Your goals, preferences, allergies, and other basics Nourish should remember.";
  if (memory.layer === "patterns") return "Eating patterns Nourish has noticed and can use to make logging easier.";
  if (memory.layer === "context") return "Recent context that helps today’s coaching stay relevant.";
  return memory.description;
}

export function ProfileMemoryDashboard({ data }: { data: ProfileMemoryInspectorViewModel }) {
  const memoryCountLabel = `${data.memories.length} saved ${data.memories.length === 1 ? "note" : "notes"}`;
  const auditCountLabel = `${data.auditHistory.length} recent ${data.auditHistory.length === 1 ? "change" : "changes"}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Hey, {data.user?.firstName ?? "there"}</p>
          <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">What Nourish knows about you</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Review the preferences and patterns Nourish uses to make meal logging easier. You can edit the notes that affect your everyday experience.
          </p>
          {data.user?.email ? <p className="text-xs text-muted-foreground">Signed in as {data.user.email}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{memoryCountLabel}</Badge>
          <Badge variant="outline">{auditCountLabel}</Badge>
        </div>
      </header>

      <section aria-label="Memory safety notes" className="grid gap-3 md:grid-cols-3">
        <SafetyCard
          icon={<ShieldCheck aria-hidden="true" />}
          title="Private to you"
          body="These notes are shown only for your signed-in Nourish account."
        />
        <SafetyCard
          icon={<HeartHandshake aria-hidden="true" />}
          title="Easy to correct"
          body="If something feels wrong, update the editable notes so future estimates fit you better."
        />
        <SafetyCard
          icon={<Sparkles aria-hidden="true" />}
          title="Used for better logging"
          body="Nourish uses these preferences and patterns to reduce repeated questions."
        />
      </section>

      <PrivacyControls />

      {data.memories.length === 0 ? <EmptyMemoryState /> : (
        <section aria-label="Saved Nourish notes" className="grid gap-4 xl:grid-cols-2">
          {data.memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </section>
      )}

      <section aria-label="Recent note changes" className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="surface-card rounded-2xl">
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2"><Sparkles aria-hidden="true" /> Recent changes</CardTitle>
            <CardDescription>A simple history of notes Nourish has updated for you.</CardDescription>
          </CardHeader>
        </Card>
        {data.auditHistory.length === 0 ? (
          <Card className="surface-card rounded-2xl border-dashed">
            <CardContent className="pt-6 text-sm text-muted-foreground">No note changes yet.</CardContent>
          </Card>
        ) : (
          <Card className="surface-card rounded-2xl">
            <CardContent className="pt-6">
              <ul aria-label="Recent note changes" className="space-y-3">
                {data.auditHistory.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-border bg-secondary/40 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{entry.layer === "profile" ? "Profile notes" : entry.layer === "patterns" ? "Eating patterns" : "Nourish notes"}</span>
                      <Badge variant="secondary">Updated by Nourish</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Changed {formatDateTime(entry.changedAt)}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function SafetyCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="surface-card rounded-2xl">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">{icon}{title}</div>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function PrivacyControls() {
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<"idle" | "deleting" | "deleted" | "error">("idle");
  const [message, setMessage] = useState("");
  const canDelete = confirmation === "DELETE" && status !== "deleting";

  async function deleteAccount() {
    if (!canDelete) return;
    setStatus("deleting");
    setMessage("");
    try {
      const response = await fetch("/api/privacy/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not delete your account. Please try again.");
      setStatus("deleted");
      setMessage("Account deletion started. You will be signed out once it completes.");
      window.setTimeout(() => {
        window.location.assign("/");
      }, 1200);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not delete your account. Please try again.");
    }
  }

  return (
    <section aria-label="Privacy and data controls" className="grid gap-4 lg:grid-cols-2">
      <Card className="surface-card rounded-2xl">
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2"><ShieldCheck aria-hidden="true" /> Privacy & data controls</CardTitle>
          <CardDescription>
            Export your app data as JSON. Push notification endpoint and key material are redacted from exports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild>
            <a href="/api/privacy/export" download>
              <Download aria-hidden="true" />
              Download my data export
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Includes your profile, meals, messages, saved notes, water logs, nudges, and privacy-safe notification details.
          </p>
        </CardContent>
      </Card>

      <Card className="surface-card rounded-2xl border-destructive/40">
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2 text-destructive"><ShieldAlert aria-hidden="true" /> Danger zone</CardTitle>
          <CardDescription>
            Permanently deletes your account and app data. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delete-account-confirmation">Type DELETE to confirm account deletion</Label>
            <Input
              id="delete-account-confirmation"
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value);
                if (status !== "idle") {
                  setStatus("idle");
                  setMessage("");
                }
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-h-5 text-sm text-muted-foreground" role="status" aria-live="polite">
              {status === "deleting" ? "Deleting account…" : message}
            </p>
            <Button type="button" variant="destructive" onClick={deleteAccount} disabled={!canDelete}>
              <Trash2 aria-hidden="true" />
              Permanently delete my account
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function MemoryCard({ memory }: { memory: ProfileMemoryRow }) {
  const [content, setContent] = useState(memory.content);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function saveMemory() {
    if (!memory.editable || status === "saving") return;
    setStatus("saving");
    try {
      const response = await fetch("/api/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layer: memory.layer, key: memory.key, content }),
      });
      if (!response.ok) throw new Error("Memory save failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <article aria-label={layerLabel(memory)} className="surface-card rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{memory.title}</h2>
          <p className="text-sm text-muted-foreground">{friendlyMemoryDescription(memory)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={memory.editable ? "default" : "outline"}>{memory.editable ? "You can edit" : "For reference"}</Badge>
        </div>
      </div>

      <dl className="mb-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div><dt className="font-medium text-foreground">Last updated</dt><dd>{formatDateTime(memory.updatedAt)}</dd></div>
        {memory.expiresAt ? <div><dt className="font-medium text-foreground">Useful until</dt><dd>{formatDateTime(memory.expiresAt)}</dd></div> : null}
      </dl>

      {memory.editable ? (
        <div className="space-y-3">
          <Textarea
            aria-label={`Edit ${memory.title} notes`}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              if (status !== "idle") setStatus("idle");
            }}
            className="min-h-48 text-sm leading-6"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground" role="status">
              {status === "saving" ? "Saving notes…" : null}
              {status === "saved" ? "Notes saved. Nourish will use this going forward." : null}
              {status === "error" ? "Could not save memory. Please retry." : null}
            </p>
            <Button type="button" onClick={saveMemory} disabled={status === "saving" || content.trim().length === 0}>
              <Save aria-hidden="true" />
              Save notes
            </Button>
          </div>
        </div>
      ) : (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-secondary/60 p-4 text-sm leading-6 text-foreground">
          {memory.content}
        </pre>
      )}
    </article>
  );
}

function EmptyMemoryState() {
  return (
    <Card className="surface-card rounded-2xl border-dashed">
      <CardHeader>
        <CardTitle as="h2">No notes saved yet</CardTitle>
        <CardDescription>
          Finish onboarding or log a meal in Chat and Nourish will start learning your preferences and patterns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/chat">
            <MessageCircle aria-hidden="true" />
            Go to Chat
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
