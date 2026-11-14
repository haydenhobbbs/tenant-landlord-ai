"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppNotification } from "./outreach/types";

// Notifications for one user (Teammate C's /api/notifications), refreshed
// every 10 seconds. Call refreshNotifications() to refresh right away.
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

  // C's API marks one at a time (PATCH /api/notifications/:id).
  const markAllRead = useCallback(async () => {
    const unread = items.filter((n) => !n.read);
    if (!unread.length) return;
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    await Promise.all(unread.map((n) => fetch(`/api/notifications/${n.id}`, { method: "PATCH" }).catch(() => null)));
    refreshNotifications();
  }, [items]);

  return { items, loaded, markAllRead, reload: load };
}

export function useUnreadCount(userId: string | null | undefined) {
  const { items } = useNotifications(userId);
  return items.filter((n) => !n.read).length;
}
