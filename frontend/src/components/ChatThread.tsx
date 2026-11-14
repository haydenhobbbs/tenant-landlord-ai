"use client";

// 💬 Tenant ↔ landlord conversation. Shared by both sides:
//   Tenant:   <ChatThread tenantId={user.id} me={{ id: user.id, role: "tenant", name: user.name }} />
//   Landlord: <ChatThread tenantId={tenant.id} me={{ id: user.id, role: "landlord", name: user.name }} />
//
// Refreshes every 3 seconds. (Teammate B: swap the polling for Supabase
// Realtime later if you like; the API stays the same.)

import { useCallback, useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import type { ChatMessage } from "@/lib/types";
import { useMessageAlerts } from "@/components/MessageAlerts";

interface Props {
  tenantId: string;
  me: { id: string; role: "tenant" | "landlord"; name: string };
  otherName?: string; // shown in the empty state, e.g. "your landlord"
}

export function ChatThread({ tenantId, me, otherName = "them" }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const count = useRef(0);
  // Messages that were already there when the screen opened don't animate;
  // only new ones slide in.
  const [seen, setSeen] = useState<Set<string> | null>(null);
  // Only the two stable helpers, never the whole context value: that object
  // changes whenever the unread list does, and depending on it made the
  // "mark read" effect re-run in a loop (Maximum update depth exceeded).
  const alerts = useMessageAlerts();
  const markRead = alerts?.markRead;
  const setOpenThread = alerts?.setOpenThread;

  // While this conversation is on screen: no pop-ups for it, and whatever the
  // other side sends counts as read.
  useEffect(() => {
    setOpenThread?.(tenantId);
    return () => setOpenThread?.(null);
  }, [setOpenThread, tenantId]);

  const hasUnread = messages.some((m) => m.senderRole !== me.role && !m.readAt);
  useEffect(() => {
    if (!hasUnread) return;
    // Mark them read here too, so this doesn't fire again before the next refresh.
    const now = new Date().toISOString();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time local update when unread messages appear
    setMessages((list) => list.map((m) => (m.senderRole !== me.role && !m.readAt ? { ...m, readAt: now } : m)));
    void markRead?.(tenantId);
  }, [hasUnread, markRead, tenantId, me.role]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?tenantId=${encodeURIComponent(tenantId)}`, { cache: "no-store" });
      if (res.ok) {
        const list: ChatMessage[] = await res.json();
        setSeen((prev) => prev ?? new Set(list.map((m) => m.id)));
        setMessages(list);
      }
    } catch {}
    setLoaded(true);
  }, [tenantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load]);

  // Scroll to the newest message when one arrives.
  useEffect(() => {
    if (messages.length !== count.current) {
      bottom.current?.scrollIntoView({ block: "end", behavior: count.current === 0 ? "instant" : "smooth" });
      count.current = messages.length;
    }
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, senderId: me.id, senderRole: me.role, senderName: me.name, body }),
      });
      if (!res.ok) throw new Error();
      const saved: ChatMessage = await res.json();
      setMessages((m) => [...m, saved]);
      setDraft("");
    } catch {
      setError("Your message didn't send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6" aria-live="polite">
        {loaded && messages.length === 0 && (
          <p className="py-10 text-center text-lg text-muted">No messages yet. Say hello to {otherName}.</p>
        )}
        {loaded === false && (
          <div className="space-y-4" aria-hidden>
            <div className="skeleton h-14 w-2/3" />
            <div className="skeleton ml-auto h-14 w-1/2" />
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.senderRole === me.role;
          const fresh = seen !== null && !seen.has(m.id);
          const prev = messages[i - 1];
          const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
          const showName = newDay || !prev || prev.senderRole !== m.senderRole;
          // "Sent" / "Seen" only under your most recent message, like a phone.
          const lastMine = mine && !messages.slice(i + 1).some((n) => n.senderRole === me.role);
          return (
            <div key={m.id}>
              {newDay && (
                <p className="my-5 flex items-center gap-3 text-base font-semibold text-muted first:mt-0" role="separator">
                  <span className="h-px flex-1 bg-line" />
                  {dayLabel(m.createdAt)}
                  <span className="h-px flex-1 bg-line" />
                </p>
              )}
              <div
                className={`flex flex-col ${mine ? "items-end" : "items-start"} ${
                  fresh ? (mine ? "animate-slide-in-right" : "animate-slide-in-left") : ""
                }`}
              >
                {showName && <span className="mb-1 px-1 text-base font-semibold text-muted">{mine ? "You" : m.senderName}</span>}
                <p
                  className={`max-w-[88%] rounded-xl px-4 py-3 text-lg leading-snug whitespace-pre-line sm:max-w-[72%] ${
                    mine ? "rounded-br-md bg-accent text-on-accent" : "rounded-bl-md bg-sunken text-fg"
                  }`}
                >
                  {m.body}
                </p>
                <span className="mt-1 px-1 text-base text-muted">
                  <time dateTime={m.createdAt}>
                    {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </time>
                  {lastMine && <span className="font-semibold">{m.readAt ? " · Seen" : " · Sent"}</span>}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="border-t border-line bg-bg/60 p-4">
        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-danger-soft px-4 py-3 text-base font-medium text-danger-ink">
            {error}
          </p>
        )}
        <div className="flex items-end gap-3">
          <label className="flex-1">
            <span className="mb-1.5 block text-base font-semibold">Your message</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={`Write to ${otherName}…`}
              className={`${inputClass} max-h-48 min-h-14 resize-none`}
            />
          </label>
          <Button type="submit" disabled={sending || !draft.trim()} icon={<SendHorizontal aria-hidden />}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
        <p className="mt-2 hidden text-base text-muted sm:block">Press Enter to send. Shift + Enter starts a new line.</p>
      </form>
    </div>
  );
}

const dayKey = (iso: string) => new Date(iso).toDateString();

// "Today", "Yesterday", or "Monday, November 10"
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}
