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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-xl font-bold">Ask other contractors</h2>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        Your trusted contractor was contacted first. Want more quotes? The AI found these nearby. Pick any and it will email them for you.
      </p>
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mt-4 rounded-xl p-4 ${message.kind === "ok" ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : "bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-100"}`}
        >
          {message.text}
        </p>
      )}
      {loadError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-rose-900 dark:bg-rose-950 dark:text-rose-100">{loadError}</p>}
      {!contractors && !loadError && <p role="status" className="mt-4 text-slate-600 dark:text-slate-300">Searching nearby…</p>}
      {contractors && contractors.length === 0 && <p className="mt-4">No other contractors found nearby.</p>}
      {contractors && contractors.length > 0 && (
        <ul className="mt-4 space-y-3">
          {contractors.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div>
                <p className="text-lg font-bold">{c.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {c.rating != null && <>★ {c.rating.toFixed(1)} · </>}
                  {c.website?.startsWith("https://") ? (
                    <a href={c.website} target="_blank" rel="noreferrer" className="text-sky-800 underline dark:text-sky-200">Website</a>
                  ) : (
                    "Found online"
                  )}
                </p>
              </div>
              {c.contacted ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-900">✓ Emailed</span>
              ) : (
                <button
                  type="button"
                  disabled={sending !== null}
                  onClick={() => void ask(c)}
                  className="min-h-12 rounded-xl border border-sky-900 px-5 font-bold text-sky-900 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-200 dark:text-sky-200 dark:hover:bg-sky-950"
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
