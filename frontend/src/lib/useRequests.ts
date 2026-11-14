"use client";

import { useCallback, useEffect, useState } from "react";
import type { MaintenanceRequest } from "./types";

async function fetchRequests(): Promise<MaintenanceRequest[]> {
  const res = await fetch("/api/requests", { cache: "no-store" });
  return res.json();
}

// Loads all requests and gives you a `reload()` to call after changes.
export function useRequests() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);

  const reload = useCallback(() => fetchRequests().then(setRequests), []);

  useEffect(() => {
    let active = true;
    fetchRequests().then((data) => {
      if (active) setRequests(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return { requests, reload };
}
