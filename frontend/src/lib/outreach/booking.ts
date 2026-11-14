import { timeZoneFor } from "../timezone";
import type { ContractorOffer, MaintenanceRequest } from "../types";
import { buildIcs } from "./ics";
import { sendEmail, sendSms } from "./send";

export async function confirmBooking(request: MaintenanceRequest, offer: ContractorOffer): Promise<void> {
  try {
    const contractor = offer.contractor;
    const start = offer.availableAt && Number.isFinite(Date.parse(offer.availableAt))
      ? new Date(offer.availableAt) : new Date(Date.now() + 86_400_000);
    const location = [request.property?.address, request.property?.city,
      [request.property?.state, request.property?.zip].filter(Boolean).join(" "), request.unit].filter(Boolean).join(", ");
    const confirmation = `Confirmed: ${request.title} at ${location}, ${start.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone: timeZoneFor(request.property?.state) })}${offer.price !== undefined ? `, $${offer.price}` : ""}.`;
    const attendeeEmail = process.env.DEMO_CONTRACTOR_EMAIL || contractor.email || "";
    const ics = buildIcs({
      uid: `${request.id}@tenant-landlord-ai`, title: `${request.title} — ${request.unit}`,
      description: `${request.description}\n${offer.price !== undefined ? `Agreed price: $${offer.price}` : ""}`,
      location, start,
      organizerEmail: process.env.RESEND_REPLY_TO || process.env.RESEND_FROM_EMAIL?.match(/<?([^\s<>]+@[^\s<>]+)>?$/)?.[1],
      attendeeEmail: attendeeEmail || undefined,
    });
    const context = { requestId: request.id, contractor };
    await Promise.all([
      sendSms(process.env.DEMO_CONTRACTOR_PHONE || contractor.phone || "", confirmation, context),
      sendEmail({
        to: attendeeEmail, subject: `Confirmed: ${request.title}`, text: `${confirmation}\nCalendar invite attached.`,
        attachments: [{ filename: "job.ics", content: Buffer.from(ics, "utf8").toString("base64") }],
      }, context),
    ]);
  } catch (error) {
    console.error("[outreach] Booking confirmation failed", error);
  }
}
