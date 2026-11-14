"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";
import { authFetch } from "./authFetch";
import type { PropertyDetail, PropertySummary } from "./types";

export function useProperties(id?: string) {
  const { user } = useAuth();
  const [data, setData] = useState<PropertySummary[] | PropertyDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  const landlordId = user?.id;
  useEffect(() => {
    if (!landlordId) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await authFetch(`/api/properties${id ? `/${encodeURIComponent(id)}` : ""}?landlordId=${encodeURIComponent(landlordId!)}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 404 ? "This property could not be found. Go back to My properties to choose a home." : "Could not load properties. Check your connection and try again.");
        const result = await response.json();
        if (!controller.signal.aborted) setData(result);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load properties. Try again.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [landlordId, id, attempt]);
  return { data, setData, error, clearError: () => setError(""), loading, reload, user };
}
