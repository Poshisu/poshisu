import { randomUUID } from "node:crypto";
import { pushUnsubscribeSchema } from "@/lib/push/subscription";
import { createClient } from "@/lib/supabase/server";

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
    return jsonError(401, "UNAUTHORIZED", "You must be signed in to disable push notifications.", requestId);
  }

  const parsedJson = await parseJson(request, requestId);
  if (parsedJson.response) return parsedJson.response;

  const parsed = pushUnsubscribeSchema.safeParse(parsedJson.body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Push unsubscribe payload is invalid.", requestId);
  }

  const { data, error } = await supabase
    .from("push_subscriptions" as never)
    .delete()
    .eq("user_id" as never, user.id as never)
    .eq("endpoint" as never, parsed.data.endpoint as never)
    .select("id, endpoint" as never);

  if (error) {
    return jsonError(500, "PUSH_UNSUBSCRIBE_FAILED", "Could not remove push subscription. Please try again.", requestId);
  }

  const removed = Array.isArray(data) ? data.length : 0;
  return Response.json({ ok: true, requestId, data: { removed } });
}
