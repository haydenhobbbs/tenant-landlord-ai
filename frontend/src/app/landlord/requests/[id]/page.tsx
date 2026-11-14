"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { StatusBadge, UrgencyBadge } from "@/components/StatusBadge";
import { AskOtherContractors } from "@/components/landlord/AskOtherContractors";
import { useLandlordRequests } from "@/lib/useLandlordRequests";
import { formatDateTime, formatPrice } from "@/lib/format";

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { requests, loading, error, reload } = useLandlordRequests();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const request = requests.find((item) => item.id === id);
  const photos = Array.isArray(request?.photos) ? request.photos.filter((photo) => typeof photo === "string" && photo.startsWith("https://")) : [];

  async function act(action: "approve" | "decline", offerIndex?: number) {
    if (busy) return;
    setBusy(true); setActionError(""); setNotice("");
    try {
      const response = await fetch(`/api/requests/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, offerIndex }) });
      if (!response.ok) throw new Error("Update failed");
      setNotice(action === "approve" ? "Contractor approved." : "Request declined.");
      await reload();
    } catch { setActionError("Your decision was not saved. Please try again."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <Link href="/landlord" className="inline-block rounded-lg py-2 font-semibold text-landlord-ink underline underline-offset-2 focus-visible:outline focus-visible:outline-2">← Back to requests</Link>
    {loading && !request && <p role="status" className="rounded-xl border p-5">Loading request…</p>}
    {error && <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-5"><p>{error}</p><button type="button" onClick={() => void reload()} className="mt-2 font-semibold underline">Try again</button></div>}
    {!loading && !error && !request && <div className="rounded-xl border p-5"><h1 className="text-2xl font-bold">Request not found</h1><p className="mt-2">It may have been removed or the link may be incorrect.</p></div>}
    {request && <>
      <header className="space-y-3"><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{request.title}</h1><UrgencyBadge urgency={request.urgency} /><StatusBadge status={request.status} /></div><p className="text-muted">{request.tenantName} · {request.unit} · Reported {formatDateTime(request.createdAt)}</p></header>
      {notice && <p role="status" className="rounded-xl bg-ok-soft p-4 text-ok-ink">{notice}</p>}{actionError && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-danger-ink">{actionError}</p>}
      <section className="rounded-xl border border-line bg-surface p-6"><h2 className="text-xl font-bold">What the tenant reported</h2><p className="mt-3 whitespace-pre-wrap text-base leading-7">{request.description}</p><h3 className="mt-6 font-semibold">Photos</h3>{photos.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map((photo, index) => <a key={`${photo}-${index}`} href={photo} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-edge"><Image unoptimized src={photo} alt={`Repair photo ${index + 1}`} width={360} height={360} className="aspect-square w-full object-cover" /></a>)}</div> : <p className="mt-2 text-muted">No photos attached to this request.</p>}</section>
      <section className="rounded-xl border border-landlord-edge/40 bg-landlord-soft p-6"><h2 className="text-xl font-bold">Contractor suggestions</h2>{request.suggestions.length ? <div className="mt-4 space-y-4">{request.suggestions.map((offer, index) => <article key={`${offer.contractor.id}-${index}`} className="rounded-xl border border-landlord-edge/40 bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{offer.contractor.name}</h3><p className="text-sm text-muted">{offer.contractor.source === "preapproved" ? "Trusted contractor" : "Found nearby"} · {offer.contractor.phone || offer.contractor.email || "Contact details pending"}</p></div>{index === 0 && <span className="rounded-full bg-landlord-soft px-3 py-1 text-xs font-bold text-landlord-ink">Top choice</span>}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="text-sm text-muted">Price</p><p className="text-xl font-bold">{offer.price != null ? formatPrice(offer.price) : "Awaiting quote"}</p></div><div><p className="text-sm text-muted">Available</p><p className="font-bold">{offer.availableAt ? formatDateTime(offer.availableAt) : "To be confirmed"}</p></div></div><p className="mt-4 leading-7">{offer.aiReason}</p>{request.status === "contractor_suggested" && <button type="button" disabled={busy || !offer.available} onClick={() => void act("approve", index)} className="mt-4 min-h-12 rounded-lg bg-accent text-on-accent px-5 font-bold hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Saving…" : `Approve ${offer.contractor.name}`}</button>}</article>)}</div> : <p className="mt-3">No contractor has responded yet.</p>}{request.status === "contractor_suggested" && <button type="button" disabled={busy} onClick={() => void act("decline")} className="mt-5 min-h-12 rounded-lg border border-line-strong px-5 font-bold hover:bg-sunken disabled:opacity-60">Decline request</button>}</section>
      {["submitted", "finding_contractor", "contractor_suggested"].includes(request.status) && <AskOtherContractors requestId={request.id} onContacted={() => void reload()} />}
      <section className="rounded-xl border border-line bg-surface p-6"><h2 className="text-xl font-bold">Repair guidance</h2><p className="mt-1 text-sm text-muted">General information, not legal advice.</p>{request.legalGuidance ? <><p className="mt-4 leading-7">{request.legalGuidance.summary}</p><h3 className="mt-5 font-semibold">What to do and by when</h3><ul className="mt-3 space-y-3">{request.legalGuidance.mustDo.map((item, index) => <li key={`${item.action}-${index}`} className="rounded-xl bg-sunken p-4"><p className="font-semibold">{item.action}</p>{item.deadline && <p className="mt-1 text-sm">By when: {item.deadline}</p>}</li>)}</ul><h3 className="mt-5 font-semibold">Sources</h3><ul className="mt-2 space-y-2">{request.legalGuidance.sources.map((source, index) => <li key={`${source.title}-${index}`}>{source.url?.startsWith("https://") ? <a href={source.url} target="_blank" rel="noreferrer" className="text-landlord-ink underline">{source.title}</a> : source.title}</li>)}</ul></> : <p className="mt-4 rounded-xl bg-sunken p-4 text-muted">No location-specific guidance has been provided yet. Check local requirements before taking action.</p>}</section>
      <Link href={`/landlord/messages?${request.tenantId ? `tenant=${encodeURIComponent(request.tenantId)}` : `request=${encodeURIComponent(request.id)}`}`} className="inline-block rounded-lg bg-accent text-on-accent px-5 py-3 font-semibold hover:bg-accent-hover focus-visible:outline focus-visible:outline-2">Message tenant</Link>
    </>}
  </div>;
}
