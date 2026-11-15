"use client";

// 📱 Phone-only tab bar along the bottom of the screen, where thumbs reach.
// Desktop keeps the tabs in the top bar (NavBar). Hidden during "Report a
// problem", which pins its own Back/Next buttons to the bottom.
//
// While it shows, <html> gets the "has-tabbar" class so pages leave room
// for it at the bottom (see globals.css).

import Link from "next/link";
import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { UnreadBadge } from "@/components/MessageAlerts";

// `also`: other pages that belong to this tab (e.g. More covers Settings).
type Tab = { href: string; label: string; icon: LucideIcon; exact?: boolean; also?: string[] };

const HIDE_ON = ["/tenant/report"];

export function BottomTabBar({
  links,
  unreadMessages,
  pathname,
  role,
}: {
  links: Tab[];
  unreadMessages: number;
  pathname: string;
  role: "tenant" | "landlord";
}) {
  const hidden = HIDE_ON.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("has-tabbar", !hidden);
    return () => root.classList.remove("has-tabbar");
  }, [hidden]);

  if (hidden) return null;

  // "Home" stays lit on pages that belong to it (a repair, the report form).
  const owned = (p: string) => links.some((o) => o.also?.some((a) => p.startsWith(a)));
  const isActive = (t: Tab) =>
    !!t.also?.some((a) => pathname.startsWith(a)) ||
    (t.exact
      ? pathname === t.href ||
        (pathname.startsWith(`${t.href}/`) && !owned(pathname) && !links.some((o) => !o.exact && pathname.startsWith(o.href)))
      : pathname.startsWith(t.href));

  return (
    <nav
      aria-label="Main"
      data-role={role}
      className="fixed inset-x-0 bottom-0 z-40 w-full max-w-[100vw] border-t border-line bg-surface/95 pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
        {links.map((t) => {
          const active = isActive(t);
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-[3.25rem] flex-col items-center justify-start gap-1 pt-2 pb-0.5 text-[0.75rem] leading-tight font-semibold transition-colors ${
                  active ? "text-accent-ink" : "text-muted"
                }`}
              >
                <span className="relative">
                  <Icon className="size-[1.4rem]" strokeWidth={active ? 2.4 : 2} aria-hidden />
                  {t.label === "Messages" && <UnreadBadge count={unreadMessages} className="absolute -top-1.5 -right-3" />}
                </span>
                {/* never wider than its column, so all tabs stay on screen */}
                <span className="block max-w-full truncate px-0.5">{t.label}</span>
                <span
                  aria-hidden
                  className={`absolute top-0 h-1 w-10 rounded-b-full transition-colors ${active ? "bg-accent" : "bg-transparent"}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
