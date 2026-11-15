"use client";

// Landlord request page: every email/text the AI sent to contractors for this
// repair, who it went to, when, the exact words, and any replies.

import { useEffect, useState } from "react";
import { Mail, MessageSquareReply, Phone } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { formatInZone } from "@/lib/format";
import type { ContactLogEntry } from "@/lib/pipeline";

export function ContactHistory({ requestId, state, refreshKey }: { requestId: string; state?: string; refreshKey?: unknown }) {
  const [entries, setEntries] = useState<ContactLogEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () =>
      authFetch(`/api/requests/${encodeURIComponent(requestId)}/outreach`, { cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<ContactLogEntry[]>) : Promise.reject()))
        .then((data) => { if (active) { setEntries(data); setFailed(false); } })
        .catch(() => { if (active) setFailed(true); });
    void load();
    // New replies arrive by email, so check again every 10 seconds.
    const timer = setInterval(load, 10_000);
    return () => { active = false; clearInterval(timer); };
  }, [requestId, refreshKey]);

  // Group by contractor so each one reads as a little conversation.
  const groups = new Map<string, ContactLogEntry[]>();
  for (const entry of entries ?? []) groups.set(entry.contractorName, [...(groups.get(entry.contractorName) ?? []), entry]);

  return (
    <section aria-labelledby="contact-history" className="rounded-xl border border-line bg-surface p-6">
      <h2 id="contact-history" className="text-xl font-bold">Who the AI contacted</h2>
      <p className="mt-1 text-muted">Every email the AI sent for this repair, and what came back.</p>

      {failed && !entries && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-4 text-danger-ink">Couldn&apos;t load the contact history. It will try again shortly.</p>}
      {!entries && !failed && <p role="status" className="mt-4 text-muted">Loading…</p>}
      {entries && entries.length === 0 && <p className="mt-4 text-muted">No contractors have been contacted yet.</p>}

      {groups.size > 0 && (
        <ul className="mt-4 space-y-4">
          {[...groups].map(([name, items]) => {
            const replied = items.some((e) => e.direction === "reply");
            return (
              <li key={name} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-lg font-bold">{name}</p>
                  <div className="flex flex-wrap gap-2 text-sm font-semibold">
                    <span className="rounded-full bg-sunken px-3 py-1">{items[0].contractorSource === "preapproved" ? "Trusted contractor" : "Found online"}</span>
                    <span className={`rounded-full px-3 py-1 ${replied ? "bg-ok-soft text-ok-ink" : "bg-warn-soft text-warn-ink"}`}>{replied ? "Replied" : "Waiting for reply"}</span>
                  </div>
                </div>
                <ol className="mt-3 space-y-2">
                  {items.map((e) => {
                    const Icon = e.direction === "reply" ? MessageSquareReply : e.channel === "email" ? Mail : Phone;
                    const verb = e.direction === "reply" ? "Replied" : e.channel === "email" ? "Emailed" : e.channel === "sms" ? "Texted" : "Called";
                    return (
                      <li key={e.id}>
                        <details className="group rounded-lg bg-sunken/60 px-3 py-2">
                          <summary className="flex cursor-pointer list-none items-center gap-2 text-base">
                            <Icon className="size-4 shrink-0 text-landlord-ink" aria-hidden />
                            <span className="font-semibold">{verb}</span>
                            <span className="text-muted">{formatInZone(e.createdAt, state)}</span>
                            {e.to && <span className="truncate text-sm text-muted">to {e.to}</span>}
                            <span className="ml-auto text-sm text-landlord-ink underline group-open:hidden">Show message</span>
                            <span className="ml-auto hidden text-sm text-landlord-ink underline group-open:inline">Hide</span>
                          </summary>
                          <p className="mt-2 whitespace-pre-wrap border-t border-line pt-2 text-base leading-7">{e.body}</p>
                        </details>
                      </li>
                    );
                  })}
                </ol>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
