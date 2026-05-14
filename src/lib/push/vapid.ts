const VAPID_PUBLIC_KEY_NAME = "NEXT_PUBLIC_VAPID_PUBLIC_KEY";

export function getPublicVapidKey(): string | null {
  const key = process.env[VAPID_PUBLIC_KEY_NAME]?.trim();
  return key && key.length > 0 ? key : null;
}

export function requirePublicVapidKey(): string {
  const key = getPublicVapidKey();
  if (!key) {
    throw new Error(`${VAPID_PUBLIC_KEY_NAME} is required for browser push subscription.`);
  }
  return key;
}
