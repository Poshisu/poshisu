import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

type ExportTable =
  | "users"
  | "user_profiles"
  | "user_features"
  | "meals"
  | "messages"
  | "correction_log"
  | "memories"
  | "memories_history"
  | "water_logs"
  | "agent_traces"
  | "rate_limits"
  | "nudge_schedules"
  | "nudge_queue"
  | "push_subscriptions";

const exportTables: ExportTable[] = [
  "users",
  "user_profiles",
  "user_features",
  "meals",
  "messages",
  "correction_log",
  "memories",
  "memories_history",
  "water_logs",
  "agent_traces",
  "rate_limits",
  "nudge_schedules",
  "nudge_queue",
  "push_subscriptions",
];

function jsonError(status: number, code: string, message: string, requestId: string) {
  return Response.json({ ok: false, error: { code, message }, requestId }, { status });
}

function userFilterColumn(table: ExportTable) {
  return table === "users" ? "id" : "user_id";
}

function orderColumn(table: ExportTable) {
  const columns: Partial<Record<ExportTable, string>> = {
    meals: "logged_at",
    water_logs: "logged_at",
    memories_history: "changed_at",
    nudge_queue: "scheduled_for",
  };
  return columns[table] ?? "created_at";
}

function maybeOrder(table: ExportTable, query: unknown) {
  if (table === "rate_limits") return query;
  const orderable = query as { order?: (column: string, options: { ascending: boolean }) => unknown };
  return orderable.order ? orderable.order(orderColumn(table), { ascending: true }) : query;
}

function redactPushSubscriptions(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    endpoint_redacted: typeof row.endpoint === "string" && row.endpoint.length > 0,
    p256dh_redacted: typeof row.p256dh === "string" && row.p256dh.length > 0,
    auth_redacted: typeof row.auth === "string" && row.auth.length > 0,
    user_agent: row.user_agent ?? null,
    created_at: row.created_at ?? null,
    last_used_at: row.last_used_at ?? null,
  }));
}

async function readUserTable(supabase: Awaited<ReturnType<typeof createClient>>, table: ExportTable, userId: string) {
  const query = supabase
    .from(table as never)
    .select("*" as never)
    .eq(userFilterColumn(table) as never, userId as never);
  const { data, error } = (await maybeOrder(table, query)) as { data: Array<Record<string, unknown>> | null; error: Error | null };
  if (error) throw error;
  const rows = data ?? [];
  return table === "push_subscriptions" ? redactPushSubscriptions(rows) : rows;
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError(401, "UNAUTHORIZED", "You must be signed in to export your data.", requestId);
  }

  try {
    const data = Object.fromEntries(
      await Promise.all(exportTables.map(async (table) => [table, await readUserTable(supabase, table, user.id)])),
    ) as Record<ExportTable, Array<Record<string, unknown>>>;

    const payload = {
      ok: true,
      requestId,
      export: {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        subject: {
          userId: user.id,
          email: user.email ?? null,
        },
        redactions: {
          push_subscriptions: ["endpoint", "p256dh", "auth"],
        },
        data,
      },
    };

    return Response.json(payload, {
      headers: {
        "content-disposition": `attachment; filename="nourish-data-export-${user.id}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch {
    return jsonError(500, "EXPORT_FAILED", "Could not export your data. Please try again.", requestId);
  }
}
