import { NextResponse } from "next/server";
import { findThreadByAddress, findThreadByContractor, onContractorReply } from "@/lib/outreach";
import { parseJobTag } from "@/lib/outreach/contact";

const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;

export async function POST(request: Request) {
  const payload = object(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Invalid email payload" }, { status: 400 });
  if (payload.type && payload.type !== "email.received") return NextResponse.json({ ok: true, ignored: true });
  const data = payload.type === "email.received" ? object(payload.data) : payload;
  // Resend's real `email.received` webhook only carries metadata and an email_id,
  // so fetch the message itself from Resend. (This also means we trust Resend's
  // copy of the email, not whatever was posted to this URL.)
  const emailId = typeof data?.email_id === "string" ? data.email_id : undefined;
  const fetched = emailId ? await fetchReceivedEmail(emailId) : undefined;
  if (emailId && !fetched) return NextResponse.json({ error: "Could not load the received email" }, { status: 502 });
  // With Resend configured, a reply must come from Resend (looked up by its id).
  // Otherwise anyone could post a fake "Yes, $50" reply to this URL.
  if (!fetched && process.env.RESEND_API_KEY) return NextResponse.json({ error: "email_id is required" }, { status: 400 });
  const source = fetched ?? data;
  const rawFrom = Array.isArray(source?.from) ? source.from[0] : source?.from;
  const fromValue = typeof rawFrom === "string" ? rawFrom : object(rawFrom)?.email;
  const body = typeof source?.text === "string" && source.text.trim()
    ? source.text
    : typeof source?.html === "string" ? htmlToText(source.html) : undefined;
  if (typeof fromValue !== "string" || typeof body !== "string") {
    return NextResponse.json({ error: "from and text are required" }, { status: 400 });
  }
  const from = (fromValue.match(/<([^<>]+)>/)?.[1] ?? fromValue).trim().toLowerCase();
  const lines: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*On\s+.*wrote:\s*$/i.test(line)) break;
    if (!/^\s*>/.test(line)) lines.push(line);
  }
  const text = lines.join("\n").trim();
  // Prefer the [Job …] tag in the subject; fall back to the sender's address.
  const tagged = typeof source?.subject === "string" ? parseJobTag(source.subject) : undefined;
  const taggedThread = tagged && await findThreadByContractor(tagged.requestId, tagged.contractorId);
  const thread = taggedThread
    ? { requestId: taggedThread.requestId, contractor: taggedThread.contractor }
    : await findThreadByAddress(from);
  if (!thread || !text) return NextResponse.json({ ok: true, ignored: true });
  await onContractorReply(thread.requestId, thread.contractor, text, "email");
  return NextResponse.json({ ok: true });
}

async function fetchReceivedEmail(id: string): Promise<Record<string, unknown> | undefined> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return undefined;
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[outreach] Resend received-email fetch failed", res.status, await res.text().catch(() => ""));
      return undefined;
    }
    return object(await res.json());
  } catch (error) {
    console.error("[outreach] Resend received-email fetch failed", error);
    return undefined;
  }
}

// Plain text from an HTML-only email: keep line breaks, drop tags.
function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<blockquote[\s\S]*$/i, "") // quoted original message
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
}
