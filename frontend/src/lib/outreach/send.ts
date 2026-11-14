import { saveMessage } from "./db";
import type { Channel, ContactResult, OutreachContractor } from "./types";

export interface SendContext {
  requestId?: string;
  contractorId?: string;
  contractor?: OutreachContractor;
}

export interface EmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: string }[];
}

/** Assume US for ten digit numbers; preserve international country codes. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.trim();
}

export function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function deliver(
  channel: Channel, to: string, body: string, from: string, configured: boolean,
  send: () => Promise<string | undefined>, context: SendContext,
): Promise<ContactResult> {
  let result: ContactResult;
  if (!configured) {
    console.log(`[outreach dry run] ${channel}`, { to, from, body });
    result = { ok: true, channel, to, dryRun: true };
  } else if (!to || (channel !== "email" && !/^\+[1-9]\d{7,14}$/.test(to))) {
    result = { ok: false, channel, to, dryRun: false, error: "A valid destination is required" };
  } else {
    try {
      result = { ok: true, channel, to, dryRun: false, providerId: await send() };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provider request failed";
      console.error(`[outreach] ${channel} failed`, message);
      result = { ok: false, channel, to, dryRun: false, error: message };
    }
  }
  await saveMessage({
    id: crypto.randomUUID(), requestId: context.requestId ?? "", contractorId: context.contractorId ?? "",
    contractor: context.contractor, direction: "outbound", channel, to, from, body,
    createdAt: new Date().toISOString(),
  });
  return result;
}

async function twilio(resource: "Messages" | "Calls", params: Record<string, string>): Promise<string | undefined> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/${resource}.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(), signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Twilio ${resource} returned ${response.status}`);
  const data = await response.json() as { sid?: string };
  return data.sid;
}

function twilioReady(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
}

export async function sendSms(to: string, body: string, context: SendContext = {}): Promise<ContactResult> {
  to = normalizePhone(to);
  const from = normalizePhone(process.env.TWILIO_PHONE_NUMBER ?? "");
  return deliver("sms", to, body, from, twilioReady(), () => twilio("Messages", { To: to, From: from, Body: body }), context);
}

export async function placeCall(to: string, twiml: string, context: SendContext = {}): Promise<ContactResult> {
  to = normalizePhone(to);
  const from = normalizePhone(process.env.TWILIO_PHONE_NUMBER ?? "");
  return deliver("call", to, twiml, from, twilioReady(), () => twilio("Calls", { To: to, From: from, Twiml: twiml }), context);
}

export async function sendEmail(input: EmailInput, context: SendContext = {}): Promise<ContactResult> {
  const from = process.env.RESEND_FROM_EMAIL ?? "";
  return deliver("email", input.to, input.text, from, !!(process.env.RESEND_API_KEY && from), async () => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, from, reply_to: process.env.RESEND_REPLY_TO || undefined }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Resend returned ${response.status}`);
    const data = await response.json() as { id?: string };
    return data.id;
  }, context);
}
