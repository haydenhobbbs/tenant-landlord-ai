"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { LandlordRequest } from "@/lib/landlord";
import { authFetch } from "@/lib/authFetch";

// Only requests from this landlord's own tenants (tenants who joined one of
// their properties with an invite code).
export function useLandlordRequests() {
  const { user } = useAuth();
  const landlordId = user?.role === "landlord" ? user.id : null;
  const [requests, setRequests] = useState<LandlordRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);

  const reload = useCallback(async () => {
    if (!landlordId) return; // wait for sign-in
    const current = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const response = await authFetch(`/api/requests?landlordId=${encodeURIComponent(landlordId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load repair requests.");
      const data = (await response.json()) as LandlordRequest[];
      if (current === sequence.current) setRequests(data);
    } catch {
      if (current === sequence.current) setError("Could not load repair requests. Try again.");
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [landlordId]);

  useEffect(() => {
    void Promise.resolve().then(reload);
    return () => { sequence.current += 1; };
  }, [reload]);

  return { requests, loading, error, reload };
}
