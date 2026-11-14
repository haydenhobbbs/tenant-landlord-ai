"use client";

// 👤 TENANT SIDE: submit a request + see the status of your requests.

import { useState } from "react";
import { StatusBadge, UrgencyBadge } from "@/components/StatusBadge";
import { useRequests } from "@/lib/useRequests";
import { formatDateTime } from "@/lib/format";
import type { NewRequestInput, Urgency } from "@/lib/types";

const URGENCIES: Urgency[] = ["low", "medium", "high", "emergency"];

const EMPTY_FORM: NewRequestInput = {
  tenantName: "",
  unit: "",
  title: "",
  description: "",
  urgency: "medium",
  // TODO (Teammate A): once login exists, get this from the tenant's property.
  property: { address: "", city: "", state: "", zip: "" },
};

export default function TenantPage() {
  const [form, setForm] = useState<NewRequestInput>(EMPTY_FORM);
  const { requests, reload: load } = useRequests();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Something went wrong");
      return;
    }
    setForm({ ...EMPTY_FORM, tenantName: form.tenantName, unit: form.unit, property: form.property });
    load();
  }

  const update = <K extends keyof NewRequestInput>(key: K, value: NewRequestInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
      <section>
        <h1 className="text-2xl font-bold">Report an issue</h1>
        <p className="mt-1 text-sm text-slate-600">Tell us what&apos;s wrong and we&apos;ll find someone to fix it.</p>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1 text-sm font-medium">
              <span>Your name</span>
              <input className={inputClass} value={form.tenantName} onChange={(e) => update("tenantName", e.target.value)} placeholder="Jordan Lee" required />
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span>Unit</span>
              <input className={inputClass} value={form.unit} onChange={(e) => update("unit", e.target.value)} placeholder="Apt 3B" required />
            </label>
          </div>

          <label className="block space-y-1 text-sm font-medium">
            <span>What&apos;s the problem?</span>
            <input className={inputClass} value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Kitchen sink is leaking" required />
          </label>

          <label className="block space-y-1 text-sm font-medium">
            <span>Details</span>
            <textarea className={`${inputClass} min-h-24`} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="When did it start? Where exactly? Anything you've tried?" required />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1 text-sm font-medium">
              <span>City</span>
              <input className={inputClass} value={form.property?.city ?? ""} onChange={(e) => update("property", { ...form.property!, city: e.target.value })} placeholder="Austin" required />
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span>State</span>
              <input className={`${inputClass} uppercase`} maxLength={2} value={form.property?.state ?? ""} onChange={(e) => update("property", { ...form.property!, state: e.target.value.toUpperCase() })} placeholder="TX" required />
            </label>
            <label className="col-span-2 space-y-1 text-sm font-medium">
              <span>Urgency</span>
              <select className={`${inputClass} capitalize`} value={form.urgency} onChange={(e) => update("urgency", e.target.value as Urgency)}>
                {URGENCIES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-slate-900 py-2.5 font-medium text-white hover:bg-slate-700 disabled:opacity-50">
            {submitting ? "AI is finding a contractor…" : "Submit request"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-bold">My requests</h2>
        <p className="mt-1 text-sm text-slate-600">Track where each request stands.</p>

        <ul className="mt-6 space-y-3">
          {requests.length === 0 && <li className="text-sm text-slate-500">No requests yet.</li>}
          {requests.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{r.title}</h3>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-1 text-sm text-slate-600">{r.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <UrgencyBadge urgency={r.urgency} />
                {r.trade && <span className="capitalize">{r.trade}</span>}
                <span>·</span>
                <span>{r.unit}</span>
                {r.status === "scheduled" && r.selected && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-emerald-700">
                      {r.selected.contractor.name} coming{r.scheduledAt ? ` ${formatDateTime(r.scheduledAt)}` : ""}
                    </span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
