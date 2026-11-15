"use client";

// 👤 TENANT HOME: compact greeting with the main button, quick tiles
// (message, lease, rent, open repairs), then repair cards with a mini
// progress bar. Tiles sit side by side so a phone shows more at once.

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, FileText, MessageCircle, Plus, Wrench, type LucideIcon } from "lucide-react";
import { UnreadBadge, useMessageAlerts } from "@/components/MessageAlerts";
import { currentStep } from "@/components/RequestTracker";
import { StatusBadge } from "@/components/StatusBadge";
import { HomeLink } from "@/components/tenant/HomeLink";
import { useAuth } from "@/lib/auth";
import { authFetch } from "@/lib/authFetch";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { Lease, MaintenanceRequest } from "@/lib/types";
import { useRequests } from "@/lib/useRequests";

const DONE = ["declined", "completed"];

// Next date rent is due, e.g. "Dec 1".
function nextDue(day: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28));
  if (d < today) d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TenantHome() {
  const { user } = useAuth();
  const { requests, loaded } = useRequests({ tenantId: user?.id ?? null, pollMs: 5000 });
  const unreadMessages = useMessageAlerts()?.badge ?? 0;
  const [lease, setLease] = useState<Lease | null>(null);
  const firstName = user?.name.split(" ")[0] ?? "there";

  useEffect(() => {
    if (!user) return;
    const qs = new URLSearchParams({ tenantId: user.id, name: user.name, unit: user.unit ?? "" });
    authFetch(`/api/lease?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setLease)
      .catch(() => {});
  }, [user]);

  const open = requests.filter((r) => !DONE.includes(r.status));
  const closed = requests.filter((r) => DONE.includes(r.status));

  return (
    <div className="stagger space-y-6 sm:space-y-10">
      {/* Compact navy greeting with the one main action */}
      <section className="relative overflow-hidden rounded-xl bg-navy px-4 py-5 text-white ring-1 ring-white/10 sm:px-9 sm:py-9">
        <div aria-hidden="true" className="glow-blob absolute -top-28 -right-20 size-80 bg-[#1b6b44] opacity-70 blur-3xl" />
        <div aria-hidden="true" className="gridlines absolute inset-0" />
        <div className="relative space-y-5 sm:space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-[1.75rem] leading-tight font-semibold sm:text-[2.9rem]">Hi {firstName}</h1>
            <p className="max-w-xl text-base text-white/75 sm:text-lg">Something broken? Tell us and we&apos;ll get it fixed.</p>
          </div>
          <Link
            href="/tenant/report"
            className="inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-lg bg-tenant-bright px-7 text-base sm:min-h-[3.6rem] sm:text-lg font-semibold text-navy shadow-[0_10px_30px_-12px_rgba(91,211,143,.7)] transition-colors hover:bg-white sm:w-auto"
          >
            <Plus className="size-5" aria-hidden />
            Report a problem
          </Link>
        </div>
      </section>

      <HomeLink />

      {/* Quick tiles: 2 across on phones, 4 on wider screens */}
      <nav aria-label="Shortcuts" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile href="/tenant/messages" icon={MessageCircle} title="Message landlord" badge={unreadMessages} />
        <Tile href="/tenant/lease" icon={FileText} title="My lease" />
        <Tile
          href="/tenant/lease"
          icon={CalendarDays}
          title={lease ? `Rent due ${nextDue(lease.rentDueDay)}` : "Rent"}
          detail={lease ? formatPrice(lease.monthlyRent) : undefined}
        />
        <Tile
          href="#repairs"
          icon={Wrench}
          title={loaded ? `${open.length} open ${open.length === 1 ? "repair" : "repairs"}` : "Repairs"}
        />
      </nav>

      <section aria-labelledby="repairs-heading" id="repairs" className="scroll-mt-24 space-y-4">
        <h2 id="repairs-heading" className="text-[1.35rem] leading-tight sm:text-[1.7rem]">
          Your repairs
        </h2>

        {!loaded && (
          <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading your repairs">
            <div className="skeleton h-32" />
            <div className="skeleton h-32" />
          </div>
        )}

        {loaded && requests.length === 0 && (
          <div className="animate-rise rounded-xl border-2 border-dashed border-line p-8 text-center">
            <p className="text-lg font-semibold">No repairs yet</p>
            <p className="mt-1 text-lg text-muted">When you report a problem, you can follow it here step by step.</p>
          </div>
        )}

        {open.length > 0 && <RepairCards items={open} />}

        {closed.length > 0 && (
          <details className="group pt-2">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-lg font-semibold text-accent-ink hover:underline">
              <span className="group-open:hidden">
                Show {closed.length} past {closed.length === 1 ? "repair" : "repairs"}
              </span>
              <span className="hidden group-open:inline">Hide past repairs</span>
            </summary>
            <div className="mt-4">
              <RepairCards items={closed} />
            </div>
          </details>
        )}
      </section>
    </div>
  );
}

function Tile({
  href,
  icon: Icon,
  title,
  detail,
  badge = 0,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  detail?: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="pressable relative flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface p-3 hover:border-accent-edge hover:bg-accent-soft/40 sm:min-h-28 sm:flex-col sm:items-start sm:justify-between sm:p-4"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink sm:size-10">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className={`min-w-0 ${badge > 0 ? "pr-5" : ""}`}>
        <span className="block text-base leading-tight font-semibold sm:text-lg">{title}</span>
        {detail && <span className="tabular mt-0.5 block text-sm text-muted sm:text-base">{detail}</span>}
      </span>
      {badge > 0 && (
        <span className="absolute top-2 right-2">
          <UnreadBadge count={badge} />
        </span>
      )}
    </Link>
  );
}

function RepairCards({ items }: { items: MaintenanceRequest[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((r) => {
        const declined = r.status === "declined";
        // How many of the 5 steps are done (Sent, Finding, Landlord, Booked, Fixed).
        const done = declined ? 0 : Math.min(currentStep(r.status), 5);
        const when = r.scheduledAt ?? r.selected?.availableAt;
        const booked = r.selected && (r.status === "scheduled" || r.status === "landlord_approved");
        return (
          <li key={r.id}>
            <Link
              href={`/tenant/requests/${r.id}`}
              className="group flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent-edge sm:p-5"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="text-base leading-snug font-semibold sm:text-lg">{r.title}</span>
                <StatusBadge status={r.status} />
              </span>
              {/* Mini progress: 5 short bars */}
              <span className="grid grid-cols-5 gap-1" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={`h-1.5 rounded-full ${declined ? "bg-danger/40" : i < done ? "bg-accent" : "bg-line"}`} />
                ))}
              </span>
              <span className="flex items-center justify-between gap-3 text-[0.9rem] sm:text-base">
                {booked && when ? (
                  <span className="font-semibold text-accent-ink">
                    {r.selected!.contractor.name} · {formatDateTime(when)}
                  </span>
                ) : (
                  <span className="text-muted">
                    {declined ? "" : `Step ${Math.min(done + 1, 5)} of 5 · `}Sent {formatDateTime(r.createdAt)}
                  </span>
                )}
                <ChevronRight
                  className="size-5 shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-accent-ink"
                  aria-hidden
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
