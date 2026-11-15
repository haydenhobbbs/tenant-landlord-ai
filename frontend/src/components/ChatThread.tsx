"use client";

// 💬 Tenant ↔ landlord conversation. Shared by both sides:
//   Tenant:   <ChatThread tenantId={user.id} me={{ id: user.id, role: "tenant", name: user.name }} />
//   Landlord: <ChatThread tenantId={tenant.id} me={{ id: user.id, role: "landlord", name: user.name }} />
//
// Refreshes every 3 seconds. (Teammate B: swap the polling for Supabase
// Realtime later if you like; the API stays the same.)

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Wrench } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { useMessageAlerts } from "@/components/MessageAlerts";
import { authFetch } from "@/lib/authFetch";

interface Props {
  tenantId: string;
  me: { id: string; role: "tenant" | "landlord"; name: string };
  timeZone?: string; // the property's time zone (Brenen), e.g. "America/New_York"
  otherName?: string; // shown in the empty state, e.g. "your landlord"
  quickReplies?: string[]; // tap to fill the message box (Nermin)
  requestsHref?: string; // where "New repair request" cards link to
}

const REQUEST_PREFIX = "New repair request:";

// 📱 Phones: the conversation fills the space between the top bar and the
// bottom tabs. The contact header and the message box stay put; only the
// messages scroll. Wide screens keep the normal page flow.
export const PHONE_CHAT_PANEL =
  "max-md:fixed max-md:inset-x-0 max-md:top-[calc(4rem+1px+env(safe-area-inset-top))] max-md:bottom-[calc(3.25rem+1px+max(0.75rem,env(safe-area-inset-bottom)))] max-md:z-30 max-md:flex max-md:flex-col max-md:gap-3 max-md:bg-bg max-md:px-4 max-md:pt-3 max-md:pb-2";

