"use client";

// 📱 Landlord "More" tab (phones): the sections that don't fit in the bottom
// tab bar, as big tappable rows like a phone's settings list.

import Link from "next/link";
import { Bell, ChevronRight, FileText, Settings, UserCheck, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useUnreadCount } from "@/lib/useNotifications";

const ITEMS: { href: string; label: string; hint: string; icon: LucideIcon }[] = [
  { href: "/landlord/contractors", label: "Trusted contractors", hint: "The pros Tenly asks first", icon: UserCheck },
  { href: "/landlord/lease", label: "Leases", hint: "View and upload your tenants’ leases", icon: FileText },
  { href: "/landlord/notifications", label: "Notifications", hint: "Updates about requests and messages", icon: Bell },
  { href: "/landlord/settings", label: "Settings", hint: "Text size, colors, and your account", icon: Settings },
];

export default function LandlordMorePage() {
  const { user } = useAuth();
  const unread = useUnreadCount(user?.id);

  return (
    <div className="space-y-4 sm:space-y-5">
      <h1 className="text-[1.6rem] leading-tight font-semibold sm:text-[2rem]">More</h1>
      <ul className="overflow-hidden rounded-xl border border-line bg-surface">
        {ITEMS.map(({ href, label, hint, icon: Icon }) => (
          <li key={href} className="border-b border-line last:border-b-0">
            <Link href={href} className="flex min-h-16 items-center gap-3 px-3.5 py-2.5 sm:min-h-20 sm:gap-4 sm:px-4 sm:py-3 transition-colors hover:bg-sunken">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg sm:size-11 bg-accent-soft text-accent-ink">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold sm:text-lg">{label}</span>
                <span className="block text-[0.85rem] text-muted sm:text-base">{hint}</span>
              </span>
              {href.endsWith("notifications") && unread > 0 && (
                <span className="tabular grid h-6 min-w-6 place-items-center rounded-full bg-[#e5484d] px-1.5 text-sm font-bold text-white">
                  {unread}
                </span>
              )}
              <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
