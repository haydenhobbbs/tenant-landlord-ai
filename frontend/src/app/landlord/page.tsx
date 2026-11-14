"use client";

// 🏢 LANDLORD SIDE: review the AI's contractor pick and approve or decline.

import { useState } from "react";
import { StatusBadge, UrgencyBadge } from "@/components/StatusBadge";
import { useRequests } from "@/lib/useRequests";
import { formatDateTime, formatPrice } from "@/lib/format";

export default function LandlordPage() {
  const { requests, reload: load } = useRequests();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(id: string, decision: "approve" | "decline") {
    setBusyId(id);
    await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setBusyId(null);
    load();
  }

  const pending = requests.filter((r) => r.status === "awaiting_approval");
  const done = requests.filter((r) => r.status === "approved" || r.status === "declined");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Approvals</h1>
        <p className="mt-1 text-sm text-slate-600">
          The AI already found a contractor for each request. You just decide.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Needs your approval ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            You&apos;re all caught up 🎉
          </p>
        )}
        {pending.map((r) => (
          <article key={r.id} className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{r.title}</h3>
                  <UrgencyBadge urgency={r.urgency} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {r.tenantName} · {r.unit} · <span className="capitalize">{r.category}</span>
                </p>
                <p className="mt-2 text-sm text-slate-700">{r.description}</p>
              </div>
            </div>

            {r.quote && (
              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">🤖 AI recommendation</p>
                <div className="mt-2 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Contractor</p>
                    <p className="font-medium">{r.quote.contractor.name}</p>
                    <p className="text-xs text-slate-500">{r.quote.contractor.rating}★ · {r.quote.contractor.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Quote</p>
                    <p className="text-xl font-semibold">{formatPrice(r.quote.price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Can come</p>
                    <p className="font-medium">{formatDateTime(r.quote.availableAt)}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{r.quote.aiReason}</p>
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => decide(r.id, "approve")}
                disabled={busyId === r.id}
                className="rounded-lg bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => decide(r.id, "decline")}
                disabled={busyId === r.id}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </article>
        ))}
      </section>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">History</h2>
          {done.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm">
              <span>
                <span className="font-medium">{r.title}</span>
                <span className="text-slate-500"> · {r.unit}{r.quote ? ` · ${r.quote.contractor.name} · ${formatPrice(r.quote.price)}` : ""}</span>
              </span>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
