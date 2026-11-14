"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExtraContractor } from "@/lib/pipeline";

// Lets the landlord have the AI email more contractors it found online,
// one click per contractor, beyond the trusted contractor it contacted first.
export function AskOtherContractors({ requestId, onContacted }: { requestId: string; onContacted?: () => void }) {
  const [contractors, setContractors] = useState<ExtraContractor[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const url = `/api/requests/${encodeURIComponent(requestId)}/contractors`;

  const load = useCallback(async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error();
      return (await response.json()) as ExtraContractor[];
    } catch {
      throw new Error("Couldn't search for nearby contractors. Try again.");
    }
  }, [url]);

  useEffect(() => {
    let active = true;
    load()
      .then((data) => active && setContractors(data))
      .catch((error: Error) => active && setLoadError(error.message));
    return () => { active = false; };
  }, [load]);

  async function ask(contractor: ExtraContractor) {
    if (sending) return;
    setSending(contractor.id); setMessage(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId: contractor.id }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "The email wasn't sent. Try again.");
      setMessage({ kind: "ok", text: `Emailed ${contractor.name}. Their reply will show up above as a suggestion.` });
      setContractors((list) => list?.map((c) => (c.id === contractor.id ? { ...c, contacted: true } : c)) ?? list);
      onContacted?.();
    } catch (error) {
      setMessage({ kind: "error", text: (error as Error).message });
    } finally {
      setSending(null);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-6">
      <h2 className="text-xl font-bold">Ask other contractors</h2>
      <p className="mt-1 text-muted">
        Your trusted contractor was contacted first. Want more quotes? The AI found these nearby. Pick any and it will email them for you.
      </p>
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mt-4 rounded-xl p-4 ${message.kind === "ok" ? "bg-ok-soft text-ok-ink" : "bg-danger-soft text-danger-ink"}`}
        >
          {message.text}
        </p>
      )}
      {loadError && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-4 text-danger-ink">{loadError}</p>}
      {!contractors && !loadError && <p role="status" className="mt-4 text-muted">Searching nearby…</p>}
      {contractors && contractors.length === 0 && <p className="mt-4">No other contractors found nearby.</p>}
      {contractors && contractors.length > 0 && (
        <ul className="mt-4 space-y-3">
          {contractors.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
              <div>
                <p className="text-lg font-bold">{c.name}</p>
                <p className="text-sm text-muted">
                  {c.rating != null && <>★ {c.rating.toFixed(1)} · </>}
                  {c.website?.startsWith("https://") ? (
                    <a href={c.website} target="_blank" rel="noreferrer" className="text-landlord-ink underline">Website</a>
                  ) : (
                    "Found online"
                  )}
                </p>
              </div>
              {c.contacted ? (
                <span className="rounded-full bg-ok-soft px-3 py-1 text-sm font-bold text-ok-ink">✓ Emailed</span>
              ) : (
                <button
                  type="button"
                  disabled={sending !== null}
                  onClick={() => void ask(c)}
                  className="min-h-12 rounded-lg border border-landlord-ink px-5 font-bold text-landlord-ink hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending === c.id ? "Emailing…" : "Have AI email them"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
