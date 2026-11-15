"use client";

// Landlord request page: "I'll take care of it myself" for small jobs.
// Marks the repair as booked with the landlord as the repair person, tells the
// tenant, and (optionally) sends them a note in chat.

import { useState } from "react";
import { Wrench } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

export function HandleItMyself({ requestId, tenantName, onDone }: { requestId: string; tenantName: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = "mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-3 text-base text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-edge";

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await authFetch(`/api/requests/${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // datetime-local has no time zone; the browser's local time is what the landlord meant.
        body: JSON.stringify({ action: "self", when: when ? new Date(when).toISOString() : undefined, note }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "That didn't save. Please try again.");
      setOpen(false);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-lg border border-line-strong bg-surface px-5 font-bold hover:bg-sunken"
      >
        <Wrench className="size-5" aria-hidden />
        I&apos;ll take care of it myself
      </button>
    );
  }

  return (
    <form onSubmit={confirm} className="mt-4 space-y-4 rounded-xl border border-line bg-surface p-5">
      <div>
        <h3 className="text-lg font-bold">Handle this repair yourself</h3>
        <p className="text-muted">
          Good for small jobs. We&apos;ll stop looking for contractors and tell {tenantName} you&apos;re taking care of it.
        </p>
      </div>
      <label className="block font-semibold">
        When will you come by? <span className="font-normal text-muted">(optional)</span>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
      </label>
      <label className="block font-semibold">
        Note to {tenantName} <span className="font-normal text-muted">(optional, sent in chat)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          placeholder="I'll swing by and tighten it. Should only take a few minutes."
          className={`${field} min-h-24 resize-none`}
        />
      </label>
      {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-danger-ink">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="min-h-12 rounded-lg bg-accent px-5 font-bold text-on-accent hover:bg-accent-hover disabled:opacity-60">
          {busy ? "Saving…" : "Yes, I'll handle it"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-lg border border-line-strong px-5 font-semibold">
          Cancel
        </button>
      </div>
    </form>
  );
}
