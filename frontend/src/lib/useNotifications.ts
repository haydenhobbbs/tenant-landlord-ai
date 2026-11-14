"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppNotification } from "./types";

// Notifications for one user, refreshed every 10 seconds.
// Other parts of the app can call window.dispatchEvent(new Event("fixflow:notifications"))
// to refresh right away (e.g. after marking them read).
const EVENT = "fixflow:notifications";

export function refreshNotifications() {
  window.dispatchEvent(new Event(EVENT));
}

export function useNotifications(userId: string | null | undefined) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      if (res.ok) setItems(await res.json());
    } catch {}
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
    const timer = setInterval(load, 10_000);
    window.addEventListener(EVENT, load);
    return () => {
      clearInterval(timer);
      window.removeEventListener(EVENT, load);
    };
  }, [userId, load]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    refreshNotifications();
  }, [userId]);

  return { items, loaded, markAllRead, reload: load };
}

export function useUnreadCount(userId: string | null | undefined) {
  const { items } = useNotifications(userId);
  return items.filter((n) => !n.read).length;
}
