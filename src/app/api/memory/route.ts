import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const memoryLayerSchema = z.enum(["profile", "patterns", "context", "semantic", "daily", "weekly", "monthly"]);
const writableMemoryLayerSchema = z.enum(["profile", "patterns"]);
const memoryKeySchema = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_.:-]+$/);
const memoryContentSchema = z.string().trim().min(1).max(20000);

const memoryQuerySchema = z.object({
  layer: memoryLayerSchema.optional(),
  key: memoryKeySchema.optional(),
}).refine((value) => !value.key || value.layer, {
  message: "A memory key filter requires a layer filter.",
  path: ["key"],
});

const memoryWriteSchema = z.object({
  layer: writableMemoryLayerSchema,
  key: z.literal("main"),
  content: memoryContentSchema,
});

type MemoryRow = {
  id: string;
  user_id: string;
  layer: z.infer<typeof memoryLayerSchema>;
  key: string;
  content: string;
  version: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

function jsonError(status: number, code: string, message: string, requestId: string) {
  return Response.json({ ok: false, error: { code, message }, requestId }, { status });
}

function mapMemory(row: MemoryRow) {
  return {
    id: row.id,
    layer: row.layer,
    key: row.key,
    content: row.content,
    version: row.version,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAuthenticatedUser(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      response: jsonError(401, "UNAUTHORIZED", "You must be signed in to access memory.", requestId),
    };
  }

  return { supabase, user, response: null };
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const { searchParams } = new URL(request.url);
  const parsedQuery = memoryQuerySchema.safeParse({
    layer: searchParams.get("layer") ?? undefined,
    key: searchParams.get("key") ?? undefined,
  });

  if (!parsedQuery.success) {
    return jsonError(400, "VALIDATION_ERROR", "Memory query parameters are invalid.", requestId);
  }

  const { supabase, user, response } = await getAuthenticatedUser(requestId);
  if (response || !user) return response;

  let query = supabase
    .from("memories" as never)
    .select("id, user_id, layer, key, content, version, expires_at, created_at, updated_at" as never)
    .eq("user_id" as never, user.id as never);

  if (parsedQuery.data.layer) {
    query = query.eq("layer" as never, parsedQuery.data.layer as never);
  } else {
    query = query
      .eq("key" as never, "main" as never)
      .in("layer" as never, ["profile", "patterns"] as never);
  }

  if (parsedQuery.data.key) {
    query = query.eq("key" as never, parsedQuery.data.key as never);
  }

  const { data, error } = await query.order("layer" as never, { ascending: true } as never);
  if (error || !data) {
    return jsonError(500, "MEMORY_READ_FAILED", "Could not load memory. Please try again.", requestId);
  }

  const rows = data as unknown as MemoryRow[];
  const memories = rows;

  const sortRank = new Map([
    ["profile/main", 0],
    ["patterns/main", 1],
  ]);

  memories.sort((left, right) => {
    const leftRank = sortRank.get(`${left.layer}/${left.key}`) ?? 99;
    const rightRank = sortRank.get(`${right.layer}/${right.key}`) ?? 99;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return `${left.layer}/${left.key}`.localeCompare(`${right.layer}/${right.key}`);
  });

  return Response.json({ ok: true, requestId, data: { memories: memories.map(mapMemory) } });
}

export async function PUT(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const { supabase, user, response } = await getAuthenticatedUser(requestId);
  if (response || !user) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  const parsedBody = memoryWriteSchema.safeParse(body);
  if (!parsedBody.success) {
    return jsonError(400, "VALIDATION_ERROR", "Memory write payload is invalid.", requestId);
  }

  const payload = {
    user_id: user.id,
    layer: parsedBody.data.layer,
    key: parsedBody.data.key,
    content: parsedBody.data.content,
  };

  const { data, error } = await supabase
    .from("memories" as never)
    .upsert(payload as never, { onConflict: "user_id,layer,key" } as never)
    .select("id, user_id, layer, key, content, version, expires_at, created_at, updated_at" as never)
    .single();

  if (error || !data) {
    return jsonError(500, "MEMORY_WRITE_FAILED", "Could not save memory. Please try again.", requestId);
  }

  return Response.json({ ok: true, requestId, data: { memory: mapMemory(data as unknown as MemoryRow) } });
}
