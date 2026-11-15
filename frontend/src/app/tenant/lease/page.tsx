"use client";

import { useEffect, useState } from "react";
import { LeaseView } from "@/components/LeaseView";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth";
import type { Lease } from "@/lib/types";
import { authFetch } from "@/lib/authFetch";

export default function TenantLeasePage() {
  const { user } = useAuth();
  const [lease, setLease] = useState<Lease | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const qs = new URLSearchParams({ tenantId: user.id, name: user.name, unit: user.unit ?? "" });
    authFetch(`/api/lease?${qs}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setLease)
      .catch(() => setFailed(true));
  }, [user]);

  return (
    <div className="stagger mx-auto max-w-3xl">
      <PageHeader title="Your lease" intro="The important parts of your rental agreement." />
      {failed && <p className="text-lg text-danger-ink">We couldn&apos;t load your lease. Please try again in a minute.</p>}
      {!lease && !failed && (
        <div className="space-y-4" aria-label="Loading your lease">
          <div className="skeleton h-56" />
          <div className="skeleton h-40" />
        </div>
      )}
      {lease && <LeaseView lease={lease} />}
    </div>
  );
}
