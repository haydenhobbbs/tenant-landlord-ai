"use client";

import { useCallback, useEffect, useState } from "react";
import type { MaintenanceRequest } from "./types";
import { authFetch } from "@/lib/authFetch";

async function fetchRequests(tenantId?: string | null): Promise<MaintenanceRequest[]> {
  const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  const res = await authFetch(`/api/requests${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Couldn't load requests");
  return res.json();
}

// Loads requests and gives you a `reload()` to call after changes.
//   useRequests()                 -> every request (landlord)
//   useRequests({ tenantId })     -> one tenant's requests
//   useRequests({ pollMs: 5000 }) -> also refresh every 5 seconds
// `tenantId: null` means "not known yet" and loads nothing.
export function useRequests(opts: { tenantId?: string | null; pollMs?: number } = {}) {
  const { tenantId, pollMs } = opts;
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(
    () =>
      fetchRequests(tenantId)
        .then(setRequests)
        .catch(() => {})
        .finally(() => setLoaded(true)),
    [tenantId],
  );

  useEffect(() => {
    if (tenantId === null) return;
    let active = true;
    const load = () =>
      fetchRequests(tenantId)
        .then((data) => active && setRequests(data))
        .catch(() => {})
        .finally(() => active && setLoaded(true));
    load();
    const timer = pollMs ? setInterval(load, pollMs) : undefined;
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [tenantId, pollMs]);

  return { requests, reload, loaded };
}
