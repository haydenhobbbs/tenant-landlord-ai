import type { Category, MaintenanceRequest } from "@/lib/types";
import { contactContractor } from "./contact";
import { listMessages } from "./db";
import { buildIcs } from "./ics";
import { notify } from "./notify";
import type { ContactResult, OutreachContractor } from "./types";

const tradeWords: Record<Category, string> = {
  plumbing: "Plumber", electrical: "Electrician", hvac: "HVAC tech",
  appliance: "Appliance tech", pest: "Pest control", other: "Handyman",
};

export function shortTime(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "time to be confirmed";
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(":00", "").replace(/\s/g, "").toLowerCase();
  return `${day} ${time}`;
}

export async function bookContractor(
  request: MaintenanceRequest, contractor?: OutreachContractor,
): Promise<{ sms?: ContactResult; email?: ContactResult }> {
  const quote = request.quote;
  if (!quote || !Number.isFinite(Date.parse(quote.availableAt))) {
    await notify(`tenant:${request.tenantName}`, "Your landlord approved this repair request. Scheduling is pending.", {
      kind: "status_change", requestId: request.id,
    });
    return {};
  }
  contractor ??= (await listMessages()).find((m) => m.requestId === request.id
    && m.contractorId === quote.contractor.id && m.contractor)?.contractor
    ?? { ...quote.contractor, source: "preapproved" };
  const time = shortTime(quote.availableAt);
  const formatted = new Date(quote.availableAt).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
  const confirmation = `Confirmed: ${request.title} at ${request.unit}, ${formatted}, $${quote.price}.`;
  let email: ContactResult | undefined;
  const attendeeEmail = process.env.DEMO_CONTRACTOR_EMAIL || contractor.email;
  if (attendeeEmail) {
    const ics = buildIcs({
      uid: `${request.id}@tenant-landlord-ai`, title: request.title,
      description: `${request.description}\nTenant: ${request.tenantName}\nAgreed price: $${quote.price}`,
      location: request.unit, start: new Date(quote.availableAt),
      organizerEmail: process.env.RESEND_REPLY_TO || process.env.RESEND_FROM_EMAIL?.match(/<?([^\s<>]+@[^\s<>]+)>?$/)?.[1],
      attendeeEmail,
    });
    email = await contactContractor(contractor, `${confirmation}\nCalendar invite attached.`, "email", {
      requestId: request.id, subject: `Confirmed: ${request.title}`,
      attachments: [{ filename: "job.ics", content: Buffer.from(ics, "utf8").toString("base64") }],
    });
  }
  const sms = await contactContractor(contractor,
    `${confirmation}${email?.ok ? " Calendar invite sent by email." : ""}`, "sms", { requestId: request.id });
  await notify(`tenant:${request.tenantName}`, `${tradeWords[request.category]} booked ${time}`, {
    kind: "booking", requestId: request.id,
  });
  return { sms, email };
}
