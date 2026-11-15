"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppNotification } from "./outreach/types";
import { authFetch } from "@/lib/authFetch";

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
      const res = await authFetch(`/api/notifications?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
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

  // C's API marks one at a time (PATCH /api/notifications/:id). userId tells
  // the demo (no real accounts) whose notification it is; keepalive lets the
  // save finish even when tapping the notification opens another page.
  const save = useCallback(
    (id: string) =>
      authFetch(`/api/notifications/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId ?? "")}`, {
        method: "PATCH",
        keepalive: true,
      }).catch(() => null),
    [userId],
  );

  const markRead = useCallback(
    async (id: string) => {
      setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await save(id);
      refreshNotifications();
    },
    [save],
  );

  const markAllRead = useCallback(async () => {
    const unread = items.filter((n) => !n.read);
    if (!unread.length) return;
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    await Promise.all(unread.map((n) => save(n.id)));
    refreshNotifications();
  }, [items, save]);

  return { items, loaded, markRead, markAllRead, reload: load };
}

export function useUnreadCount(userId: string | null | undefined) {
  const { items } = useNotifications(userId);
  return items.filter((n) => !n.read).length;
}
