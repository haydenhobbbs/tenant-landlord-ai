"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BellOff, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/useNotifications";

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationsView() {
  const { user } = useAuth();
  const { items, loaded, markAllRead } = useNotifications(user?.id);
  const unread = items.filter((n) => !n.read).length;

  // Opening this screen counts as reading them (after a moment, so the
  // "new" dots are visible first).
  useEffect(() => {
    if (!unread) return;
    const t = setTimeout(markAllRead, 2500);
    return () => clearTimeout(t);
  }, [unread, markAllRead]);

  return (
    <div className="stagger mx-auto max-w-3xl">
      <PageHeader title="Notifications" intro="Updates about your repairs and messages." />

      {!loaded && (
        <div className="space-y-3" aria-label="Loading notifications">
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
        </div>
      )}

      {loaded && items.length === 0 && (
        <div className="flex animate-rise flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line p-10 text-center">
          <BellOff className="size-10 text-muted" aria-hidden />
          <p className="text-lg font-semibold">Nothing new</p>
          <p className="text-base text-muted">We&apos;ll let you know here when something changes.</p>
        </div>
      )}

      {items.length > 0 && (
        <ul className="stagger divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          {items.map((n) => {
            const content = (
              <>
                <span
                  aria-hidden
                  className={`mt-2.5 size-2.5 shrink-0 rounded-full transition-[background-color,transform] duration-500 ${n.read ? "scale-50 bg-transparent" : "bg-accent"}`}
                />
                <span className="flex-1">
                  <span className={`block text-lg ${n.read ? "" : "font-bold"}`}>{n.message}</span>
                  <span className="block text-base text-muted">
                    {!n.read && <span className="sr-only">New. </span>}
                    {timeAgo(n.createdAt)}
                  </span>
                </span>
                {n.link && <ChevronRight className="mt-1 size-6 shrink-0 text-muted transition-transform duration-300 ease-(--ease-out) group-hover:translate-x-1 group-hover:text-accent-ink" aria-hidden />}
              </>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} className="group flex gap-4 p-5 transition-colors duration-200 hover:bg-sunken">
                    {content}
                  </Link>
                ) : (
                  <div className="flex gap-4 p-5">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
