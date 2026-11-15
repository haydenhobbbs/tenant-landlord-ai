"use client";

// 💬 LANDLORD MESSAGES: one conversation per tenant (team decision).
// Opens on a contact list like a phone's Messages app: initials, name, the
// tenant's address in smaller text, the last message, and unread counts.
// Tap someone to open the same thread they see on /tenant/messages.
// Phones show the list OR the conversation; wide screens show both.
//
// Links: /landlord/messages?tenant=<tenantId>, or ?request=<requestId>
// (opens that request's tenant).

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ChatThread, PHONE_CHAT_PANEL } from "@/components/ChatThread";
import { UnreadBadge, useMessageAlerts } from "@/components/MessageAlerts";
import { useAuth } from "@/lib/auth";
import { authFetch } from "@/lib/authFetch";
import type { ChatMessage } from "@/lib/types";
import { useLandlordRequests } from "@/lib/useLandlordRequests";

interface Contact {
  id: string;
  name: string;
  unit: string;
  address?: string;
  last?: ChatMessage;
}

const QUICK_REPLIES = ["Thanks for letting me know.", "I'll take care of it.", "Is tomorrow OK?", "The repair person is booked."];

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// "1:15 PM" today, "Yesterday", or "Nov 12"
function shortWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const y = new Date();
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Conversation() {
  const search = useSearchParams();
  const { user } = useAuth();
  const { requests, loading, error } = useLandlordRequests();
  const unread = useMessageAlerts()?.threads ?? [];
  const unreadFor = (id: string) => unread.find((t) => t.tenantId === id)?.count ?? 0;
  const [lastById, setLastById] = useState<Record<string, ChatMessage | undefined>>({});

  // Everyone who has sent a request, with their address.
  const people = useMemo(() => {
    const byId = new Map<string, Contact>();
    for (const r of requests) {
      if (!r.tenantId || byId.has(r.tenantId)) continue;
      byId.set(r.tenantId, { id: r.tenantId, name: r.tenantName, unit: r.unit, address: r.property?.address });
    }
    return [...byId.values()];
  }, [requests]);

  // Latest message per person, for the preview line (refreshed every 10s).
  const ids = people.map((p) => p.id).join(",");
  useEffect(() => {
    if (!ids) return;
    let active = true;
    const load = async () => {
      const entries = await Promise.all(
        ids.split(",").map(async (id) => {
          try {
            const res = await authFetch(`/api/messages?tenantId=${encodeURIComponent(id)}`, { cache: "no-store" });
            const list: ChatMessage[] = res.ok ? await res.json() : [];
            return [id, list[list.length - 1]] as const;
          } catch {
            return [id, undefined] as const;
          }
        }),
      );
      if (active) setLastById(Object.fromEntries(entries));
    };
    load();
    const timer = setInterval(load, 10_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [ids]);

  // Unread first, then most recent message first.
  const contacts = people
    .map((p) => ({ ...p, last: lastById[p.id] }))
    .sort(
      (a, b) =>
        Number(unreadFor(b.id) > 0) - Number(unreadFor(a.id) > 0) ||
        (b.last?.createdAt ?? "").localeCompare(a.last?.createdAt ?? ""),
    );

  const fromLink = search.get("tenant") ?? requests.find((r) => r.id === search.get("request"))?.tenantId ?? null;
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  // undefined = nothing chosen yet (use the link, if any); null = back to the list.
  const openId = picked === undefined ? fromLink : picked;
  const open = contacts.find((c) => c.id === openId);

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className={open ? "hidden lg:block" : ""}>
        <h1 className="text-[1.6rem] leading-tight font-semibold sm:text-[2rem]">Messages</h1>
        <p className="mt-1 text-base text-muted sm:text-lg">One conversation per tenant. New repair requests show up here too.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft p-4 text-danger-ink">
          {error}
        </p>
      )}

      {!loading && people.length === 0 && !error && (
        <p className="rounded-xl border-2 border-dashed border-line p-6 text-lg text-muted">
          Conversations appear after a tenant sends their first repair request.
        </p>
      )}

      {/* grid-cols-1 + min-w-0: let the chat shrink to a phone's width (the quick-reply row used to stretch it) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Contact list (hidden on phones while a conversation is open) */}
        <nav aria-label="Conversations" className={`min-w-0 ${open ? "hidden lg:block" : ""}`}>
          {loading && people.length === 0 ? (
            <div className="space-y-2" aria-label="Loading conversations">
              <div className="skeleton h-20" />
              <div className="skeleton h-20" />
            </div>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-line bg-surface">
              {contacts.map((c) => {
                const n = unreadFor(c.id);
                const active = c.id === open?.id;
                const preview = c.last
                  ? `${c.last.senderRole === "landlord" ? "You: " : ""}${c.last.body.replace(/\s+/g, " ")}`
                  : "No messages yet";
                return (
                  <li key={c.id} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setPicked(c.id)}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left sm:gap-3.5 sm:px-4 sm:py-3.5 transition-colors ${
                        active ? "bg-accent-soft" : "hover:bg-sunken"
                      }`}
                    >
                      <span
                        data-role="tenant"
                        aria-hidden
                        className="grid size-11 shrink-0 place-items-center rounded-full bg-accent font-[family-name:var(--font-heading)] text-base sm:size-13 sm:text-lg font-semibold text-on-accent"
                      >
                        {initials(c.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-base sm:text-lg ${n ? "font-bold" : "font-semibold"}`}>{c.name}</span>
                          {c.last && <span className="shrink-0 text-[0.8rem] text-muted sm:text-[0.9rem]">{shortWhen(c.last.createdAt)}</span>}
                        </span>
                        <span className="block truncate text-[0.8rem] text-muted sm:text-[0.9rem]">
                          {c.address ? `${c.address} · ` : ""}
                          {c.unit}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className={`line-clamp-1 flex-1 text-[0.9rem] sm:text-base ${n ? "font-semibold text-fg" : "text-muted"}`}>{preview}</span>
                          <UnreadBadge count={n} />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* The conversation */}
        {user && open ? (
          <section aria-label={`Conversation with ${open.name}`} className={`flex min-w-0 flex-col md:space-y-4 ${PHONE_CHAT_PANEL}`}>
            <div className="-mb-2 flex shrink-0 items-center gap-3 lg:hidden">
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg pr-2 text-base font-semibold text-accent-ink lg:hidden"
              >
                <ChevronLeft className="size-6" aria-hidden />
                Messages
              </button>
            </div>
            <div className="flex shrink-0 items-center gap-3.5">
              <span
                data-role="tenant"
                aria-hidden
                className="grid size-11 shrink-0 place-items-center rounded-full bg-accent font-[family-name:var(--font-heading)] text-base sm:size-13 sm:text-lg font-semibold text-on-accent"
              >
                {initials(open.name)}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-[1.25rem] leading-tight sm:text-[1.6rem]">{open.name}</h2>
                <p className="truncate text-[0.85rem] text-muted sm:text-base">
                  {open.address ? `${open.address} · ` : ""}
                  {open.unit}
                </p>
              </div>
            </div>
            {/* key: start fresh (and re-mark which messages are new) when switching tenants */}
            <ChatThread
              key={open.id}
              tenantId={open.id}
              me={{ id: user.id, role: "landlord", name: user.name }}
              otherName={open.name.split(" ")[0]}
              quickReplies={QUICK_REPLIES}
              requestsHref="/landlord"
            />
          </section>
        ) : (
          contacts.length > 0 && (
            <p className="hidden rounded-xl border-2 border-dashed border-line p-10 text-center text-lg text-muted lg:block">
              Choose someone on the left to see your conversation.
            </p>
          )
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<p role="status">Loading messages…</p>}>
      <Conversation />
    </Suspense>
  );
}
