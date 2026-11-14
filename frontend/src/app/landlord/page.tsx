"use client";

// 🏢 LANDLORD SIDE (owner: Teammate B)
// The AI already found + contacted contractors. The landlord picks one and approves.

import { useState } from "react";
import { StatusBadge, UrgencyBadge } from "@/components/StatusBadge";
import { formatDateTime, formatPrice } from "@/lib/format";
import { useRequests } from "@/lib/useRequests";
import type { MaintenanceRequest } from "@/lib/types";

export default function LandlordPage() {
  const { requests, reload } = useRequests();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, body: { action: "approve" | "decline" | "complete"; offerIndex?: number }) {
    setBusyId(id);
    await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    reload();
  }

  const pending = requests.filter((r) => r.status === "contractor_suggested");
  const working = requests.filter((r) => r.status === "submitted" || r.status === "finding_contractor");
  const scheduled = requests.filter((r) => r.status === "scheduled" || r.status === "landlord_approved");
  const done = requests.filter((r) => r.status === "completed" || r.status === "declined");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Repair requests</h1>
        <p className="mt-1 text-base text-slate-600">We found contractors for each request. You just choose one and approve.</p>
      </div>

      <Section title={`Needs your approval (${pending.length})`}>
        {pending.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
            You&apos;re all caught up 🎉
          </p>
        )}
        {pending.map((r) => (
          <PendingCard key={r.id} r={r} busy={busyId === r.id} onAct={(body) => act(r.id, body)} />
        ))}
      </Section>

      {working.length > 0 && (
        <Section title="Finding contractors">
          {working.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </Section>
      )}

      {scheduled.length > 0 && (
        <Section title="Scheduled">
          {scheduled.map((r) => (
            <Row key={r.id} r={r}>
              <button
                onClick={() => act(r.id, { action: "complete" })}
                disabled={busyId === r.id}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
              >
                Mark done
              </button>
            </Row>
          ))}
        </Section>
      )}

      {done.length > 0 && (
        <Section title="History">
          {done.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Row({ r, children }: { r: MaintenanceRequest; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3">
      <span>
        <span className="font-medium">{r.title}</span>
        <span className="text-slate-500">
          {" "}
          · {r.unit}
          {r.selected ? ` · ${r.selected.contractor.name}` : ""}
          {r.scheduledAt ? ` · ${formatDateTime(r.scheduledAt)}` : ""}
        </span>
      </span>
      <span className="flex items-center gap-3">
        <StatusBadge status={r.status} />
        {children}
      </span>
    </div>
  );
}

function PendingCard({
  r,
  busy,
  onAct,
}: {
  r: MaintenanceRequest;
  busy: boolean;
  onAct: (body: { action: "approve" | "decline"; offerIndex?: number }) => void;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-semibold">{r.title}</h3>
        <UrgencyBadge urgency={r.urgency} />
      </div>
      <p className="mt-1 text-slate-500">
        {r.tenantName} · {r.unit}
        {r.property?.city ? ` · ${r.property.city}, ${r.property.state}` : ""}
        {r.trade ? <span className="capitalize"> · {r.trade}</span> : null}
      </p>
      <p className="mt-2 text-slate-700">{r.description}</p>

      {r.legalGuidance && (
        <div className="mt-5 rounded-lg border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-900">⚖️ What the law expects</p>
          <p className="mt-1 text-sm text-sky-900">{r.legalGuidance.summary}</p>
          <ul className="mt-2 space-y-1 text-sm text-sky-900">
            {r.legalGuidance.mustDo.map((m) => (
              <li key={m.action}>
                ☐ {m.action}
                {m.deadline ? <span className="text-sky-700"> ({m.deadline})</span> : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-sky-700">{r.legalGuidance.disclaimer}</p>
        </div>
      )}

      <p className="mt-5 text-sm font-semibold text-slate-500">Our suggestions</p>
      <div className="mt-2 space-y-3">
        {r.suggestions.map((o, i) => (
          <div
            key={o.contractor.id}
            className={`flex flex-wrap items-center justify-between gap-4 rounded-lg p-4 ${i === 0 ? "border-2 border-emerald-500 bg-emerald-50" : "border border-slate-200 bg-slate-50"}`}
          >
            <div>
              <p className="font-semibold">
                {o.contractor.name}
                {i === 0 && <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">Best match</span>}
              </p>
              <p className="text-sm text-slate-600">{o.aiReason}</p>
              <p className="mt-1 text-sm text-slate-700">
                {o.price ? formatPrice(o.price) : "Price TBD"}
                {o.availableAt ? ` · ${formatDateTime(o.availableAt)}` : ""}
              </p>
            </div>
            <button
              onClick={() => onAct({ action: "approve", offerIndex: i })}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => onAct({ action: "decline" })}
        disabled={busy}
        className="mt-4 rounded-lg border border-slate-300 bg-white px-5 py-2 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
      >
        Decline request
      </button>
    </article>
  );
}
