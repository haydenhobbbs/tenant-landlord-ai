"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, Input, inputClass } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { useMessageAlerts } from "@/components/MessageAlerts";
import { PropertyLocalTime } from "@/components/landlord/PropertyLocalTime";
import { PropertyInvite } from "@/components/landlord/PropertyInvite";
import { authFetch } from "@/lib/authFetch";
import { propertyInput, STATE_NAMES } from "@/lib/property-input";
import { zoneLabel } from "@/lib/format";
import { useProperties } from "@/lib/useProperties";
import type { PropertySummary } from "@/lib/types";

const empty = { address: "", city: "", state: "", zip: "" };
type InputKey = keyof typeof empty;

// State selection uses the browser native select, matching the UX contract.
export default function PropertiesPage() {
  const { data, setData, error, clearError, loading, reload, user } = useProperties();
  const properties = Array.isArray(data) ? data : [];
  const alerts = useMessageAlerts();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<InputKey, string>>>({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const states = [...new Set(properties.map((property) => property.state))].sort((a, b) => (STATE_NAMES[a] ?? a).localeCompare(STATE_NAMES[b] ?? b));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !user) return;
    const result = propertyInput.safeParse(draft);
    if (!result.success) {
      const next: Partial<Record<InputKey, string>> = {};
      for (const issue of result.error.issues) next[issue.path[0] as InputKey] ??= issue.message;
      setErrors(next);
      form.current?.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)?.focus();
      return;
    }
    setErrors({}); setSaveError(""); setSaving(true);
    try {
      const response = await authFetch("/api/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landlordId: user.id, ...result.data }) });
      const property: PropertySummary & { error?: string } = await response.json();
      if (!response.ok) throw new Error(property.error || "Your property was not saved. Try again.");
      setData((current) => [...(Array.isArray(current) ? current : []), property]);
      clearError();
      setNotice(`${property.address} added. Invite code: ${property.inviteCode}. Times for this home use ${zoneLabel(property.state)}.`);
      setDraft(empty); setAdding(false);
      requestAnimationFrame(() => addButton.current?.focus());
    } catch (reason) { setSaveError(reason instanceof Error ? reason.message : "Your property was not saved. Check your connection and try again."); }
    finally { setSaving(false); }
  }

  function control(key: InputKey) {
    return { name: key, value: draft[key], disabled: saving, "aria-invalid": !!errors[key], "aria-describedby": errors[key] ? `${key}-error` : undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setDraft({ ...draft, [key]: event.target.value }); setErrors({ ...errors, [key]: undefined }); } };
  }
  function fieldError(key: InputKey) { return errors[key] ? <span id={`${key}-error`} className="block text-sm text-danger-ink">{errors[key]}</span> : null; }

  return <div className="space-y-7">
    <PageHeader title="My properties" intro="See residents, messages, and repairs for each home. Share its invite code or link to let tenants join." action={!adding && <Button ref={addButton} disabled={loading} onClick={() => { setAdding(true); setNotice(""); }} icon={<Plus aria-hidden />}>Add a property</Button>} />
    {notice && <p role="status" className="rounded-xl bg-ok-soft p-4 text-ok-ink">{notice}</p>}
    {adding && <section aria-labelledby="add-property" className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <h2 id="add-property" className="text-2xl font-semibold">Add a property</h2>
      <p className="mt-1 text-muted">We&apos;ll make an invite code for it right away.</p>
      <form ref={form} noValidate onSubmit={save} className="mt-5 space-y-5" aria-busy={saving}>
        <Field label="Street address"><Input autoFocus autoComplete="street-address" maxLength={200} {...control("address")} />{fieldError("address")}</Field>
        <div className="grid gap-5 sm:grid-cols-2"><Field label="City"><Input autoComplete="address-level2" maxLength={100} {...control("city")} />{fieldError("city")}</Field>
          <Field label="State"><select className={inputClass} autoComplete="address-level1" {...control("state")}><option value="">Choose a state</option>{Object.entries(STATE_NAMES).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>{fieldError("state")}</Field></div>
        <Field label="ZIP code"><Input inputMode="numeric" autoComplete="postal-code" maxLength={5} {...control("zip")} />{fieldError("zip")}</Field>
        {draft.state && <p className="rounded-lg bg-landlord-soft p-4 text-landlord-ink">Times for this home use {zoneLabel(draft.state)}.</p>}
        <ErrorNote>{saveError}</ErrorNote>
        <div className="flex flex-wrap gap-3"><Button type="submit" disabled={saving} className="min-w-48">{saving ? "Saving…" : "Save and get invite code"}</Button><Button variant="secondary" disabled={saving} onClick={() => { setAdding(false); requestAnimationFrame(() => addButton.current?.focus()); }}>Cancel</Button></div>
      </form>
    </section>}
    {loading && <p role="status" className="rounded-xl border border-line bg-surface p-6">Loading properties…</p>}
    {error && <div className="space-y-3"><ErrorNote>{error}</ErrorNote><Button variant="secondary" onClick={reload}>Try again</Button></div>}
    {!loading && !error && properties.length === 0 && <div className="rounded-xl border border-dashed border-line-strong bg-surface p-7"><h2 className="text-xl font-semibold">Your homes will appear here</h2><p className="mt-2 text-muted">Add your first property to keep its residents and repairs together.</p></div>}
    {/* All homes in one grid so they sit side by side; each card names its state and time zone. */}
    {!loading && !error && properties.length > 0 && <ul aria-label="Your properties" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{states.flatMap((state) => properties.filter((property) => property.state === state).sort((a, b) => a.city.localeCompare(b.city) || a.address.localeCompare(b.address))).map((property) => {
        const unread = alerts?.threads.filter((thread) => property.residents.some((resident) => resident.tenantId === thread.tenantId)).reduce((sum, thread) => sum + thread.count, 0) ?? 0;
        return <li key={property.id}><article className="flex h-full flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
          <div className="min-w-0 flex-1 space-y-2.5"><div><p className="text-sm font-semibold text-muted">{STATE_NAMES[property.state] ?? property.state} · {zoneLabel(property.state)}</p><h3 className="break-words text-xl font-semibold text-landlord-ink"><Link href={`/landlord/properties/${encodeURIComponent(property.id)}`} className="rounded underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-edge">{property.address}</Link></h3><p className="mt-1 text-muted">{property.city}, {property.state} {property.zip}</p></div>
            <p className="text-base text-landlord-ink"><PropertyLocalTime state={property.state} /></p>
            <div><p className="font-semibold">{property.residents.length} {property.residents.length === 1 ? "resident" : "residents"}</p>{property.residents.length ? <ul className="mt-1 space-y-1">{property.residents.map((resident) => <li key={resident.tenantId} className="flex flex-wrap justify-between gap-x-3 text-muted"><span className="break-words">{resident.name}</span><span>{resident.unit || "Unit not set"}</span></li>)}</ul> : <p className="text-muted">No one has joined yet. Send them the link or code below.</p>}</div>
            <div className="flex flex-wrap gap-2"><span className="rounded-lg bg-landlord-soft px-3 py-1 text-sm font-semibold text-landlord-ink">{property.openRequestCount} open {property.openRequestCount === 1 ? "repair" : "repairs"}</span>{unread > 0 && <span className="rounded-lg bg-warn-soft px-3 py-1 text-sm font-semibold text-warn-ink">{unread} unread {unread === 1 ? "message" : "messages"}</span>}</div>
          </div>
          <PropertyInvite property={property} />
          <Link href={`/landlord/properties/${encodeURIComponent(property.id)}`} aria-label={`Open ${property.address}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-landlord-ink underline underline-offset-4 hover:bg-landlord-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-edge">Open property <ArrowRight aria-hidden className="size-5" /></Link>
        </article></li>;
      })}</ul>}
  </div>;
}
