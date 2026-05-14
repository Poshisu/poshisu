import { randomUUID } from "node:crypto";
import { getPublicVapidKey } from "@/lib/push/vapid";

function jsonError(status: number, code: string, message: string, requestId: string) {
  return Response.json({ ok: false, error: { code, message }, requestId }, { status });
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const publicKey = getPublicVapidKey();

  if (!publicKey) {
    return jsonError(503, "PUSH_NOT_CONFIGURED", "Push notifications are not configured yet.", requestId);
  }

  return Response.json({ ok: true, requestId, data: { publicKey } });
}
