import { findThreadByAddress, onContractorReply } from "@/lib/outreach/replies";
import { validTwilioSignature } from "@/lib/outreach/twilio";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => undefined);
  if (!form) return new Response("Invalid form", { status: 400 });
  if (!validTwilioSignature(request, form)) return new Response("Invalid Twilio signature", { status: 403 });
  const from = form.get("From");
  const body = form.get("Body");
  const thread = typeof from === "string" ? await findThreadByAddress(from) : undefined;
  if (!thread || typeof body !== "string" || !body.trim()) {
    return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });
  }
  await onContractorReply(thread.requestId, thread.contractorId, body, { thread, channel: "sms" });
  return new Response("<Response><Message>Thanks! We'll confirm with the landlord shortly.</Message></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
}
