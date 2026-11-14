"use client";

// 🔔 New-message alerts for tenants and landlords.
//
//  - Checks for unread chat messages every 4 seconds.
//  - `useMessageAlerts().badge` is the red number on "Messages":
//      landlord → how many tenants have unread messages (Sally = 1, + Billy = 2)
//      tenant   → how many unread messages from the landlord
//  - Pops up a card when a new message arrives (unless that conversation is
//    already open on screen), with a button to open it.
//  - ChatThread calls markRead() when a conversation is open.

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MessageCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { UnreadThread } from "@/lib/types";

interface Alerts {
  threads: UnreadThread[];
  badge: number;
  refresh(): void;
  markRead(tenantId: string): Promise<void>;
  setOpenThread(tenantId: string | null): void;
}

const Ctx = createContext<Alerts | null>(null);

interface Toast {
  id: string;
  tenantId: string;
  from: string;
  body: string;
}

const POLL_MS = 4000;
const TOAST_MS = 8000;

export function MessageAlertsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<UnreadThread[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef<Set<string> | null>(null); // message ids we've already alerted about
  const openThread = useRef<string | null>(null);

  const role = user?.role;
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!role || !userId) return;
    const qs = role === "landlord" ? "role=landlord" : `role=tenant&tenantId=${encodeURIComponent(userId)}`;
    try {
      const res = await fetch(`/api/messages/unread?${qs}`, { cache: "no-store" });
      if (!res.ok) return;
      const list: UnreadThread[] = await res.json();
      setThreads(list);

      // First load: remember what's already there, don't pop up for old messages.
      if (seen.current === null) {
        seen.current = new Set(list.map((t) => t.latestId));
        return;
      }
      const fresh = list.filter((t) => !seen.current!.has(t.latestId) && t.tenantId !== openThread.current);
      list.forEach((t) => seen.current!.add(t.latestId));
      if (fresh.length) {
        setToasts((cur) =>
          [
            ...fresh.map((t) => ({ id: t.latestId, tenantId: t.tenantId, from: t.fromName || "Your landlord", body: t.latestBody })),
            ...cur,
          ].slice(0, 3),
        );
      }
    } catch {}
  }, [role, userId]);

  useEffect(() => {
    seen.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the signed-in person changes
    setThreads([]);
    setToasts([]);
    if (!role) return;
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [role, userId, load]);

  const markRead = useCallback(
    async (tenantId: string) => {
      if (!role) return;
      setThreads((list) => list.filter((t) => t.tenantId !== tenantId));
      setToasts((list) => list.filter((t) => t.tenantId !== tenantId));
      await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, reader: role }),
      }).catch(() => null);
    },
    [role],
  );

  const setOpenThread = useCallback((tenantId: string | null) => {
    openThread.current = tenantId;
  }, []);

  const badge = role === "landlord" ? threads.length : threads.reduce((n, t) => n + t.count, 0);

  const value = useMemo(
    () => ({ threads, badge, refresh: load, markRead, setOpenThread }),
    [threads, badge, load, markRead, setOpenThread],
  );

  const dismiss = (id: string) => setToasts((list) => list.filter((t) => t.id !== id));

  return (
    <Ctx.Provider value={value}>
      {children}
      {role && (
        <div
          aria-live="polite"
          data-role={role}
          className="pointer-events-none fixed inset-x-4 top-20 z-50 flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6"
        >
          {toasts.map((t) => (
            <ToastCard
              key={t.id}
              toast={t}
              href={role === "landlord" ? `/landlord/messages?tenant=${encodeURIComponent(t.tenantId)}` : "/tenant/messages"}
              onClose={() => dismiss(t.id)}
            />
          ))}
        </div>
      )}
    </Ctx.Provider>
  );
}

function ToastCard({ toast, href, onClose }: { toast: Toast; href: string; onClose(): void }) {
  const [paused, setPaused] = useState(false);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  // Disappears on its own after a while; hovering or focusing it keeps it open.
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => close.current(), TOAST_MS);
    return () => clearTimeout(t);
  }, [paused]);

  const preview = toast.body.length > 90 ? `${toast.body.slice(0, 90)}…` : toast.body;

  return (
    <div
      role="status"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm animate-slide-in-right gap-4 rounded-xl border border-line bg-surface p-4 shadow-raised"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full border border-accent-edge bg-accent text-on-accent">
        <MessageCircle className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-base font-bold">New message from {toast.from}</p>
        <p className="text-base break-words whitespace-pre-line text-muted">{preview}</p>
        <Link
          href={href}
          onClick={onClose}
          className="inline-flex min-h-11 items-center text-base font-semibold text-accent-ink underline underline-offset-4"
        >
          Open conversation
        </Link>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-muted hover:bg-sunken hover:text-fg"
      >
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}

export function useMessageAlerts() {
  return useContext(Ctx);
}

// The little red number. Renders nothing at 0.
export function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      key={count}
      aria-label={`${count} unread`}
      className={`tabular grid h-5 min-w-5 animate-pop place-items-center rounded-full bg-[#e5484d] px-1.5 text-xs leading-none font-bold text-white ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
