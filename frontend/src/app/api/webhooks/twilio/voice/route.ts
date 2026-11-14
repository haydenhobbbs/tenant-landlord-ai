import { onContractorReply } from "@/lib/outreach/replies";
import { validTwilioSignature } from "@/lib/outreach/twilio";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => undefined);
  if (!form) return new Response("Invalid form", { status: 400 });
  if (!validTwilioSignature(request, form)) return new Response("Invalid Twilio signature", { status: 403 });
  const query = new URL(request.url).searchParams;
  const requestId = query.get("requestId");
  const contractorId = query.get("contractorId");
  const speech = form.get("SpeechResult");
  if (requestId && contractorId && typeof speech === "string" && speech.trim()) {
    await onContractorReply(requestId, contractorId, speech, { channel: "call" });
  }
  return new Response("<Response><Say>Thank you, goodbye.</Say></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
}
