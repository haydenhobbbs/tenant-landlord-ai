"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnreadBadge, useMessageAlerts } from "@/components/MessageAlerts";

const links = [
  { href: "/landlord/properties", label: "My properties" },
  { href: "/landlord", label: "Requests" },
  { href: "/landlord/contractors", label: "Trusted contractors" },
  { href: "/landlord/messages", label: "Messages" },
  { href: "/landlord/lease", label: "Lease" },
  { href: "/landlord/calendar", label: "Jobs calendar" },
];

export function LandlordShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Red count on "Messages": how many tenants have unread messages (added by Nermin).
  const unreadTenants = useMessageAlerts()?.badge ?? 0;
  return (
    <div className="landlord-app space-y-7 text-fg">
      {/* Small navy hero in the proposal C style, with a baby-blue glow (Nermin) */}
      <div className="relative overflow-hidden rounded-xl bg-navy px-6 py-7 text-white ring-1 ring-white/10">
        <div aria-hidden="true" className="glow-blob absolute -top-24 -right-16 size-72 bg-[#0c3b5c] opacity-90 blur-3xl" />
        <div aria-hidden="true" className="gridlines absolute inset-0" />
        <div className="relative">
          <p className="font-[family-name:var(--font-heading)] text-[1.9rem] leading-tight font-semibold">Landlord workspace</p>
          <p className="mt-1 text-lg text-white/70">Repairs, people, and appointments in one place.</p>
        </div>
      </div>
      <nav aria-label="Landlord sections" className="flex flex-wrap gap-2">
        {links.map((link) => {
          const active = link.href === "/landlord" ? pathname === link.href || pathname.startsWith("/landlord/requests/") : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-3 text-[0.95rem] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-edge ${active ? "bg-accent text-on-accent" : "bg-surface text-muted ring-1 ring-line hover:bg-accent-soft hover:text-fg"}`}>{link.label}{link.href === "/landlord/messages" && <UnreadBadge count={unreadTenants} />}</Link>;
        })}
      </nav>
      {children}
    </div>
  );
}
