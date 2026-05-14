"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock3, History, MessageCircle, Save, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  return `${memory.title} memory`;
}

export function ProfileMemoryDashboard({ data }: { data: ProfileMemoryInspectorViewModel }) {
  const memoryCountLabel = `${data.memories.length} memory ${data.memories.length === 1 ? "layer" : "layers"}`;
  const auditCountLabel = `${data.auditHistory.length} audit ${data.auditHistory.length === 1 ? "snapshot" : "snapshots"}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Hey, {data.user?.firstName ?? "there"}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Memory inspector</h1>
          <p className="text-sm text-muted-foreground">
            See what Nourish remembers, where it came from, and what you can safely change.
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
          title="User-scoped"
          body="This view only reads rows owned by the signed-in Supabase user."
        />
        <SafetyCard
          icon={<Save aria-hidden="true" />}
          title="Editable safely"
          body="Only profile and patterns/main can be saved inline; every update goes through the authenticated memory API."
        />
        <SafetyCard
          icon={<History aria-hidden="true" />}
          title="Audit visible"
          body="Recent memory snapshots are shown so changes are not invisible black boxes."
        />
      </section>

      {data.memories.length === 0 ? <EmptyMemoryState /> : (
        <section aria-label="Saved memory layers" className="grid gap-4 xl:grid-cols-2">
          {data.memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </section>
      )}

      <section aria-label="Memory audit" className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="surface-card rounded-2xl">
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2"><Clock3 aria-hidden="true" /> Recent audit trail</CardTitle>
            <CardDescription>Last 12 snapshots from memory updates/deletes.</CardDescription>
          </CardHeader>
        </Card>
        {data.auditHistory.length === 0 ? (
          <Card className="surface-card rounded-2xl border-dashed">
            <CardContent className="pt-6 text-sm text-muted-foreground">No audit snapshots yet.</CardContent>
          </Card>
        ) : (
          <Card className="surface-card rounded-2xl">
            <CardContent className="pt-6">
              <ul aria-label="Memory audit history" className="space-y-3">
                {data.auditHistory.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-border bg-secondary/40 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{entry.layer}/{entry.key}</span>
                      <Badge variant="outline">version {entry.version}</Badge>
                      <Badge variant="secondary">{entry.changedBy}</Badge>
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
          <p className="text-sm text-muted-foreground">{memory.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Version {memory.version}</Badge>
          <Badge variant={memory.editable ? "default" : "outline"}>{memory.editable ? "Editable" : "Read-only"}</Badge>
        </div>
      </div>

      <dl className="mb-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div><dt className="font-medium text-foreground">Key</dt><dd>{memory.key}</dd></div>
        <div><dt className="font-medium text-foreground">Updated</dt><dd>{formatDateTime(memory.updatedAt)}</dd></div>
        {memory.expiresAt ? <div className="sm:col-span-2"><dt className="font-medium text-foreground">Expires</dt><dd>{formatDateTime(memory.expiresAt)}</dd></div> : null}
      </dl>

      {memory.editable ? (
        <div className="space-y-3">
          <Textarea
            aria-label={`Edit ${memory.title} memory`}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              if (status !== "idle") setStatus("idle");
            }}
            className="min-h-48 font-mono text-sm"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground" role="status">
              {status === "saving" ? "Saving memory…" : null}
              {status === "saved" ? "Memory saved. Audit history will show the prior snapshot after refresh." : null}
              {status === "error" ? "Could not save memory. Please retry." : null}
            </p>
            <Button type="button" onClick={saveMemory} disabled={status === "saving" || content.trim().length === 0}>
              <Save aria-hidden="true" />
              Save {memory.title}
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
        <CardTitle as="h2">No memory saved yet</CardTitle>
        <CardDescription>
          Finish onboarding or log a meal in Chat and Nourish will start building your profile, patterns, and personal terms.
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
