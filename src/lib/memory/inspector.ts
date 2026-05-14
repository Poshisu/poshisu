import { createClient } from "@/lib/supabase/server";

export type MemoryLayer = "profile" | "patterns" | "context" | "semantic" | "daily" | "weekly" | "monthly";

export type ProfileMemoryRow = {
  id: string;
  layer: MemoryLayer;
  key: string;
  title: string;
  description: string;
  content: string;
  version: number;
  editable: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProfileMemoryAuditRow = {
  id: string;
  memoryId: string;
  layer: MemoryLayer;
  key: string;
  version: number;
  changedAt: string;
  changedBy: string;
};

export type ProfileMemoryInspectorViewModel = {
  user: {
    id: string;
    email?: string;
    firstName: string;
  } | null;
  memories: ProfileMemoryRow[];
  auditHistory: ProfileMemoryAuditRow[];
};

type RawMemoryRow = {
  id: string;
  layer: MemoryLayer;
  key: string;
  content: string;
  version: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type RawHistoryRow = {
  id: string;
  memory_id: string;
  layer: MemoryLayer;
  key: string;
  version: number;
  changed_at: string;
  changed_by: string;
};

const layerRank: Record<MemoryLayer, number> = {
  profile: 0,
  patterns: 1,
  context: 2,
  semantic: 3,
  daily: 4,
  weekly: 5,
  monthly: 6,
};

const layerCopy: Record<MemoryLayer, { title: string; description: string; editable: boolean }> = {
  profile: {
    title: "Profile",
    description: "Stable profile, goals, preferences, and safety-relevant onboarding facts.",
    editable: true,
  },
  patterns: {
    title: "Patterns",
    description: "Recurring eating, logging, timing, and behavior patterns Nourish has inferred.",
    editable: true,
  },
  context: {
    title: "Context",
    description: "Short-lived context that may expire after it stops being useful.",
    editable: false,
  },
  semantic: {
    title: "Semantic dictionary",
    description: "Personal terms and aliases such as “usual chai” or home-food shorthand.",
    editable: false,
  },
  daily: {
    title: "Daily memory",
    description: "Day-level summaries and recent state used for continuity.",
    editable: false,
  },
  weekly: {
    title: "Weekly memory",
    description: "Weekly rollups and longer-running trends.",
    editable: false,
  },
  monthly: {
    title: "Monthly memory",
    description: "Monthly rollups and durable trend context.",
    editable: false,
  },
};

function firstNameFromUser(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const metadataName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : undefined;
  return metadataName?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";
}

function mapMemory(row: RawMemoryRow): ProfileMemoryRow {
  const copy = layerCopy[row.layer];
  return {
    id: row.id,
    layer: row.layer,
    key: row.key,
    title: copy.title,
    description: copy.description,
    content: row.content,
    version: row.version,
    editable: copy.editable && row.key === "main",
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHistory(row: RawHistoryRow): ProfileMemoryAuditRow {
  return {
    id: row.id,
    memoryId: row.memory_id,
    layer: row.layer,
    key: row.key,
    version: row.version,
    changedAt: row.changed_at,
    changedBy: row.changed_by,
  };
}

export async function loadProfileMemoryInspector(): Promise<ProfileMemoryInspectorViewModel> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, memories: [], auditHistory: [] };
  }

  const memoriesResult = await supabase
    .from("memories" as never)
    .select("id, layer, key, content, version, expires_at, created_at, updated_at" as never)
    .eq("user_id" as never, user.id as never)
    .order("layer" as never, { ascending: true } as never);

  const historyResult = await supabase
    .from("memories_history" as never)
    .select("id, memory_id, layer, key, version, changed_at, changed_by" as never)
    .eq("user_id" as never, user.id as never)
    .order("changed_at" as never, { ascending: false } as never)
    .limit(12);

  const rawMemories = memoriesResult.error || !memoriesResult.data ? [] : (memoriesResult.data as unknown as RawMemoryRow[]);
  const rawHistory = historyResult.error || !historyResult.data ? [] : (historyResult.data as unknown as RawHistoryRow[]);

  const memories = rawMemories
    .map(mapMemory)
    .sort((left, right) => {
      const rankDiff = layerRank[left.layer] - layerRank[right.layer];
      if (rankDiff !== 0) return rankDiff;
      return left.key.localeCompare(right.key);
    });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: firstNameFromUser(user),
    },
    memories,
    auditHistory: rawHistory.map(mapHistory),
  };
}
