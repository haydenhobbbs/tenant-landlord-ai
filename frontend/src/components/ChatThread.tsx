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
  const alerts = useMessageAlerts();

  // While this conversation is on screen: no pop-ups for it, and whatever the
  // other side sends counts as read.
  useEffect(() => {
    alerts?.setOpenThread(tenantId);
    return () => alerts?.setOpenThread(null);
  }, [alerts, tenantId]);

  const hasUnread = messages.some((m) => m.senderRole !== me.role && !m.readAt);
  useEffect(() => {
    if (hasUnread) void alerts?.markRead(tenantId);
  }, [hasUnread, alerts, tenantId]);

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
          const showName = !prev || prev.senderRole !== m.senderRole;
          return (
            <div
              key={m.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"} ${
                fresh ? (mine ? "animate-slide-in-right" : "animate-slide-in-left") : ""
              }`}
            >
              {showName && (
                <span className="mb-1 px-1 text-sm font-semibold text-muted">{mine ? "You" : m.senderName}</span>
              )}
              <p
                className={`max-w-[85%] rounded-xl px-4 py-3 text-lg leading-snug whitespace-pre-line sm:max-w-[70%] ${
                  mine ? "rounded-br-md bg-accent text-on-accent" : "rounded-bl-md bg-sunken text-fg"
                }`}
              >
                {m.body}
              </p>
              <time dateTime={m.createdAt} className="mt-1 px-1 text-sm text-muted">
                {new Date(m.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="border-t border-line bg-bg/60 p-4">
        {error && <p className="mb-2 text-base font-medium text-danger-ink">{error}</p>}
        <div className="flex items-end gap-3">
          <label className="flex-1">
            <span className="sr-only">Write a message</span>
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
              placeholder="Write a message…"
              className={`${inputClass} max-h-40 min-h-12 resize-none`}
            />
          </label>
          <Button type="submit" size="md" disabled={sending || !draft.trim()} icon={<SendHorizontal aria-hidden />}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
