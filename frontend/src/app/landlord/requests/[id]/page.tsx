"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { currentStep } from "@/components/RequestTracker";
import { StatusBadge, UrgencyBadge } from "@/components/StatusBadge";
import type { MaintenanceRequest } from "@/lib/types";
import { AskOtherContractors } from "@/components/landlord/AskOtherContractors";
import { ContactHistory } from "@/components/landlord/ContactHistory";
import { HandleItMyself } from "@/components/landlord/HandleItMyself";
import { useLandlordRequests } from "@/lib/useLandlordRequests";
import { formatInZone, formatPrice } from "@/lib/format";
import { authFetch } from "@/lib/authFetch";

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { requests, loading, error, reload } = useLandlordRequests();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const request = requests.find((item) => item.id === id);
  const photos = Array.isArray(request?.photos) ? request.photos.filter((photo) => typeof photo === "string" && photo.startsWith("https://")) : [];

  async function act(action: "find" | "approve" | "decline", offerIndex?: number) {
    if (busy) return;
    setBusy(true); setActionError(""); setNotice("");
    try {
      const response = await authFetch(`/api/requests/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, offerIndex }) });
      if (!response.ok) throw new Error("Update failed");
      setNotice(action === "find" ? "The AI is contacting your trusted contractor now. You'll see their email below in a few seconds, and their quote here when they reply." : action === "approve" ? "Contractor approved." : "Request declined.");
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
      <header className="space-y-3"><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold md:text-[2.6rem] md:leading-tight md:font-semibold">{request.title}</h1><UrgencyBadge urgency={request.urgency} /><StatusBadge status={request.status} /></div><p className="text-muted md:text-lg">{request.tenantName} · {request.unit} · Reported {formatInZone(request.createdAt, request.property?.state)}</p></header>
      <RightNow request={request} />
      {request.scheduledAt && <p className="rounded-xl border border-line bg-surface p-4 font-semibold">Appointment: {formatInZone(request.scheduledAt, request.property?.state)}</p>}
      {notice && <p role="status" className="rounded-xl bg-ok-soft p-4 text-ok-ink">{notice}</p>}{actionError && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-danger-ink">{actionError}</p>}
      {request.status === "submitted" && <section id="small-job" aria-labelledby="decide" className="rounded-xl border-2 border-landlord-edge/60 bg-landlord-soft p-6"><h2 id="decide" className="text-2xl font-bold">How should we handle this?</h2><p className="mt-1 text-muted">Nothing has been sent to any contractor yet.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void act("find")} className="min-h-12 rounded-lg bg-accent px-6 font-bold text-on-accent hover:bg-accent-hover disabled:opacity-60 md:min-h-[3.6rem] md:px-7 md:text-lg md:font-semibold">{busy ? "Sending…" : "Have the AI contact a contractor"}</button><button type="button" disabled={busy} onClick={() => void act("decline")} className="min-h-12 rounded-lg px-4 font-semibold text-muted hover:bg-sunken disabled:opacity-60 md:min-h-[3.6rem] md:px-6 md:text-lg md:ring-1 md:ring-line-strong">Decline request</button></div><p className="mt-4 text-sm text-muted">The AI emails your trusted contractor for this trade first. Or pick specific companies under &ldquo;Ask other contractors&rdquo; below.</p><HandleItMyself requestId={request.id} tenantName={request.tenantName} onDone={() => { setNotice("Got it. You're handling this one, and we've let the tenant know."); void reload(); }} /></section>}
      <section className="rounded-xl border border-line bg-surface p-6"><h2 className="text-xl font-bold">What the tenant reported</h2><p className="mt-3 whitespace-pre-wrap text-base leading-7">{request.description}</p><h3 className="mt-6 font-semibold">Photos</h3>{photos.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map((photo, index) => <a key={`${photo}-${index}`} href={photo} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-edge"><Image unoptimized src={photo} alt={`Repair photo ${index + 1}`} width={360} height={360} className="aspect-square w-full object-cover" /></a>)}</div> : <p className="mt-2 text-muted">No photos attached to this request.</p>}</section>
      {request.status !== "submitted" && <section className="rounded-xl border border-landlord-edge/40 bg-landlord-soft p-6"><h2 className="text-xl font-bold">Contractor suggestions</h2>{request.suggestions.length ? <div className="mt-4 space-y-4">{request.suggestions.map((offer, index) => <article key={`${offer.contractor.id}-${index}`} className="rounded-xl border border-landlord-edge/40 bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{offer.contractor.name}</h3><p className="text-sm text-muted">{offer.contractor.source === "preapproved" ? "Trusted contractor" : "Found nearby"} · {offer.contractor.phone || offer.contractor.email || "Contact details pending"}</p></div>{index === 0 && <span className="rounded-full bg-landlord-soft px-3 py-1 text-xs font-bold text-landlord-ink">Top choice</span>}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="text-sm text-muted">Price</p><p className="text-xl font-bold">{offer.price != null ? formatPrice(offer.price) : "Awaiting quote"}</p></div><div><p className="text-sm text-muted">Available</p><p className="font-bold">{offer.availableAt ? formatInZone(offer.availableAt, request.property?.state) : "To be confirmed"}</p></div></div><p className="mt-4 leading-7">{offer.aiReason}</p>{request.status === "contractor_suggested" && <button type="button" disabled={busy || !offer.available} onClick={() => void act("approve", index)} className="mt-4 min-h-12 rounded-lg bg-accent text-on-accent px-5 font-bold hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 md:min-h-[3.6rem] md:px-7 md:text-lg md:font-semibold">{busy ? "Saving…" : `Approve ${offer.contractor.name}`}</button>}</article>)}</div> : <p className="mt-3">No contractor has responded yet.</p>}{request.status === "contractor_suggested" && <button type="button" disabled={busy} onClick={() => void act("decline")} className="mt-5 min-h-12 rounded-lg border border-line-strong px-5 font-bold hover:bg-sunken disabled:opacity-60 md:min-h-[3.6rem] md:px-7 md:text-lg md:font-semibold">Decline request</button>}</section>}
      {["finding_contractor", "contractor_suggested"].includes(request.status) && <section id="small-job" aria-label="Small job?" className="rounded-xl border border-line bg-surface p-6"><h2 className="text-xl font-bold">Small job after all?</h2><p className="mt-1 text-muted">You can still skip the contractors and do it yourself.</p><HandleItMyself requestId={request.id} tenantName={request.tenantName} onDone={() => { setNotice("Got it. You're handling this one, and we've let the tenant know."); void reload(); }} /></section>}
      {["submitted", "finding_contractor", "contractor_suggested"].includes(request.status) && <AskOtherContractors requestId={request.id} onContacted={() => void reload()} />}
      <ContactHistory requestId={request.id} state={request.property?.state} refreshKey={request.status} />
      <section className="rounded-xl border border-line bg-surface p-6"><h2 className="text-xl font-bold">Repair guidance</h2><p className="mt-1 text-sm text-muted">General information, not legal advice.</p>{request.legalGuidance ? <><p className="mt-4 leading-7">{request.legalGuidance.summary}</p><h3 className="mt-5 font-semibold">What to do and by when</h3><ul className="mt-3 space-y-3">{request.legalGuidance.mustDo.map((item, index) => <li key={`${item.action}-${index}`} className="rounded-xl bg-sunken p-4"><p className="font-semibold">{item.action}</p>{item.deadline && <p className="mt-1 text-sm">By when: {item.deadline}</p>}</li>)}</ul><h3 className="mt-5 font-semibold">Sources</h3><ul className="mt-2 space-y-2">{request.legalGuidance.sources.map((source, index) => <li key={`${source.title}-${index}`}>{source.url?.startsWith("https://") ? <a href={source.url} target="_blank" rel="noreferrer" className="text-landlord-ink underline">{source.title}</a> : source.title}</li>)}</ul></> : <p className="mt-4 rounded-xl bg-sunken p-4 text-muted">No location-specific guidance has been provided yet. Check local requirements before taking action.</p>}</section>
      <Link href={`/landlord/messages?${request.tenantId ? `tenant=${encodeURIComponent(request.tenantId)}` : `request=${encodeURIComponent(request.id)}`}`} className="inline-block rounded-lg bg-accent text-on-accent px-5 py-3 font-semibold hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 md:inline-flex md:min-h-[3.6rem] md:items-center md:px-7 md:py-0 md:text-lg">Message tenant</Link>
    </>}
  </div>;
}

// Wide screens: a navy "Right now" panel like the tenant's repair page, so the
// landlord sees at a glance where things stand and what to do next (Nermin).
const NOW: Record<string, [string, string]> = {
  submitted: ["Your decision is needed", "Nothing has gone to a contractor yet. Choose how to handle it below."],
  finding_contractor: ["Contacting contractors", "The AI is asking for a price and a time. Quotes will show up below."],
  contractor_suggested: ["A quote is ready", "Check the price and time below, then approve or decline."],
  landlord_approved: ["Approved", "Waiting for the contractor to confirm the visit."],
  scheduled: ["Visit booked", "The contractor is coming. Mark it done once it's fixed."],
  completed: ["Fixed", "This repair is done."],
  declined: ["Declined", "This request was closed."],
};

function RightNow({ request }: { request: MaintenanceRequest }) {
  const [headline, next] = NOW[request.status] ?? ["In progress", ""];
  const declined = request.status === "declined";
  const done = declined ? 0 : Math.min(currentStep(request.status), 5);
  return (
    <section aria-label="Right now" className="relative hidden overflow-hidden rounded-xl bg-navy px-8 py-7 text-white ring-1 ring-white/10 md:block">
      <div aria-hidden="true" className="glow-blob absolute -top-24 -right-16 size-72 bg-[#4d9fc7] opacity-50 blur-3xl" />
      <div aria-hidden="true" className="gridlines absolute inset-0" />
      <div className="relative space-y-2">
        <p className="text-lg font-medium text-landlord">Right now</p>
        <p className="font-[family-name:var(--font-heading)] text-[2.2rem] leading-tight font-semibold">{headline}</p>
        <p className="max-w-xl text-lg text-white/75">{next}</p>
        {!declined && (
          <ol className="!mt-5 grid max-w-2xl grid-cols-5 gap-2 text-center text-[0.95rem] text-white/70" aria-label="Progress">
            {["Sent", "Your choice", "Quotes", "Booked", "Fixed"].map((label, i) => (
              <li key={label} className={i === done ? "font-semibold text-white" : ""}>
                <span className={`mb-1.5 block h-1.5 rounded-full ${i < done ? "bg-landlord" : i === done ? "bg-white/60" : "bg-white/15"}`} />
                {label}
                <span className="sr-only">{i < done ? " (done)" : i === done ? " (now)" : ""}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
