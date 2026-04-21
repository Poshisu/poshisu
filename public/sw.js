// Nourish service worker — minimal scaffold for Phase 0.4.
// Real VAPID + subscription flow lands in Phase 5.2. This file only wires the
// receive + click handlers so push delivery can be turned on without a code
// change on the client.

self.addEventListener("install", (event) => {
  // Take over as soon as the user installs — there is no prior SW to replace.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Claim open clients so the SW controls them without a reload.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Fallback: treat the payload as plain text so a malformed push still shows.
    payload = { title: "Nourish", body: event.data.text() };
  }

  const { title = "Nourish", body = "", url = "/chat", tag } = payload;

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
  const targetUrl = event.notification.data?.url || "/chat";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Focus an existing tab on our origin if there is one.
      for (const client of all) {
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          await client.focus();
          if (client.url !== self.location.origin + targetUrl) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // Some browsers disallow SW navigate; fall back to a new tab below.
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
