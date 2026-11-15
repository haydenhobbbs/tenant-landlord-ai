import type { ContactChannel, Contractor } from "../types";
import { escapeXml, placeCall, sendEmail, sendSms } from "./send";
import type { ContactResult } from "./types";

export const jobTag = (requestId: string, contractorId: string) => `[Job ${requestId}~${contractorId}]`;

export function parseJobTag(subject: string): { requestId: string; contractorId: string } | undefined {
  const match = subject.match(/\[Job ([^\s~\]]+)~([^\s\]]+)\]/);
  return match ? { requestId: match[1], contractorId: match[2] } : undefined;
}

/**
 * Short reference shown in the email subject, e.g. "Ref #4K7Q2M". It's derived
 * from the request + contractor, so a reply ("Re: … (Ref #4K7Q2M)") can be
 * matched back even when every demo email goes to one inbox.
 */
export function refCode(requestId: string, contractorId: string): string {
  let h = 0x811c9dc5; // FNV-1a
  for (const ch of `${requestId}~${contractorId}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).toUpperCase().padStart(6, "0").slice(-6);
}

export function parseRef(subject: string): string | undefined {
  return subject.match(/Ref\s*#\s*([A-Z0-9]{6})\b/i)?.[1].toUpperCase();
}

export async function contactContractor(
  contractor: Contractor, message: string, channel: ContactChannel, opts: { requestId?: string; subject?: string } = {},
): Promise<{ sent: boolean; reply: string | null }> {
  const context = { requestId: opts.requestId, contractor };
  let result: ContactResult;
  if (channel === "email") {
    const subjectLine = message.match(/^Subject:[ \t]*([^\r\n]*)\r?\n?/i);
    // A short, consistent subject (opts.subject) beats whatever the AI wrote.
    // The Ref code survives "Re:" replies, so the email webhook can match a reply
    // to the right request and contractor even when every demo email goes to one inbox.
    const base = opts.subject || subjectLine?.[1].trim() || "Repair request";
    const ref = opts.requestId ? ` (Ref #${refCode(opts.requestId, contractor.id)})` : "";
    result = await sendEmail({
      to: process.env.DEMO_CONTRACTOR_EMAIL || contractor.email || "",
      subject: `${base}${ref}`,
      text: subjectLine ? message.slice(subjectLine[0].length).trimStart() : message,
    }, context);
  } else {
    const phone = process.env.DEMO_CONTRACTOR_PHONE || contractor.phone || "";
    if (channel === "call") {
      const base = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
      const query = new URLSearchParams({ requestId: opts.requestId ?? "", contractorId: contractor.id });
      const action = `${base}/api/webhooks/twilio/voice?${query}`;
      const twiml = `<Response><Say>${escapeXml(message)}</Say><Gather input="speech" method="POST" action="${escapeXml(action)}"><Say>Please say your availability and price after the beep.</Say></Gather><Say>Thank you, goodbye.</Say></Response>`;
      result = await placeCall(phone, twiml, context);
    } else {
      result = await sendSms(phone, message, context);
    }
  }
  const price = 120 + Math.round(Math.random() * 20) * 10;
  return { sent: result.ok, reply: result.dryRun ? `Yes, I can come tomorrow at 10am. About $${price}.` : null };
}
