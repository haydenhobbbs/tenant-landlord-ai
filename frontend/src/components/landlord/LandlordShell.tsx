"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/landlord", label: "Requests" },
  { href: "/landlord/contractors", label: "Trusted contractors" },
  { href: "/landlord/messages", label: "Messages" },
  { href: "/landlord/lease", label: "Lease" },
  { href: "/landlord/calendar", label: "Jobs calendar" },
];

export function LandlordShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="landlord-app space-y-7 rounded-2xl bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:p-6">
      <div className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-5 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-50">
        <p className="text-sm font-semibold uppercase tracking-wide">Landlord workspace</p>
        <p className="mt-1 text-lg">Repairs, people, and appointments in one place.</p>
      </div>
      <nav aria-label="Landlord sections" className="flex flex-wrap gap-2">
        {links.map((link) => {
          const active = link.href === "/landlord" ? pathname === link.href || pathname.startsWith("/landlord/requests/") : pathname === link.href;
          return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${active ? "bg-sky-900 text-white dark:bg-sky-200 dark:text-sky-950" : "border border-slate-200 bg-white text-slate-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"}`}>{link.label}</Link>;
        })}
      </nav>
      {children}
    </div>
  );
}
