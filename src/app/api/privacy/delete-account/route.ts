import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
});

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
    return jsonError(401, "UNAUTHORIZED", "You must be signed in to delete your account.", requestId);
  }

  const parsedJson = await parseJson(request, requestId);
  if (parsedJson.response) return parsedJson.response;

  const parsedBody = deleteAccountSchema.safeParse(parsedJson.body);
  if (!parsedBody.success) {
    return jsonError(400, "CONFIRMATION_REQUIRED", "Type DELETE to confirm account deletion.", requestId);
  }

  let adminSupabase: ReturnType<typeof createAdminClient>;
  try {
    adminSupabase = createAdminClient();
  } catch {
    return jsonError(500, "ACCOUNT_DELETE_UNAVAILABLE", "Account deletion is temporarily unavailable. Please try again later.", requestId);
  }

  const { error: deleteError } = await adminSupabase.rpc("delete_account_cascade" as never, { p_user_id: user.id } as never);
  if (deleteError) {
    return jsonError(500, "ACCOUNT_DELETE_FAILED", "Could not delete your account. Please try again.", requestId);
  }

  await supabase.auth.signOut();

  return Response.json({ ok: true, requestId, data: { deletedUserId: user.id } }, { headers: { "cache-control": "no-store" } });
}
