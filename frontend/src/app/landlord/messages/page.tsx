"use client";

// 💬 LANDLORD MESSAGES: one conversation per tenant (team decision).
// Same thread the tenant sees on /tenant/messages (components/ChatThread.tsx).
// New repair requests show up in the thread automatically.
//
// Links: /landlord/messages?tenant=<tenantId>, or ?request=<requestId>
// (opens that request's tenant).

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChatThread } from "@/components/ChatThread";
import { useAuth } from "@/lib/auth";
import { useLandlordRequests } from "@/lib/useLandlordRequests";

interface TenantSummary {
  id: string;
  name: string;
  unit: string;
  openRequests: number;
}

function Conversation() {
  const search = useSearchParams();
  const { user } = useAuth();
  const { requests, loading, error } = useLandlordRequests();

  // Everyone who has sent a request, newest first.
  const tenants = useMemo(() => {
    const byId = new Map<string, TenantSummary>();
    for (const r of requests) {
      if (!r.tenantId) continue;
      const t = byId.get(r.tenantId) ?? { id: r.tenantId, name: r.tenantName, unit: r.unit, openRequests: 0 };
      if (!["completed", "declined"].includes(r.status)) t.openRequests += 1;
      byId.set(r.tenantId, t);
    }
    return [...byId.values()];
  }, [requests]);

  const fromLink =
    search.get("tenant") ?? requests.find((r) => r.id === search.get("request"))?.tenantId ?? null;
  const [picked, setPicked] = useState<string | null>(null);
  const tenantId = picked ?? fromLink ?? tenants[0]?.id ?? null;
  const tenant = tenants.find((t) => t.id === tenantId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Tenant messages</h1>
        <p className="mt-2 text-lg text-muted">One conversation per tenant. New repair requests appear here too.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft p-4 text-danger-ink">
          {error}
        </p>
      )}

      {loading && tenants.length === 0 && <div className="skeleton h-16 max-w-lg" aria-label="Loading tenants" />}

      {!loading && tenants.length === 0 && !error && (
        <p className="rounded-xl border-2 border-dashed border-line p-6 text-lg text-muted">
          Conversations appear after a tenant sends their first repair request.
        </p>
      )}

      {tenants.length > 0 && (
        <label className="block max-w-lg">
          <span className="text-base font-semibold">Tenant</span>
          <select
            value={tenantId ?? ""}
            onChange={(e) => setPicked(e.target.value)}
            className="mt-2 w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-lg text-fg focus:border-accent-edge focus:outline-none"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.unit}
                {t.openRequests ? ` · ${t.openRequests} open ${t.openRequests === 1 ? "repair" : "repairs"}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      {user && tenant && (
        <section aria-label={`Conversation with ${tenant.name}`} className="space-y-3">
          <h2 className="text-xl">
            {tenant.name} · {tenant.unit}
          </h2>
          {/* key: start fresh (and re-mark which messages are new) when switching tenants */}
          <ChatThread
            key={tenant.id}
            tenantId={tenant.id}
            me={{ id: user.id, role: "landlord", name: user.name }}
            otherName={tenant.name.split(" ")[0]}
          />
        </section>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<p role="status">Loading messages…</p>}>
      <Conversation />
    </Suspense>
  );
}
