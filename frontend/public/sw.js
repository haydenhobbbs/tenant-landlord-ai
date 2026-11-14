self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  event.waitUntil(self.registration.showNotification(data.title || "Tenly", {
    body: data.body || "You have a new update in Tenly.",
    icon: "/icon-192.png",
    data: { url: data.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    let url = new URL("/", self.location.origin);
    try {
      const target = new URL(event.notification.data?.url || "/", self.location.origin);
      if (target.origin === self.location.origin) url = target;
    } catch {}
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const exact = clients.find((client) => client.url === url.href);
    if (exact) return exact.focus();
    const existing = clients.find((client) => new URL(client.url).origin === url.origin);
    if (existing) {
      try {
        const navigated = await existing.navigate(url.href);
        if (navigated) return navigated.focus();
      } catch {}
    }
    return self.clients.openWindow(url.href);
  })());
});
