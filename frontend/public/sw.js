self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  const target = new URL(data.url || "/", self.location.origin);
  const url = target.origin === self.location.origin ? target.href : self.location.origin;
  event.waitUntil(self.registration.showNotification("Tenly", {
    body: data.body || "You have a new update.",
    icon: "/icons/tenly-192.png",
    badge: "/icons/tenly-192.png",
    data: { url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.location.origin;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows.find((client) => client.url === url);
    if (open) return open.focus();
    return clients.openWindow(url);
  })());
});
