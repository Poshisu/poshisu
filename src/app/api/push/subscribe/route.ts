import { randomUUID } from "node:crypto";
import { pushSubscribeSchema, toPushSubscriptionResponse, type PushSubscriptionRow } from "@/lib/push/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const selectColumns = "id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at";

function jsonError(status: number, code: string, message: string, requestId: string) {
  return Response.json({ ok: false, error: { code, message }, requestId }, { status });
}

async function parseJson(request: Request, requestId: string) {
  try {
    return { body: await request.json(), response: null };
  } catch {
    return { body: null, response: jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId) };
  }
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError(401, "UNAUTHORIZED", "You must be signed in to enable push notifications.", requestId);
  }

  const parsedJson = await parseJson(request, requestId);
  if (parsedJson.response) return parsedJson.response;

  const parsed = pushSubscribeSchema.safeParse(parsedJson.body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Push subscription payload is invalid.", requestId);
  }

  const { subscription } = parsed.data;
  const userAgent = request.headers.get("user-agent");

  const adminSupabase = createAdminClient();
  const { error: cleanupError } = await adminSupabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", subscription.endpoint)
    .neq("user_id", user.id);

  if (cleanupError) {
    return jsonError(500, "PUSH_SUBSCRIBE_FAILED", "Could not save push subscription. Please try again.", requestId);
  }

  const row = {
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: userAgent,
    last_used_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("push_subscriptions" as never)
    .upsert(row as never, { onConflict: "user_id,endpoint" } as never)
    .select(selectColumns as never)
    .single();

  if (error || !data) {
    return jsonError(500, "PUSH_SUBSCRIBE_FAILED", "Could not save push subscription. Please try again.", requestId);
  }

  return Response.json(
    { ok: true, requestId, data: { subscription: toPushSubscriptionResponse(data as unknown as PushSubscriptionRow) } },
    { status: 201 },
  );
}
