import { escapeXml, placeCall, sendEmail, sendSms } from "./send";
import type { Channel, ContactOptions, ContactResult, OutreachContractor } from "./types";

export async function contactContractor(
  contractor: OutreachContractor, message: string, channel: Channel, opts: ContactOptions,
): Promise<ContactResult> {
  const context = { requestId: opts.requestId, contractorId: contractor.id, contractor };
  if (channel === "email") {
    return sendEmail({
      to: process.env.DEMO_CONTRACTOR_EMAIL || contractor.email || "",
      subject: opts.subject ?? "Maintenance job inquiry", text: message, attachments: opts.attachments,
    }, context);
  }
  const phone = process.env.DEMO_CONTRACTOR_PHONE || contractor.phone;
  if (channel === "call") {
    const base = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
    const query = new URLSearchParams({ requestId: opts.requestId, contractorId: contractor.id });
    const action = `${base}/api/webhooks/twilio/voice?${query}`;
    const twiml = `<Response><Say>${escapeXml(message)}</Say><Gather input="speech" method="POST" action="${escapeXml(action)}"><Say>Please say your availability and price after the beep.</Say></Gather><Say>Thank you, goodbye.</Say></Response>`;
    return placeCall(phone, twiml, context);
  }
  return sendSms(phone, message, context);
}
