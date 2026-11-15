"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, CalendarDays, FileText, Home, LayoutGrid, MessageCircle, Settings, Wrench, UserCheck, type LucideIcon } from "lucide-react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { TenlyLogo } from "@/components/TenlyLogo";
import { homeFor, useAuth, type Role } from "@/lib/auth";
import { useUnreadCount } from "@/lib/useNotifications";
import { UnreadBadge, useMessageAlerts } from "@/components/MessageAlerts";

type NavLink = { href: string; label: string; icon: LucideIcon; exact?: boolean; also?: string[] };

// Each role's tabs. "Home" is always that role's main screen.
const LINKS: Record<Role, NavLink[]> = {
  tenant: [
    { href: "/tenant", label: "Home", icon: Home, exact: true },
    { href: "/tenant/messages", label: "Messages", icon: MessageCircle },
    { href: "/tenant/lease", label: "Lease", icon: FileText },
    { href: "/tenant/settings", label: "Settings", icon: Settings },
  ],
  landlord: [
    // Same top bar as tenants, with every landlord section (Nermin).
    { href: "/landlord", label: "Requests", icon: Wrench, exact: true },
    { href: "/landlord/properties", label: "Properties", icon: Building2 },
    { href: "/landlord/messages", label: "Messages", icon: MessageCircle },
    { href: "/landlord/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/landlord/contractors", label: "Contractors", icon: UserCheck },
    { href: "/landlord/lease", label: "Leases", icon: FileText },
    { href: "/landlord/settings", label: "Settings", icon: Settings },
  ],
};

// Phone bottom tabs (Nermin). Landlords also get Properties + Messages here,
// since the workspace menu scrolls off-screen on a phone.
const PHONE_LINKS: Record<Role, NavLink[]> = {
  tenant: LINKS.tenant,
  landlord: [
    { href: "/landlord", label: "Requests", icon: Wrench, exact: true },
    { href: "/landlord/properties", label: "Homes", icon: Building2 },
    { href: "/landlord/messages", label: "Messages", icon: MessageCircle },
    { href: "/landlord/calendar", label: "Calendar", icon: CalendarDays },
    {
      href: "/landlord/more",
      label: "More",
      icon: LayoutGrid,
      also: ["/landlord/contractors", "/landlord/lease", "/landlord/settings", "/landlord/notifications"],
    },
  ],
};

export default function NavBar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const unread = useUnreadCount(user?.id);
  const unreadMessages = useMessageAlerts()?.badge ?? 0;

  const links = user ? LINKS[user.role] : [];
  // A request page or the report form still belongs to "Home".
  const isActive = (l: NavLink) =>
    l.exact
      ? pathname === l.href || (pathname.startsWith(`${l.href}/`) && !links.some((o) => !o.exact && pathname.startsWith(o.href)))
      : pathname.startsWith(l.href);

  // Proposal C: navy bar in both themes. The logo tile and the active-tab marker
  // use the role's bright color (tenant green, landlord baby blue).
  const roleColor = user?.role === "landlord" ? "var(--landlord)" : "var(--tenant-bright)";

  return (
    <>
    <header
      className="sticky top-0 z-40 border-b border-navy-line bg-navy/95 text-white backdrop-blur"
      data-role={user?.role}
      style={{ "--nav-accent": roleColor } as React.CSSProperties}
    >
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-2.5 sm:px-8">
        <Link
          href={user ? homeFor(user.role) : "/"}
          aria-label={user ? "Tenly, go to your home screen" : "Tenly home"}
          className="group/logo mr-auto inline-flex min-h-11 items-center gap-2.5 font-[family-name:var(--font-heading)] text-[1.35rem] font-bold tracking-tight"
        >
{/* Teammate's logo, recolored for the navy bar: bright role color + navy mark. */}
          <span
            className="contents"
            style={
              {
                "--accent": "var(--nav-accent)",
                "--on-accent": "#0a111d",
                "--accent-ink": user?.role === "landlord" ? "#4d9fc7" : "#1b6b44",
              } as React.CSSProperties
            }
          >
            <TenlyLogo role={user?.role} />
          </span>
          Tenly
        </Link>

        {links.length > 0 && (
          <ul
            className="hidden gap-1 md:flex"
          >
            {links.map((l) => {
              const active = isActive(l);
              const Icon = l.icon;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-sm font-medium transition-colors duration-200 sm:flex-row sm:gap-2 sm:px-3 sm:text-[0.95rem] ${links.length > 4 ? "xl:gap-1.5 xl:px-2.5" : ""} ${
                      active
                        ? "bg-white/10 text-white shadow-[inset_0_-2px_0_var(--nav-accent)]"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="relative">
                      <Icon className="size-5 shrink-0" aria-hidden />
                      {l.label === "Messages" && (
                        <UnreadBadge count={unreadMessages} className={`absolute -top-2 -right-3 ${links.length > 4 ? "xl:hidden" : "sm:hidden"}`} />
                      )}
                    </span>
                    {/* Lots of tabs (landlords): icons only until there's room for words */}
                    <span className={links.length > 4 ? "max-xl:sr-only" : ""}>{l.label}</span>
                    {l.label === "Messages" && (
                      <UnreadBadge count={unreadMessages} className={links.length > 4 ? "hidden xl:grid" : "hidden sm:grid"} />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {user && (
          <Link
            href={`/${user.role}/notifications`}
            aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
            className={`relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors ${
              pathname.startsWith(`/${user.role}/notifications`)
                ? "bg-white/10 text-white shadow-[inset_0_-2px_0_var(--nav-accent)]"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {/* key on the count: the bell swings and the badge pops each time something new arrives */}
            <Bell key={`bell-${unread}`} className={`size-5 origin-top ${unread > 0 ? "animate-swing" : ""}`} aria-hidden />
            {unread > 0 && (
              <span
                key={`badge-${unread}`}
                className="tabular absolute top-1.5 right-1 grid min-w-5 animate-pop place-items-center rounded-full bg-[#e5484d] px-1 text-xs font-bold text-white"
              >
                {unread}
              </span>
            )}
          </Link>
        )}

        {!user && pathname !== "/login" && (
          <div className="flex items-center gap-1">
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-lg px-4 text-[0.95rem] font-medium text-white/80 hover:text-white">
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-lg bg-white px-4 text-[0.95rem] font-semibold text-navy transition-colors hover:bg-tenant-bright"
            >
              Get started
            </Link>
          </div>
        )}
      </nav>
    </header>
    {/* Outside the header: its backdrop blur would trap a fixed-position child. */}
    {user && <BottomTabBar links={PHONE_LINKS[user.role]} unreadMessages={unreadMessages} pathname={pathname} role={user.role} />}
    </>
  );
}
