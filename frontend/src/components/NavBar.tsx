"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, FileText, Home, MessageCircle, Settings, Wrench, type LucideIcon } from "lucide-react";
import { homeFor, useAuth, type Role } from "@/lib/auth";
import { useUnreadCount } from "@/lib/useNotifications";
import { UnreadBadge, useMessageAlerts } from "@/components/MessageAlerts";

type NavLink = { href: string; label: string; icon: LucideIcon; exact?: boolean };

// Each role's tabs. "Home" is always that role's main screen.
const LINKS: Record<Role, NavLink[]> = {
  tenant: [
    { href: "/tenant", label: "Home", icon: Home, exact: true },
    { href: "/tenant/messages", label: "Messages", icon: MessageCircle },
    { href: "/tenant/lease", label: "Lease", icon: FileText },
    { href: "/tenant/settings", label: "Settings", icon: Settings },
  ],
  landlord: [
    { href: "/landlord", label: "Home", icon: Home, exact: true },
    { href: "/landlord/settings", label: "Settings", icon: Settings },
  ],
};

export default function NavBar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const unread = useUnreadCount(user?.role === "tenant" ? user.id : null);
  const unreadMessages = useMessageAlerts()?.badge ?? 0;

  const links = user ? LINKS[user.role] : [];
  // A request page or the report form still belongs to "Home".
  const isActive = (l: NavLink) =>
    l.exact
      ? pathname === l.href || (pathname.startsWith(`${l.href}/`) && !links.some((o) => !o.exact && pathname.startsWith(o.href)))
      : pathname.startsWith(l.href);

  return (
    <header className="border-b border-line bg-surface" data-role={user?.role}>
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 sm:px-8">
        <Link
          href={user ? homeFor(user.role) : "/"}
          aria-label={user ? "FixFlow, go to your home screen" : "FixFlow home"}
          className="group/logo mr-auto inline-flex min-h-11 items-center gap-2.5 font-[family-name:var(--font-heading)] text-xl font-bold"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-accent text-on-accent transition-transform duration-500 ease-(--ease-out) group-hover/logo:-rotate-12">
            <Wrench className="size-5" aria-hidden />
          </span>
          FixFlow
        </Link>

        {links.length > 0 && (
          <ul
            className={`order-last grid w-full gap-1 md:order-none md:flex md:w-auto ${
              links.length === 4 ? "grid-cols-4" : "grid-cols-2"
            }`}
          >
            {links.map((l) => {
              const active = isActive(l);
              const Icon = l.icon;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-sm font-semibold transition-colors duration-200 sm:flex-row sm:gap-2 sm:px-3 sm:text-base ${
                      active ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-sunken hover:text-fg"
                    }`}
                  >
                    <span className="relative">
                      <Icon className="size-5 shrink-0" aria-hidden />
                      {l.label === "Messages" && (
                        <UnreadBadge count={unreadMessages} className="absolute -top-2 -right-3 sm:hidden" />
                      )}
                    </span>
                    {l.label}
                    {l.label === "Messages" && <UnreadBadge count={unreadMessages} className="hidden sm:grid" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {user?.role === "tenant" && (
          <Link
            href="/tenant/notifications"
            aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
            className={`relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-colors ${
              pathname.startsWith("/tenant/notifications")
                ? "bg-accent-soft text-accent-ink"
                : "text-muted hover:bg-sunken hover:text-fg"
            }`}
          >
            {/* key on the count: the bell swings and the badge pops each time something new arrives */}
            <Bell key={`bell-${unread}`} className={`size-5 origin-top ${unread > 0 ? "animate-swing" : ""}`} aria-hidden />
            {unread > 0 && (
              <span
                key={`badge-${unread}`}
                className="tabular absolute top-1.5 right-1 grid min-w-5 animate-pop place-items-center rounded-full bg-danger px-1 text-xs font-bold text-white dark:text-[#1a0806]"
              >
                {unread}
              </span>
            )}
          </Link>
        )}

        {!user && pathname !== "/login" && (
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-xl px-4 text-base font-semibold text-fg hover:bg-sunken"
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
