import type { ContactChannel, Contractor } from "../types";
import { escapeXml, placeCall, sendEmail, sendSms } from "./send";
import type { ContactResult } from "./types";

export const jobTag = (requestId: string, contractorId: string) => `[Job ${requestId}~${contractorId}]`;

export function parseJobTag(subject: string): { requestId: string; contractorId: string } | undefined {
  const match = subject.match(/\[Job ([^\s~\]]+)~([^\s\]]+)\]/);
  return match ? { requestId: match[1], contractorId: match[2] } : undefined;
}

export async function contactContractor(
  contractor: Contractor, message: string, channel: ContactChannel, opts: { requestId?: string } = {},
): Promise<{ sent: boolean; reply: string | null }> {
  const context = { requestId: opts.requestId, contractor };
  let result: ContactResult;
  if (channel === "email") {
    const subjectLine = message.match(/^Subject:[ \t]*([^\r\n]*)\r?\n?/i);
    // The tag survives "Re:" replies, so the email webhook can match a reply to
    // the right request and contractor even when every demo email goes to one inbox.
    const tag = opts.requestId ? ` ${jobTag(opts.requestId, contractor.id)}` : "";
    result = await sendEmail({
      to: process.env.DEMO_CONTRACTOR_EMAIL || contractor.email || "",
      subject: `${subjectLine?.[1].trim() || "Maintenance job inquiry"}${tag}`,
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
