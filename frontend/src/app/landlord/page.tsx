"use client";

// 🏢 LANDLORD REQUESTS. Tabs ("Needs you" / "In progress" / "Done") show one
// group at a time so a phone isn't one long column; cards put the contractor,
// price, and time side by side with Approve / Decline next to each other.
// (Layout by Nermin; approve/decline/complete logic unchanged.)

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Clock, DollarSign, UserCheck } from "lucide-react";
import { StatusBadge, UrgencyBadge } from "@/components/StatusBadge";
import { useLandlordRequests } from "@/lib/useLandlordRequests";
import { formatInZone, formatPrice } from "@/lib/format";
import type { MaintenanceRequest } from "@/lib/types";
import { authFetch } from "@/lib/authFetch";

type TabKey = "needs" | "progress" | "done";

export default function LandlordPage() {
  const { requests, loading, error, reload } = useLandlordRequests();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [chosen, setChosen] = useState<TabKey | null>(null);

  async function act(id: string, action: "find" | "approve" | "decline" | "complete", offerIndex?: number) {
    if (busyId) return;
    setBusyId(id); setActionError(""); setNotice("");
    try {
      const response = await authFetch(`/api/requests/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, offerIndex }),
      });
      if (!response.ok) throw new Error("Update failed");
      setNotice(action === "find" ? "The AI is contacting your trusted contractor now. Quotes will show up here." : action === "approve" ? "Contractor approved." : action === "decline" ? "Request declined." : "Job marked complete.");
      await reload();
    } catch { setActionError("Your change was not saved. Please try again."); }
    finally { setBusyId(null); }
  }

  const pending = requests.filter((r) => r.status === "contractor_suggested");
  // New requests wait for the landlord: nothing is emailed until they choose.
  const fresh = requests.filter((r) => r.status === "submitted");
  const working = requests.filter((r) => r.status === "finding_contractor");
  const booked = requests.filter((r) => r.status === "landlord_approved" || r.status === "scheduled");
  const history = requests.filter((r) => r.status === "completed" || r.status === "declined");

  // Open on whatever needs attention first.
  const tab: TabKey = chosen ?? (pending.length + fresh.length ? "needs" : working.length + booked.length ? "progress" : "needs");
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "needs", label: "Needs you", count: pending.length + fresh.length },
    { key: "progress", label: "In progress", count: working.length + booked.length },
    { key: "done", label: "Done", count: history.length },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Wide screens: the greeting above (LandlordShell) leads; this heading is for phones */}
      <h2 id="requests" className="hidden scroll-mt-24 text-[1.7rem] leading-tight md:block">Your repair requests</h2>
      <header className="md:hidden">
        <h1 className="text-[1.6rem] leading-tight font-semibold sm:text-[2rem]">Repair requests</h1>
        <p className="mt-1 text-base text-muted sm:text-lg">Check the contractor, price, and time, then decide.</p>
      </header>

      {notice && <p role="status" className="rounded-xl bg-ok-soft px-4 py-3 text-lg text-ok-ink">{notice}</p>}
      {actionError && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-lg text-danger-ink">{actionError}</p>}
      {error && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-5 text-danger-ink">
          <p>{error}</p>
          <button type="button" onClick={() => void reload()} className="mt-3 min-h-11 font-semibold underline">Try again</button>
        </div>
      )}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading repair requests">
          <div className="skeleton h-44" />
          <div className="skeleton h-44" />
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="rounded-xl border border-landlord-edge/40 bg-surface p-6">
          <p className="text-lg font-bold">No repair requests yet</p>
          <p className="mt-1 text-lg text-muted">Requests show up here once your tenants join. Send them the invite code or link for their home.</p>
          <Link href="/landlord/properties" className="mt-4 inline-flex min-h-12 items-center rounded-lg bg-accent px-6 text-lg font-bold text-on-accent hover:bg-accent-hover">
            Invite your tenants
          </Link>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <>
          {/* Tabs: one group at a time */}
          <div role="tablist" aria-label="Requests" className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setChosen(t.key)}
                className={`flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-lg px-1 leading-tight transition-colors sm:flex-row sm:gap-2 ${
                  tab === t.key ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg"
                }`}
              >
                <span className="text-[0.9rem] font-semibold sm:text-lg">{t.label}</span>
                <span
                  className={`tabular text-[0.9rem] font-bold sm:text-base ${
                    t.key === "needs" && t.count > 0 ? "text-danger-ink" : tab === t.key ? "text-landlord-ink" : ""
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {tab === "needs" &&
            (pending.length + fresh.length === 0 ? (
              <Empty text="Nothing needs your decision right now." sub="New requests and contractor quotes will appear here." />
            ) : (
              <ul className="grid gap-4 lg:grid-cols-2">
                {fresh.map((r) => (
                  <NewCard
                    key={r.id}
                    request={r}
                    busy={busyId !== null}
                    saving={busyId === r.id}
                    onFind={() => void act(r.id, "find")}
                    onDecline={() => void act(r.id, "decline")}
                  />
                ))}
                {pending.map((r) => (
                  <PendingCard
                    key={r.id}
                    request={r}
                    busy={busyId !== null}
                    saving={busyId === r.id}
                    onApprove={() => void act(r.id, "approve", 0)}
                    onDecline={() => void act(r.id, "decline")}
                  />
                ))}
              </ul>
            ))}

          {tab === "progress" &&
            (working.length + booked.length === 0 ? (
              <Empty text="Nothing in progress." sub="Approved and booked repairs show up here." />
            ) : (
              <div className="space-y-5 sm:space-y-6">
                {booked.length > 0 && (
                  <Group title="Booked">
                    {booked.map((r) => (
                      <Row key={r.id} request={r}>
                        {r.status === "scheduled" && (
                          <button
                            type="button"
                            disabled={!!busyId}
                            onClick={() => void act(r.id, "complete")}
                            className="min-h-11 shrink-0 cursor-pointer rounded-lg px-3 text-base font-semibold ring-1 ring-line-strong hover:bg-sunken disabled:opacity-60"
                          >
                            Mark done
                          </button>
                        )}
                      </Row>
                    ))}
                  </Group>
                )}
                {working.length > 0 && (
                  <Group title="Finding contractors">
                    {working.map((r) => (
                      <Row key={r.id} request={r} />
                    ))}
                  </Group>
                )}
              </div>
            ))}

          {tab === "done" &&
            (history.length === 0 ? (
              <Empty text="No finished repairs yet." />
            ) : (
              <Group>
                {history.map((r) => (
                  <Row key={r.id} request={r} />
                ))}
              </Group>
            ))}
        </>
      )}
    </div>
  );
}

// A new request: nothing has gone to a contractor yet, so the landlord picks how to handle it.
function NewCard({
  request: r,
  busy,
  saving,
  onFind,
  onDecline,
}: {
  request: MaintenanceRequest;
  busy: boolean;
  saving: boolean;
  onFind: () => void;
  onDecline: () => void;
}) {
  const href = `/landlord/requests/${encodeURIComponent(r.id)}`;
  return (
    <li className="flex flex-col gap-3 rounded-xl border-2 border-landlord-edge/50 bg-surface p-4 sm:p-5">
      <Link href={href} className="group flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-lg leading-tight font-semibold sm:text-xl">{r.title}</span>
            <UrgencyBadge urgency={r.urgency} />
          </span>
          <span className="mt-1 block text-[0.9rem] text-muted sm:text-base">
            New request · {r.tenantName} · {r.unit}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center text-base font-semibold text-landlord-ink">
          Details
          <ChevronRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
      <p className="line-clamp-2 text-[0.9rem] text-muted sm:text-base">{r.description}</p>
      {r.legalGuidance?.summary && (
        <p className="rounded-lg bg-landlord-soft p-3 text-sm">
          <span className="font-semibold">Repair rules: </span>
          {r.legalGuidance.summary}
        </p>
      )}
      <p className="text-[0.9rem] font-medium sm:text-base">Nothing has gone to a contractor yet. How should we handle it?</p>
      <button
        type="button"
        onClick={onFind}
        disabled={busy}
        className="min-h-12 cursor-pointer rounded-lg bg-accent px-3 text-base font-bold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg md:min-h-[3.6rem] md:font-semibold"
      >
        {saving ? "Sending…" : "Have the AI contact a contractor"}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`${href}#small-job`}
          className="inline-flex min-h-12 items-center justify-center rounded-lg px-3 text-center text-base leading-tight font-bold ring-1 ring-line-strong hover:bg-sunken"
        >
          I&apos;ll fix it myself
        </Link>
        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          className="min-h-12 cursor-pointer rounded-lg px-3 text-base font-semibold text-muted ring-1 ring-line hover:bg-sunken disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    </li>
  );
}