export function ChatThread({ tenantId, me, otherName = "them", timeZone, quickReplies = [], requestsHref }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Wider screens: size the chat to end at the bottom of the window, so the
  // page itself doesn't scroll; only the messages inside do. Re-fits whenever
  // anything above it changes size (contacts loading, banners, text size).
  // Also shares the height as --chat-h so the landlord contact list can match.
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const root = document.documentElement;
    const wide = window.matchMedia("(width >= 48rem)");
    const fit = () => {
      // The page stays still on wider screens; only the messages scroll.
      root.style.overflowY = wide.matches ? "hidden" : "";
      if (!wide.matches) {
        el.style.height = "";
        root.style.removeProperty("--chat-h");
        return;
      }
      // offsetTop chain: ignores the entrance animation's slide
      let top = 0;
      for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) top += n.offsetTop;
      // Leave just the page's bottom padding under the chat.
      const below = 16; // small gap under the chat (not the full page padding)
      const h = Math.max(240, Math.floor(window.innerHeight - top - below)); // small floor so short laptop screens still fit
      if (Math.abs(el.offsetHeight - h) > 1) el.style.height = `${h}px`;
      root.style.setProperty("--chat-h", `${h}px`);
    };
    fit();
    const watch = new ResizeObserver(() => fit());
    watch.observe(document.body);
    window.addEventListener("resize", fit);
    wide.addEventListener("change", fit);
    return () => {
      watch.disconnect();
      window.removeEventListener("resize", fit);
      wide.removeEventListener("change", fit);
      root.style.removeProperty("--chat-h");
      root.style.overflowY = "";
    };
  }, []);

  // Grow the message box with its text (up to max-h), like a phone's.
  const grow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
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
      const res = await authFetch(`/api/messages?tenantId=${encodeURIComponent(tenantId)}`, { cache: "no-store" });
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
      // Scroll only the message list, never the whole page.
      const list = bottom.current?.parentElement;
      list?.scrollTo({ top: list.scrollHeight, behavior: count.current === 0 ? "instant" : "smooth" });
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
      const res = await authFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, senderId: me.id, senderRole: me.role, senderName: me.name, body }),
      });
      if (!res.ok) throw new Error();
      const saved: ChatMessage = await res.json();
      setMessages((m) => [...m, saved]);
      setDraft("");
      requestAnimationFrame(() => grow(box.current)); // shrink the box back to one line
    } catch {
      setError("Your message didn't send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div ref={panel} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-clip rounded-xl border border-line bg-surface shadow-card md:flex-none">
      <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:space-y-4 sm:p-6" aria-live="polite">
        {loaded && messages.length === 0 && (
          <p className="py-10 text-center text-base text-muted sm:text-lg">No messages yet. Say hello to {otherName}.</p>
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
                {m.body.startsWith(REQUEST_PREFIX) ? (
                  <RequestCard body={m.body} href={requestsHref} />
                ) : (
                  <p
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-base leading-snug sm:px-4 sm:py-3 sm:text-lg whitespace-pre-line sm:max-w-[72%] ${
                      mine ? "rounded-br-md bg-accent text-on-accent" : "rounded-bl-md bg-sunken text-fg"
                    }`}
                  >
                    {m.body}
                  </p>
                )}
                <span className="mt-1 px-1 text-base text-muted">
                  <time dateTime={m.createdAt}>
                    {new Date(m.createdAt).toLocaleTimeString(timeZone ? "en-US" : undefined, {
                      ...(timeZone ? { timeZone, timeZoneName: "short" as const } : {}),
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                  {lastMine && <span className="font-semibold">{m.readAt ? " · Seen" : " · Sent"}</span>}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {/* The message box sits at the bottom of the panel (on phones: right above the tab bar). */}
      <form
        onSubmit={send}
        className="shrink-0 border-t border-line bg-bg p-3 sm:p-4 md:bg-bg/60 md:px-3 md:pt-1.5 md:pb-2.5"
      >
        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-danger-soft px-4 py-3 text-base font-medium text-danger-ink">
            {error}
          </p>
        )}
        {quickReplies.length > 0 && (
          <div className="-mx-1 mb-1.5 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] sm:mb-2.5 md:mb-1.5">
            {quickReplies.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setDraft(q);
                  requestAnimationFrame(() => {
                    grow(box.current);
                    box.current?.focus();
                  });
                }}
                className="min-h-10 shrink-0 cursor-pointer rounded-full bg-surface px-3.5 text-[0.9rem] font-medium sm:min-h-11 sm:px-4 sm:text-base md:min-h-9 md:px-3 md:text-[0.9rem] ring-1 ring-line-strong transition-colors hover:bg-accent-soft"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {/* iMessage-style: a rounded box that grows as you type, with a round
            arrow button inside it that turns green once there's something to send. */}
        <div className="flex items-end gap-2 rounded-[1.6rem] border border-line-strong bg-surface py-1.5 pr-1.5 pl-4 md:py-1 md:pr-1 transition-colors focus-within:border-accent-edge focus-within:ring-3 focus-within:ring-accent-edge/25">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Message</span>
            <textarea
              ref={box}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                grow(e.currentTarget);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={`Message ${otherName}`}
              className="block max-h-40 min-h-11 w-full resize-none bg-transparent py-2 text-base leading-snug sm:text-lg md:min-h-10 md:py-1.5 md:text-base text-fg placeholder:text-muted focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label={sending ? "Sending" : "Send"}
            className="grid size-11 shrink-0 md:size-10 cursor-pointer place-items-center rounded-full bg-accent text-on-accent transition-[background-color,transform,opacity] duration-200 hover:bg-accent-hover active:scale-95 disabled:cursor-default disabled:bg-line-strong disabled:text-surface disabled:opacity-70"
          >
            <ArrowUp className="size-6" strokeWidth={2.6} aria-hidden />
          </button>
        </div>
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

// A repair request posted into the chat, shown as a card instead of a bubble.
function RequestCard({ body, href }: { body: string; href?: string }) {
  const [first, ...rest] = body.slice(REQUEST_PREFIX.length).trim().split("\n");
  const inner = (
    <>
      <span className="flex items-center gap-2 text-base font-semibold text-accent-ink">
        <Wrench className="size-4" aria-hidden />
        New repair request
      </span>
      <span className="mt-1 block text-base font-semibold sm:text-lg">{first}</span>
      {rest.length > 0 && <span className="mt-0.5 line-clamp-2 block text-base text-muted">{rest.join(" ")}</span>}
      {href && <span className="mt-2 block text-base font-semibold text-accent-ink">See progress →</span>}
    </>
  );
  const cls = "block w-full max-w-[88%] rounded-xl border border-line bg-surface p-4 text-left sm:max-w-[72%]";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-accent-edge`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
