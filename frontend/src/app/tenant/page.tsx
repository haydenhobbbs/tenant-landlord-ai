"use client";

// 👤 TENANT HOME: one main button (report a problem) + your repairs.

import Link from "next/link";
import { ChevronRight, ImageIcon, Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { useRequests } from "@/lib/useRequests";

export default function TenantHome() {
  const { user } = useAuth();
  const { requests, loaded } = useRequests({ tenantId: user?.id ?? null, pollMs: 5000 });
  const firstName = user?.name.split(" ")[0] ?? "there";

  const DONE = ["declined", "completed"]; // "completed" is planned in TEAM_PLAN.md
  const open = requests.filter((r) => !DONE.includes(r.status));
  const closed = requests.filter((r) => !open.includes(r));

  return (
    <div className="stagger space-y-12">
      {/* Small navy hero in the proposal C style, with the tenant's green glow */}
      <section className="relative overflow-hidden rounded-xl bg-navy px-6 py-9 text-white ring-1 ring-white/10 sm:px-9">
        <div aria-hidden="true" className="glow-blob absolute -top-28 -right-20 size-80 bg-[#1b6b44] opacity-70 blur-3xl" />
        <div aria-hidden="true" className="gridlines absolute inset-0" />
        <div className="relative space-y-6">
          <div className="space-y-2">
            <h1 className="text-[2.4rem] leading-tight font-semibold sm:text-[2.9rem]">Hi {firstName}</h1>
            <p className="max-w-xl text-lg text-white/75">
              Something broken at {user?.unit || "home"}? Tell us and we&apos;ll get it fixed.
            </p>
          </div>
          <Link
            href="/tenant/report"
            className="group inline-flex min-h-[3.6rem] w-full items-center justify-center gap-3 rounded-lg bg-tenant-bright px-7 text-lg font-semibold text-navy shadow-[0_10px_30px_-12px_rgba(91,211,143,.7)] transition-colors hover:bg-white sm:w-auto"
          >
            <Plus className="size-5" aria-hidden />
            Report a problem
          </Link>
        </div>
      </section>

      <section aria-labelledby="repairs" className="space-y-4">
        <h2 id="repairs" className="text-2xl font-bold">Your repairs</h2>

        {!loaded && (
          <div className="space-y-3" aria-label="Loading your repairs">
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
          </div>
        )}

        {loaded && requests.length === 0 && (
          <div className="animate-rise rounded-xl border-2 border-dashed border-line p-8 text-center">
            <p className="text-lg font-semibold">No repairs yet</p>
            <p className="mt-1 text-base text-muted">When you report a problem, you can follow it here step by step.</p>
          </div>
        )}

        {open.length > 0 && <RequestList items={open} />}

        {closed.length > 0 && (
          <details className="group pt-2">
            <summary className="cursor-pointer list-none text-base font-semibold text-accent-ink hover:underline">
              <span className="group-open:hidden">Show {closed.length} past {closed.length === 1 ? "repair" : "repairs"}</span>
              <span className="hidden group-open:inline">Hide past repairs</span>
            </summary>
            <div className="mt-4">
              <RequestList items={closed} />
            </div>
          </details>
        )}
      </section>
    </div>
  );
}

function RequestList({ items }: { items: ReturnType<typeof useRequests>["requests"] }) {
  return (
    <ul className="stagger divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      {items.map((r) => (
        <li key={r.id}>
          <Link
            href={`/tenant/requests/${r.id}`}
            className="group flex items-center gap-4 p-5 transition-colors duration-200 hover:bg-sunken focus-visible:bg-sunken"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="text-lg font-bold">{r.title}</h3>
                <StatusBadge status={r.status} />
              </div>
              <p className="flex flex-wrap items-center gap-x-3 text-base text-muted">
                <span>Sent {formatDateTime(r.createdAt)}</span>
                {r.photos?.length ? (
                  <span className="inline-flex items-center gap-1">
                    <ImageIcon className="size-4" aria-hidden />
                    {r.photos.length} {r.photos.length === 1 ? "photo" : "photos"}
                  </span>
                ) : null}
              </p>
              {r.selected && (r.status === "scheduled" || r.status === "landlord_approved") && (
                <p className="text-base font-semibold text-accent-ink">
                  {r.selected.contractor.name}
                  {(r.scheduledAt ?? r.selected.availableAt)
                    ? ` is coming ${formatDateTime((r.scheduledAt ?? r.selected.availableAt)!)}`
                    : " is booked"}
                </p>
              )}
            </div>
            <ChevronRight className="size-6 shrink-0 text-muted transition-transform duration-300 ease-(--ease-out) group-hover:translate-x-1 group-hover:text-accent-ink" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