function PendingCard({
  request: r,
  busy,
  saving,
  onApprove,
  onDecline,
}: {
  request: MaintenanceRequest;
  busy: boolean;
  saving: boolean;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const top = r.suggestions[0];
  return (
    <li className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <Link href={`/landlord/requests/${encodeURIComponent(r.id)}`} className="group flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-lg leading-tight font-semibold sm:text-xl">{r.title}</span>
            <UrgencyBadge urgency={r.urgency} />
          </span>
          <span className="mt-1 block text-[0.9rem] text-muted sm:text-base">
            {r.tenantName} · {r.unit}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center text-base font-semibold text-landlord-ink">
          Details
          <ChevronRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>

      {top ? (
        <dl className="grid grid-cols-3 gap-2 rounded-lg bg-landlord-soft p-3">
          <Fact icon={UserCheck} label="Pro" value={top.contractor.name} />
          <Fact icon={DollarSign} label="Price" value={top.price != null ? formatPrice(top.price) : "Waiting"} />
          <Fact icon={Clock} label="When" value={top.availableAt ? formatInZone(top.availableAt, r.property?.state) : "TBD"} />
        </dl>
      ) : (
        <p className="rounded-lg bg-sunken p-3 text-base text-muted">Waiting for a quote.</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={busy || !top}
          className="min-h-12 cursor-pointer rounded-lg bg-accent px-3 text-base font-bold sm:min-h-13 sm:text-lg text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 md:min-h-[3.6rem] md:font-semibold"
        >
          {saving ? "Saving…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          className="min-h-12 cursor-pointer rounded-lg px-3 text-base font-bold text-fg sm:min-h-13 sm:text-lg ring-1 ring-line-strong hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60 md:min-h-[3.6rem] md:font-semibold"
        >
          Decline
        </button>
      </div>
      {r.suggestions.length > 1 && (
        <Link href={`/landlord/requests/${encodeURIComponent(r.id)}`} className="text-base font-semibold text-landlord-ink underline underline-offset-2">
          See {r.suggestions.length - 1} other {r.suggestions.length === 2 ? "option" : "options"}
        </Link>
      )}
    </li>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[0.85rem] font-medium text-muted">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-0.5 text-[0.9rem] leading-snug font-semibold break-words sm:text-base">{value}</dd>
    </div>
  );
}

function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      {title && <h2 className="text-[1.3rem] leading-tight">{title}</h2>}
      <ul className="grid gap-3 lg:grid-cols-2">{children}</ul>
    </section>
  );
}

function Row({ request: r, children }: { request: MaintenanceRequest; children?: React.ReactNode }) {
  const when = r.scheduledAt ?? r.selected?.availableAt;
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 sm:p-4">
      <Link href={`/landlord/requests/${encodeURIComponent(r.id)}`} className="min-w-0 flex-1">
        <span className="block text-base leading-snug break-words font-semibold sm:text-lg">{r.title}</span>
        <span className="mt-0.5 block text-[0.9rem] leading-snug break-words text-muted sm:text-base">
          {r.unit}
          {r.selected ? ` · ${r.selected.contractor.name}` : ""}
          {when ? ` · ${formatInZone(when, r.property?.state)}` : ""}
        </span>
        <span className="mt-1.5 inline-block">
          <StatusBadge status={r.status} />
        </span>
      </Link>
      {children}
    </li>
  );
}

function Empty({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-line p-7 text-center">
      <p className="text-lg font-semibold">{text}</p>
      {sub && <p className="mt-1 text-lg text-muted">{sub}</p>}
    </div>
  );
}
