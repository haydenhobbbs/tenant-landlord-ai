"use client";

// Landlord workspace frame. Wide screens only: phones use the bottom tab bar.
// The Requests home gets the same look as the tenant home (Nermin): a navy
// greeting with one main button, then big shortcut tiles. Sections are in
// the top bar.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CalendarDays, ClipboardCheck, FileText, MessageCircle, Plus, UserCheck, type LucideIcon } from "lucide-react";
import { UnreadBadge, useMessageAlerts } from "@/components/MessageAlerts";
import { useAuth } from "@/lib/auth";
import { useLandlordRequests } from "@/lib/useLandlordRequests";


export function LandlordShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Red count on "Messages": how many tenants have unread messages (added by Nermin).
  const unreadTenants = useMessageAlerts()?.badge ?? 0;
  const home = pathname === "/landlord";

  return (
    <div className="landlord-app space-y-7 text-fg">
      {/* Sections live in the top bar now (NavBar), like the tenant pages */}
      {home && <HomeTop unread={unreadTenants} />}
      {children}
    </div>
  );
}

// Wide screens: greeting + main button, then shortcut tiles (like the tenant home).
function HomeTop({ unread }: { unread: number }) {
  const { user } = useAuth();
  const { requests, loading } = useLandlordRequests();
  const firstName = user?.name.split(" ")[0] ?? "there";
  const waiting = requests.filter((r) => r.status === "submitted" || r.status === "contractor_suggested").length;

  return (
    <div className="hidden space-y-6 md:block">
      <section className="relative overflow-hidden rounded-xl bg-navy px-9 py-9 text-white ring-1 ring-white/10">
        <div aria-hidden="true" className="glow-blob absolute -top-28 -right-20 size-80 bg-[#4d9fc7] opacity-50 blur-3xl" />
        <div aria-hidden="true" className="gridlines absolute inset-0" />
        <div className="relative space-y-6">
          <div className="space-y-1.5">
            <p className="font-[family-name:var(--font-heading)] text-[2.9rem] leading-tight font-semibold">Hi {firstName}</p>
            <p className="max-w-xl text-lg text-white/75">
              {loading
                ? "Checking your repairs…"
                : waiting
                  ? `${waiting} ${waiting === 1 ? "repair needs" : "repairs need"} your decision.`
                  : "Nothing needs your decision right now."}
            </p>
          </div>
          {waiting > 0 ? (
            <a
              href="#requests"
              className="inline-flex min-h-[3.6rem] items-center justify-center gap-3 rounded-lg bg-landlord px-7 text-lg font-semibold text-navy shadow-[0_10px_30px_-12px_rgba(154,216,247,.7)] transition-colors hover:bg-white"
            >
              <ClipboardCheck className="size-5" aria-hidden />
              Review {waiting === 1 ? "it" : "them"} now
            </a>
          ) : (
            <Link
              href="/landlord/properties"
              className="inline-flex min-h-[3.6rem] items-center justify-center gap-3 rounded-lg bg-landlord px-7 text-lg font-semibold text-navy shadow-[0_10px_30px_-12px_rgba(154,216,247,.7)] transition-colors hover:bg-white"
            >
              <Plus className="size-5" aria-hidden />
              Add a property
            </Link>
          )}
        </div>
      </section>

      <nav aria-label="Shortcuts" className="grid grid-cols-3 gap-3 lg:grid-cols-5">
        <Tile href="/landlord/messages" icon={MessageCircle} title="Messages" badge={unread} />
        <Tile href="/landlord/properties" icon={Building2} title="My properties" />
        <Tile href="/landlord/calendar" icon={CalendarDays} title="Jobs calendar" />
        <Tile href="/landlord/contractors" icon={UserCheck} title="Trusted contractors" />
        <Tile href="/landlord/lease" icon={FileText} title="Leases" />
      </nav>
    </div>
  );
}

function Tile({ href, icon: Icon, title, badge = 0 }: { href: string; icon: LucideIcon; title: string; badge?: number }) {
  return (
    <Link
      href={href}
      className="pressable relative flex min-h-28 flex-col items-start justify-between gap-3 rounded-xl border border-line bg-surface p-4 hover:border-accent-edge hover:bg-accent-soft/40"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="text-lg leading-tight font-semibold">{title}</span>
      {badge > 0 && (
        <span className="absolute top-2 right-2">
          <UnreadBadge count={badge} />
        </span>
      )}
    </Link>
  );
}
