import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatMealLogger } from "./ChatMealLogger";
import type { ChatMessage, MealCandidateBlock } from "./ChatMealLogger";
import { formatIstDateLabel, getSelectedIstCalendarDate, loadTodayMeals } from "@/lib/meals/today";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Home",
  description: "Your Nourish home for daily nutrition and meal logging.",
};

type ChatPageProps = {
  searchParams?: Promise<{ status?: string; date?: string }> | { status?: string; date?: string };
};

type StoredMessageRow = {
  id: string;
  role: string;
  content: string;
  metadata: unknown;
  created_at: string;
};

type StoredCandidateMetadata = {
  mealCandidate?: {
    candidateBlock?: MealCandidateBlock;
  };
};

function displayNameFromUser(user: { email?: string | null; user_metadata?: Record<string, unknown> | null }) {
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.user_metadata?.first_name;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim().split(/\s+/)[0];
  if (user.email) return user.email.split("@")[0];
  return "there";
}

function isChatRole(role: string): role is ChatMessage["role"] {
  return role === "user" || role === "assistant";
}

function isStoredCandidateMetadata(metadata: unknown): metadata is StoredCandidateMetadata {
  if (!metadata || typeof metadata !== "object") return false;
  const mealCandidate = (metadata as { mealCandidate?: unknown }).mealCandidate;
  if (!mealCandidate || typeof mealCandidate !== "object") return false;
  const candidateBlock = (mealCandidate as { candidateBlock?: unknown }).candidateBlock;
  return Boolean(candidateBlock && typeof candidateBlock === "object" && (candidateBlock as { type?: unknown }).type === "meal_log_candidate");
}

function buildInitialMessages(rows: StoredMessageRow[]): ChatMessage[] {
  return rows
    .filter((row) => isChatRole(row.role) && row.content.trim().length > 0)
    .map((row) => ({ id: row.id, role: row.role as ChatMessage["role"], content: row.content }));
}

function findLatestPendingCandidate(rows: StoredMessageRow[]): MealCandidateBlock | null {
  for (const row of [...rows].reverse()) {
    if (row.role !== "assistant" || !isStoredCandidateMetadata(row.metadata)) continue;
    const candidate = row.metadata.mealCandidate?.candidateBlock;
    if (candidate?.confirmPayload && !candidate.safetyFlags.blocked) {
      return { ...candidate, assistantMessageId: row.id };
    }
  }
  return null;
}

export default async function ChatPage({ searchParams }: ChatPageProps = {}) {
  const params = await searchParams;
  const selectedDate = getSelectedIstCalendarDate(params?.date);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ meals }, { data: rawMessages }] = await Promise.all([
    loadTodayMeals(selectedDate),
    supabase
      .from("messages" as never)
      .select("id, role, content, metadata, created_at" as never)
      .eq("user_id", user.id)
      .eq("kind", "text")
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(40),
  ]);
  const messages = ((rawMessages as unknown as StoredMessageRow[] | null) ?? []).reverse();

  return (
    <ChatMealLogger
      dateLabel={formatIstDateLabel(selectedDate)}
      initialCandidate={params?.status === "saved" || params?.status === "duplicate_ignored" ? null : findLatestPendingCandidate(messages)}
      initialMessages={buildInitialMessages(messages)}
      initialMeals={meals}
      saveStatus={params?.status}
      selectedDate={selectedDate}
      userName={displayNameFromUser(user)}
    />
  );
}
