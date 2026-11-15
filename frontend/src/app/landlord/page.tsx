"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge, UrgencyBadge } from "@/components/StatusBadge";
import { useLandlordRequests } from "@/lib/useLandlordRequests";
import { formatInZone, formatPrice } from "@/lib/format";
import type { MaintenanceRequest } from "@/lib/types";
import { authFetch } from "@/lib/authFetch";

export default function LandlordPage() {
  const { requests, loading, error, reload } = useLandlordRequests();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  async function act(id: string, action: "approve" | "decline" | "complete", offerIndex?: number) {
    if (busyId) return;
    setBusyId(id); setActionError(""); setNotice("");
    try {
      const response = await authFetch(`/api/requests/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, offerIndex }),
      });
      if (!response.ok) throw new Error("Update failed");
      setNotice(action === "approve" ? "Contractor approved." : action === "decline" ? "Request declined." : "Job marked complete.");
      await reload();
    } catch { setActionError("Your change was not saved. Please try again."); }
    finally { setBusyId(null); }
  }

  const pending = requests.filter((request) => request.status === "contractor_suggested");
  const working = requests.filter((request) => request.status === "submitted" || request.status === "finding_contractor");
  const booked = requests.filter((request) => request.status === "landlord_approved" || request.status === "scheduled");
  const history = requests.filter((request) => request.status === "completed" || request.status === "declined");

  return <div className="space-y-8">
    <header><h1 className="text-3xl font-bold tracking-tight">Repair requests</h1><p className="mt-2 text-base text-muted">Review the suggested contractor, price, and time before deciding.</p></header>
    {notice && <p role="status" className="rounded-xl bg-ok-soft px-4 py-3 text-ok-ink">{notice}</p>}
    {actionError && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-danger-ink">{actionError}</p>}
    {error && <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-5 text-danger-ink"><p>{error}</p><button type="button" onClick={() => void reload()} className="mt-3 font-semibold underline">Try again</button></div>}
    {loading && <p role="status" className="rounded-xl border border-line bg-surface p-6 text-muted">Loading repair requests…</p>}

    {!loading && !error && requests.length === 0 && <div className="rounded-xl border border-landlord-edge/40 bg-surface p-6 shadow-sm"><p className="text-lg font-bold">No repair requests yet</p><p className="mt-1 text-base text-muted">Requests show up here once your tenants join. Send them the invite code or link for their home.</p><Link href="/landlord/properties" className="mt-4 inline-flex min-h-12 items-center rounded-lg bg-accent px-6 text-base font-bold text-on-accent hover:bg-accent-hover">Invite your tenants</Link></div>}
    {!loading && !error && <section aria-labelledby="needs-review" className="space-y-4">
      <h2 id="needs-review" className="text-xl font-bold">Needs your decision <span className="text-landlord-ink">({pending.length})</span></h2>
      {pending.length === 0 && <div className="rounded-xl border border-dashed border-landlord-edge/40 bg-landlord-soft p-7"><p className="font-semibold">No requests need approval right now.</p><p className="mt-1 text-sm text-muted">New contractor suggestions will appear here.</p></div>}
      {pending.map((request) => <article key={request.id} className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-bold">{request.title}</h3><UrgencyBadge urgency={request.urgency} /></div><p className="mt-1 text-sm text-muted">{request.tenantName} · {request.unit}</p></div><Link href={`/landlord/requests/${encodeURIComponent(request.id)}`} className="rounded-lg px-2 py-2 font-semibold text-landlord-ink underline underline-offset-2 focus-visible:outline focus-visible:outline-2">View details</Link></div>
        <p className="mt-4 line-clamp-2 text-base text-muted">{request.description}</p>
        {request.suggestions[0] && <div className="mt-5 grid gap-4 rounded-xl border border-landlord-edge/40 bg-landlord-soft p-4 sm:grid-cols-3"><div><p className="text-sm text-muted">Top suggestion</p><p className="font-bold">{request.suggestions[0].contractor.name}</p></div><div><p className="text-sm text-muted">Quoted price</p><p className="text-xl font-bold">{request.suggestions[0].price != null ? formatPrice(request.suggestions[0].price) : "Awaiting quote"}</p></div><div><p className="text-sm text-muted">Available</p><p className="font-bold">{request.suggestions[0].availableAt ? formatInZone(request.suggestions[0].availableAt, request.property?.state) : "To be confirmed"}</p></div></div>}
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void act(request.id, "approve", 0)} disabled={busyId !== null || !request.suggestions[0]} className="min-h-12 rounded-lg bg-accent text-on-accent px-6 py-3 text-base font-bold hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60">{busyId === request.id ? "Saving…" : "Approve top choice"}</button><button type="button" onClick={() => void act(request.id, "decline")} disabled={busyId !== null} className="min-h-12 rounded-lg border border-line-strong px-6 py-3 text-base font-bold text-fg hover:bg-sunken focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60">Decline request</button></div>
        {request.suggestions.length > 1 && <p className="mt-3 text-sm text-muted">{request.suggestions.length - 1} more {request.suggestions.length === 2 ? "option" : "options"} on the detail page.</p>}
      </article>)}
    </section>}
    {!loading && !error && working.length > 0 && <RequestList title="Finding contractors" requests={working} />}
    {!loading && !error && booked.length > 0 && <RequestList title="Approved and scheduled" requests={booked} onComplete={(id) => void act(id, "complete")} busyId={busyId} />}
    {!loading && !error && history.length > 0 && <RequestList title="History" requests={history} />}
  </div>;
}

function RequestList({ title, requests, onComplete, busyId }: { title: string; requests: MaintenanceRequest[]; onComplete?: (id: string) => void; busyId?: string | null }) {
  return <section className="space-y-3"><h2 className="text-xl font-bold">{title}</h2>{requests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4"><Link href={`/landlord/requests/${encodeURIComponent(request.id)}`} className="font-semibold text-landlord-ink underline underline-offset-2 focus-visible:outline focus-visible:outline-2">{request.title} · {request.unit}</Link><div className="flex flex-wrap items-center gap-3"><StatusBadge status={request.status} />{onComplete && request.status === "scheduled" && <button type="button" disabled={!!busyId} onClick={() => onComplete(request.id)} className="rounded-lg border border-line-strong px-3 py-2 font-semibold hover:bg-sunken disabled:opacity-60">Mark done</button>}</div></div>)}</section>;
}
