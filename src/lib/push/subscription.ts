import { z } from "zod";

const pushEndpointSchema = z.string().trim().url().max(2048).refine((value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Push subscription endpoint must use HTTPS.");

const pushKeySchema = z.string().trim().min(16).max(512).regex(/^[A-Za-z0-9_-]+={0,2}$/);

export const pushSubscriptionPayloadSchema = z.object({
  endpoint: pushEndpointSchema,
  expirationTime: z.number().int().nonnegative().nullable().optional(),
  keys: z.object({
    p256dh: pushKeySchema,
    auth: pushKeySchema,
  }),
});

export const pushSubscribeSchema = z.object({
  subscription: pushSubscriptionPayloadSchema,
});

export const pushUnsubscribeSchema = z.object({
  endpoint: pushEndpointSchema,
});

export type PushSubscriptionPayload = z.infer<typeof pushSubscriptionPayloadSchema>;

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_used_at: string | null;
};

export function toPushSubscriptionResponse(row: PushSubscriptionRow) {
  return {
    id: row.id,
    endpoint: row.endpoint,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}
