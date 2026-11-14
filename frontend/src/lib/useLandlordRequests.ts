"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LandlordRequest } from "@/lib/landlord";

export function useLandlordRequests() {
  const [requests, setRequests] = useState<LandlordRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);

  const reload = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/requests", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load repair requests.");
      const data = (await response.json()) as LandlordRequest[];
      if (current === sequence.current) setRequests(data);
    } catch {
      if (current === sequence.current) setError("Could not load repair requests. Try again.");
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(reload);
    return () => { sequence.current += 1; };
  }, [reload]);

  return { requests, loading, error, reload };
}
