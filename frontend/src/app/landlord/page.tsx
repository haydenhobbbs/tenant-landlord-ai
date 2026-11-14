"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge, UrgencyBadge } from "@/components/StatusBadge";
import { useLandlordRequests } from "@/lib/useLandlordRequests";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { MaintenanceRequest } from "@/lib/types";

export default function LandlordPage() {
  const { requests, loading, error, reload } = useLandlordRequests();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  async function act(id: string, action: "approve" | "decline" | "complete", offerIndex?: number) {
    if (busyId) return;
    setBusyId(id); setActionError(""); setNotice("");
    try {
      const response = await fetch(`/api/requests/${encodeURIComponent(id)}`, {
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
    <header><h1 className="text-3xl font-bold tracking-tight">Repair requests</h1><p className="mt-2 text-base text-slate-600 dark:text-slate-300">Review the suggested contractor, price, and time before deciding.</p></header>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">{notice}</p>}
    {actionError && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-rose-900 dark:bg-rose-950 dark:text-rose-100">{actionError}</p>}
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900"><p>{error}</p><button type="button" onClick={() => void reload()} className="mt-3 font-semibold underline">Try again</button></div>}
    {loading && <p role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Loading repair requests…</p>}

    {!loading && !error && <section aria-labelledby="needs-review" className="space-y-4">
      <h2 id="needs-review" className="text-xl font-bold">Needs your decision <span className="text-sky-800 dark:text-sky-200">({pending.length})</span></h2>
      {pending.length === 0 && <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50 p-7 dark:border-sky-700 dark:bg-sky-950"><p className="font-semibold">No requests need approval right now.</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">New contractor suggestions will appear here.</p></div>}
      {pending.map((request) => <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-bold">{request.title}</h3><UrgencyBadge urgency={request.urgency} /></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{request.tenantName} · {request.unit}</p></div><Link href={`/landlord/requests/${encodeURIComponent(request.id)}`} className="rounded-lg px-2 py-2 font-semibold text-sky-800 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 dark:text-sky-200">View details</Link></div>
        <p className="mt-4 line-clamp-2 text-base text-slate-700 dark:text-slate-200">{request.description}</p>
        {request.suggestions[0] && <div className="mt-5 grid gap-4 rounded-xl border border-sky-100 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950 sm:grid-cols-3"><div><p className="text-sm text-slate-600 dark:text-slate-300">Top suggestion</p><p className="font-bold">{request.suggestions[0].contractor.name}</p></div><div><p className="text-sm text-slate-600 dark:text-slate-300">Quoted price</p><p className="text-xl font-bold">{request.suggestions[0].price != null ? formatPrice(request.suggestions[0].price) : "Awaiting quote"}</p></div><div><p className="text-sm text-slate-600 dark:text-slate-300">Available</p><p className="font-bold">{request.suggestions[0].availableAt ? formatDateTime(request.suggestions[0].availableAt) : "To be confirmed"}</p></div></div>}
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void act(request.id, "approve", 0)} disabled={busyId !== null || !request.suggestions[0]} className="min-h-12 rounded-xl bg-sky-900 px-6 py-3 text-base font-bold text-white hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60">{busyId === request.id ? "Saving…" : "Approve top choice"}</button><button type="button" onClick={() => void act(request.id, "decline")} disabled={busyId !== null} className="min-h-12 rounded-xl border border-slate-300 px-6 py-3 text-base font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">Decline request</button></div>
        {request.suggestions.length > 1 && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{request.suggestions.length - 1} more {request.suggestions.length === 2 ? "option" : "options"} on the detail page.</p>}
      </article>)}
    </section>}
    {!loading && !error && working.length > 0 && <RequestList title="Finding contractors" requests={working} />}
    {!loading && !error && booked.length > 0 && <RequestList title="Approved and scheduled" requests={booked} onComplete={(id) => void act(id, "complete")} busyId={busyId} />}
    {!loading && !error && history.length > 0 && <RequestList title="History" requests={history} />}
  </div>;
}

function RequestList({ title, requests, onComplete, busyId }: { title: string; requests: MaintenanceRequest[]; onComplete?: (id: string) => void; busyId?: string | null }) {
  return <section className="space-y-3"><h2 className="text-xl font-bold">{title}</h2>{requests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><Link href={`/landlord/requests/${encodeURIComponent(request.id)}`} className="font-semibold text-sky-800 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 dark:text-sky-200">{request.title} · {request.unit}</Link><div className="flex flex-wrap items-center gap-3"><StatusBadge status={request.status} />{onComplete && request.status === "scheduled" && <button type="button" disabled={!!busyId} onClick={() => onComplete(request.id)} className="rounded-lg border border-slate-300 px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800">Mark done</button>}</div></div>)}</section>;
}
