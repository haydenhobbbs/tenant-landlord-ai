"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { landlordSession, landlordSupabase, localMessages, saveLocalMessage, type LandlordMessage } from "@/lib/landlord";
import { useLandlordRequests } from "@/lib/useLandlordRequests";
import { formatDateTime } from "@/lib/format";

function Conversation() {
  const search = useSearchParams();
  const { requests, loading: requestsLoading, error: requestsError } = useLandlordRequests();
  const [requestId, setRequestId] = useState(search.get("request") || "");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [messages, setMessages] = useState<LandlordMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sequence = useRef(0);

  const loadMessages = useCallback(async (id: string, owner: string | null) => {
    const current = ++sequence.current;
    if (!id) { setMessages([]); return; }
    setLoading(true); setError("");
    if (!owner) { setMessages(localMessages(id)); setLoading(false); return; }
    const { data, error: loadError } = await landlordSupabase()!.from("messages").select("id,request_id,sender_id,body,created_at").eq("request_id", id).order("created_at");
    if (current !== sequence.current) return;
    if (loadError) setError("Could not load messages. Check chat access and your sign-in.");
    else setMessages((data ?? []).map((row) => ({ id: row.id, requestId: row.request_id, senderRole: row.sender_id === owner ? "landlord" : "tenant", body: row.body, createdAt: row.created_at })));
    setLoading(false);
  }, []);

  useEffect(() => { let active = true; void landlordSession().then((user) => { if (active) { setOwnerId(user?.id ?? null); setSessionChecked(true); } }); return () => { active = false; }; }, []);
  useEffect(() => { if (sessionChecked) void Promise.resolve().then(() => loadMessages(requestId, ownerId)); return () => { sequence.current += 1; }; }, [requestId, ownerId, sessionChecked, loadMessages]);

  useEffect(() => {
    if (!requestId || !ownerId) return;
    const client = landlordSupabase()!;
    const channel = client.channel(`landlord-messages-${requestId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` }, () => { void loadMessages(requestId, ownerId); })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [requestId, ownerId, loadMessages]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !requestId || busy) return;
    setBusy(true); setError(""); setNotice("");
    if (ownerId) {
      if (!active?.tenantId || active.landlordId !== ownerId) { setError("This request is not linked to both signed-in people yet. Ask the team to connect request ownership before sending."); setBusy(false); return; }
      const { error: sendError } = await landlordSupabase()!.from("messages").insert({ request_id: requestId, sender_id: ownerId, body });
      if (sendError) { setError("Message was not sent. Check your connection and try again."); setBusy(false); return; }
      await loadMessages(requestId, ownerId);
      setNotice("Message sent.");
    } else {
      const message: LandlordMessage = { id: crypto.randomUUID(), requestId, senderRole: "landlord", body, createdAt: new Date().toISOString() };
      saveLocalMessage(message);
      setMessages(localMessages(requestId));
      setNotice("Saved to this browser. The tenant cannot see it yet.");
    }
    setDraft(""); setBusy(false);
  }

  const active = requests.find((request) => request.id === requestId);
  return <div className="space-y-6"><header><h1 className="text-3xl font-bold">Tenant messages</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Discuss repairs and entry times with the tenant.</p></header>
    {sessionChecked && !ownerId && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">Local preview: messages stay on this browser. Sign-in and a shared tenant conversation are required for delivery.</p>}
    {ownerId && active && (!active.tenantId || active.landlordId !== ownerId) && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">This request is not linked to the tenant’s and landlord’s accounts yet. Messages cannot be delivered until the team connects both accounts.</p>}
    {requestsError && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-900">{requestsError}</p>}
    <label className="block max-w-lg font-semibold">Choose a repair request<select value={requestId} onChange={(event) => setRequestId(event.target.value)} disabled={requestsLoading} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700 dark:border-slate-600 dark:bg-slate-900 dark:text-white"><option value="">Select a request</option>{requests.map((request) => <option key={request.id} value={request.id}>{request.tenantName} · {request.unit} · {request.title}</option>)}</select></label>
    {active && <section aria-label={`Conversation about ${active.title}`} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div className="border-b border-slate-200 pb-4 dark:border-slate-700"><h2 className="text-xl font-bold">{active.tenantName} · {active.unit}</h2><p className="text-sm text-slate-600 dark:text-slate-300">{active.title}</p></div>
      {loading ? <p role="status" className="py-8">Loading messages…</p> : messages.length === 0 ? <p className="py-8 text-slate-600 dark:text-slate-300">No messages yet. Use the box below to start the conversation.</p> : <ol className="max-h-[28rem] space-y-3 overflow-y-auto py-5">{messages.map((message) => <li key={message.id} className={`max-w-[85%] rounded-xl p-4 ${message.senderRole === "landlord" ? "ml-auto bg-sky-100 text-sky-950 dark:bg-sky-900 dark:text-white" : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"}`}><p className="text-xs font-bold uppercase tracking-wide">{message.senderRole === "landlord" ? "You" : active.tenantName} · {formatDateTime(message.createdAt)}</p><p className="mt-2 whitespace-pre-wrap">{message.body}</p></li>)}</ol>}
      {error && <p role="alert" className="my-3 rounded-lg bg-rose-50 p-3 text-rose-900">{error}</p>}{notice && <p role="status" className="my-3 rounded-lg bg-emerald-50 p-3 text-emerald-900">{notice}</p>}
      <form noValidate onSubmit={(event) => void send(event)} className="border-t border-slate-200 pt-4 dark:border-slate-700"><label htmlFor="landlord-message" className="font-semibold">Message</label><textarea id="landlord-message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="For example: May the plumber enter tomorrow at 10 a.m.?" className="mt-2 min-h-28 w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700 dark:border-slate-600 dark:bg-slate-800 dark:text-white" /><button type="submit" disabled={!draft.trim() || busy} className="mt-3 min-h-12 rounded-xl bg-sky-900 px-6 font-bold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Sending…" : "Send message"}</button></form>
    </section>}
    {!requestsLoading && requests.length === 0 && !requestsError && <p className="rounded-xl border border-dashed p-5">Messages appear after a tenant submits a repair request.</p>}
  </div>;
}

export default function MessagesPage() { return <Suspense fallback={<p role="status">Loading messages…</p>}><Conversation /></Suspense>; }
