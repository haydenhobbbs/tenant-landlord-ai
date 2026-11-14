"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ChatThread } from "@/components/ChatThread";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass } from "@/components/ui/Field";
import { PropertyLocalTime } from "@/components/landlord/PropertyLocalTime";
import { PropertyInvite } from "@/components/landlord/PropertyInvite";
import { useProperties } from "@/lib/useProperties";
import { formatInZone, zoneLabel } from "@/lib/format";
import { timeZoneFor } from "@/lib/timezone";
import type { PropertyDetail, PropertyResident, Profile } from "@/lib/types";

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload, user } = useProperties(id);
  const property = data && !Array.isArray(data) ? data : null;
  return <div className="space-y-7">
    <Link href="/landlord/properties" className="inline-flex min-h-11 items-center rounded-lg py-2 font-semibold text-landlord-ink underline underline-offset-4 hover:bg-landlord-soft focus-visible:outline focus-visible:outline-2">← Back to My properties</Link>
    {loading && <p role="status" className="rounded-xl border border-line bg-surface p-6">Loading property…</p>}
    {error && <div className="space-y-3"><ErrorNote>{error}</ErrorNote><Button variant="secondary" onClick={reload}>Try again</Button></div>}
    {!loading && !error && property && user && <PropertyContent key={property.id} property={property} user={user} />}
  </div>;
}

function PropertyContent({ property, user }: { property: PropertyDetail; user: Profile }) {
  const [selected, setSelected] = useState(property.residents[0]?.tenantId ?? "");
  const resident = property.residents.find((person) => person.tenantId === selected);
  return <>
    <header className="space-y-3"><h1 className="break-words text-3xl font-semibold sm:text-4xl">{property.address}</h1><p className="text-lg text-muted">{property.city}, {property.state} {property.zip}</p><p className="text-xl font-semibold text-landlord-ink"><PropertyLocalTime state={property.state} detail /></p><p className="text-muted">Times for this home use {zoneLabel(property.state)}.</p></header>
    <section aria-labelledby="invite-tenant" className="space-y-4"><h2 id="invite-tenant" className="text-2xl font-semibold">Invite a tenant</h2><p className="text-muted">Share this code or link. Tenants appear here when they join their home.</p><PropertyInvite property={property} /></section>
    <section aria-labelledby="residents" className="space-y-4">
      <h2 id="residents" className="text-2xl font-semibold">Residents &amp; messages</h2>
      {property.residents.length === 0 && <p className="rounded-xl border border-line bg-surface p-6 text-muted">No residents are listed for this home yet. Residents appear here when their leases are linked to this property.</p>}
      {property.residents.length > 1 && <div role="group" aria-label="Choose a resident’s messages" className="flex flex-wrap gap-3">{property.residents.map((person) => <Button key={person.tenantId} size="md" variant="secondary" aria-pressed={selected === person.tenantId} onClick={() => setSelected(person.tenantId)} className="aria-pressed:bg-landlord-soft aria-pressed:text-landlord-ink aria-pressed:ring-landlord-edge">{person.name} · {person.unit}</Button>)}</div>}
      {resident && <div className="min-w-0 space-y-3 break-words"><h3 className="text-xl font-semibold">{resident.name} <span className="font-normal text-muted">· {resident.unit}</span></h3><ChatThread key={resident.tenantId} tenantId={resident.tenantId} me={{ id: user.id, name: user.name, role: "landlord" }} otherName={resident.name} timeZone={timeZoneFor(property.state)} /></div>}
      {property.residents.length > 1 && <HouseholdMessage residents={property.residents} user={user} />}
    </section>
    <section aria-labelledby="property-repairs" className="space-y-4"><h2 id="property-repairs" className="text-2xl font-semibold">Repair requests at this address</h2>
      {property.requests.length === 0 ? <p className="rounded-xl border border-dashed border-line-strong bg-surface p-6 text-muted">No repair requests for this home yet.</p> : <ul className="space-y-3">{property.requests.map((request) => <li key={request.id}><Link href={`/landlord/requests/${encodeURIComponent(request.id)}`} className="block space-y-3 rounded-xl border border-line bg-surface p-5 hover:border-landlord-edge hover:bg-landlord-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-edge"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-xl font-semibold text-landlord-ink">{request.title}</h3><StatusBadge status={request.status} /></div><p className="text-muted">{request.tenantName} · {request.unit}</p><p className="text-base text-muted">Reported <time dateTime={request.createdAt}>{formatInZone(request.createdAt, property.state)}</time></p>{(request.scheduledAt || request.selected?.availableAt) && <p className="font-semibold">{request.scheduledAt ? "Appointment" : "Proposed visit"}: {formatInZone((request.scheduledAt ?? request.selected?.availableAt)!, property.state)}</p>}<p className="font-semibold text-landlord-ink">View repair →</p></Link></li>)}</ul>}
    </section>
  </>;
}

function HouseholdMessage({ residents, user }: { residents: PropertyResident[]; user: Profile }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (sending || !draft.trim()) return;
    setSending(true); setError(""); setNotice("");
    const targets = residents.filter((resident) => !failed || failed.includes(resident.tenantId));
    const results = await Promise.allSettled(targets.map(async (resident) => {
      const response = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId: resident.tenantId, senderId: user.id, senderName: user.name, senderRole: "landlord", body: draft.trim() }) });
      if (!response.ok) throw new Error();
    }));
    const failures = targets.filter((_, index) => results[index].status === "rejected");
    if (failures.length) {
      setFailed(failures.map((resident) => resident.tenantId));
      setError(`Could not send to ${failures.map((resident) => resident.name).join(", ")}. Try again to send only to these residents.`);
    } else {
      setFailed(null); setDraft(""); setNotice("Message sent to everyone at this address.");
    }
    setSending(false);
  }
  return <form noValidate onSubmit={send} aria-busy={sending} className="space-y-4 rounded-xl border border-line bg-surface p-5 sm:p-6">
    <h3 className="text-xl font-semibold">Message everyone at this address</h3><p className="text-muted">The same message goes to {residents.map((resident) => resident.name).join(" and ")} in their own conversations. Replies stay private.</p>
    <Field label="Your message"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} maxLength={2000} disabled={sending || !!failed} className={`${inputClass} resize-none`} /></Field>
    <ErrorNote>{error}</ErrorNote>{notice && <p role="status" className="text-ok-ink">{notice}</p>}
    <Button type="submit" variant="secondary" disabled={sending || !draft.trim()} className="min-w-48">{sending ? "Sending…" : failed ? "Try failed messages again" : "Send to everyone"}</Button>
  </form>;
}
