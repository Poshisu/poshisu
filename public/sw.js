// Nourish service worker — minimal scaffold for Phase 0.4.
// Real VAPID + subscription flow lands in Phase 5.2. This file only wires the
// receive + click handlers so push delivery can be turned on without a code
// change on the client.

// Push payload schema is enforced here so a compromised sender can't flood
// notifications with oversized strings or cross-origin redirect URLs.
const MAX_TEXT_LEN = 160;

function safeString(value, max) {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(0, max) : value;
}

// Only allow same-origin navigation targets from push payloads. Anything else
// falls back to /chat — we never hand an attacker-controlled URL to
// clients.navigate() or clients.openWindow().
function safePath(raw) {
  if (typeof raw !== "string" || raw.length === 0) return "/chat";
  try {
    const parsed = new URL(raw, self.location.origin);
    if (parsed.origin !== self.location.origin) return "/chat";
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return "/chat";
  }
}

self.addEventListener("install", () => {
  // Don't skipWaiting — we want the standard SW lifecycle so an in-flight user
  // session isn't yanked onto a new worker version mid-action. The next SW
  // activates on the user's next cold load, which is fine for our use case.
});

self.addEventListener("activate", (event) => {
  // Claim open clients so this SW controls them as soon as it activates,
  // without forcing a reload.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Nourish", body: event.data.text() };
  }

  const title = safeString(payload?.title, MAX_TEXT_LEN) || "Nourish";
  const body = safeString(payload?.body, MAX_TEXT_LEN);
  const tag = safeString(payload?.tag, 64) || undefined;
  const url = safePath(payload?.url);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = safePath(event.notification.data?.url);

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          await client.focus();
          if (client.url !== self.location.origin + targetUrl) {
            try {
              await client.navigate(targetUrl);
            } catch {
              break;
            }
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
