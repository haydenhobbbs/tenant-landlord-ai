// 🔁 THE FLOW: connects the AI (lib/ai) and outreach (lib/outreach).
//
//   submitted -> finding_contractor -> contractor_suggested
//             -> landlord_approved -> scheduled -> completed
//
// You usually don't need to edit this. Change the functions it calls instead.

import { getLegalGuidance, rankOffers, readContractorReply, triageRequest, writeOutreachMessage } from "./ai";
import {
  confirmBooking,
  contactContractor,
  getPreapprovedContractors,
  notify,
  onContractorReply,
  pickChannel,
  searchContractorsOnline,
} from "./outreach";
import { listMessages } from "./outreach/db";
import { addMessage } from "./tenantData";
import { getRequest, saveRequest } from "./store";
import { timeZoneFor } from "./timezone";
import type { Contractor, ContractorOffer, MaintenanceRequest } from "./types";

const MAX_CONTACTS = 3;

// In demo mode every contractor's email or text is redirected to one teammate
// inbox/phone, so contacting 3 would land 3 near-identical messages there.
// Contact only the top choice (preapproved first) when a redirect is set.
function contactLimit(): number {
  return process.env.DEMO_CONTRACTOR_EMAIL || process.env.DEMO_CONTRACTOR_PHONE ? 1 : MAX_CONTACTS;
}

/** "Plumbing repair request in Austin, TX". Short and the same every time. */
function emailSubject(request: MaintenanceRequest): string {
  const kind = request.trade && request.trade !== "general"
    ? `${request.trade === "hvac" ? "HVAC" : request.trade[0].toUpperCase() + request.trade.slice(1)} repair request`
    : "Repair request";
  const where = [request.property?.city, request.property?.state].filter(Boolean).join(", ");
  return where ? `${kind} in ${where}` : kind;
}

// Tenant just submitted -> AI sorts it and researches the rules -> landlord decides.
// NO contractor is contacted here: the landlord may fix it themselves, so outreach
// waits until they press "Have the AI contact a contractor" (findContractors).
export async function processNewRequest(request: MaintenanceRequest): Promise<MaintenanceRequest> {
  const { trade, urgency } = await triageRequest(request);
  request = await saveRequest({ ...request, trade, urgency });
  await notify(
    { userId: request.landlordId, name: "Landlord" },
    `New repair request needs your decision: ${request.title}`,
    { link: `/landlord/requests/${request.id}`, requestId: request.id },
  );

  const legalGuidance = await getLegalGuidance(request);
  // Reload so a decision the landlord made during the research isn't overwritten.
  const latest = (await getRequest(request.id)) ?? request;
  return saveRequest({ ...latest, trade: latest.trade ?? trade, urgency: latest.urgency ?? urgency, legalGuidance });
}

// Landlord said "go": the AI contacts contractors (trusted ones first) and
// replies become suggestions the landlord can approve.
export async function findContractors(request: MaintenanceRequest): Promise<MaintenanceRequest> {
  let trade = request.trade;
  if (!trade) {
    // The landlord decided before sorting finished; sort now.
    const triage = await triageRequest(request);
    trade = triage.trade;
    request = await saveRequest({ ...request, trade, urgency: triage.urgency });
  }

  const [preapproved, online] = await Promise.all([
    getPreapprovedContractors(request.landlordId, trade),
    searchContractorsOnline(trade, request.property),
  ]);
  const alreadyContacted = new Set((await listMessages(request.id)).filter((m) => m.direction === "outbound").map((m) => m.contractor.id));
  const candidates = [...preapproved, ...online].filter((c) => !alreadyContacted.has(c.id)).slice(0, contactLimit());

  // Contact all candidates at once.
  const results = await Promise.all(
    candidates.map(async (contractor): Promise<Omit<ContractorOffer, "aiReason"> | null> => {
      const channel = pickChannel(contractor);
      const message = await writeOutreachMessage(request, contractor, channel);
      const { reply } = await contactContractor(contractor, message, channel, { requestId: request.id, subject: emailSubject(request) });
      return reply ? { contractor, channel, ...(await readContractorReply(reply, { timeZone: timeZoneFor(request.property?.state) })) } : null;
    }),
  );
  const offers = results.filter((o): o is Omit<ContractorOffer, "aiReason"> => o !== null);
  if (!offers.length) return request; // real email: replies arrive later through the webhook

  const latest = (await getRequest(request.id)) ?? request;
  if (!OPEN_STATUSES.includes(latest.status)) return latest;
  const previous = latest.suggestions.map(({ contractor, channel, available, availableAt, price }) => ({ contractor, channel, available, availableAt, price }));
  const suggestions = await rankOffers(latest, [...previous, ...offers]);
  request = await saveRequest({ ...latest, suggestions, status: "contractor_suggested" });
  await notify(
    { userId: request.tenantId, name: request.tenantName },
    `We found ${suggestions.length === 1 ? "a repair person" : `${suggestions.length} repair people`} for "${request.title}". Waiting on your landlord to choose.`,
    { link: `/tenant/requests/${request.id}`, requestId: request.id },
  );
  return request;
}

/** Mark the request as "finding a contractor" right away and tell the tenant. */
export async function startFindingContractors(request: MaintenanceRequest): Promise<MaintenanceRequest> {
  request = await saveRequest({ ...request, status: "finding_contractor" });
  await notify(
    { userId: request.tenantId, name: request.tenantName },
    `Your landlord approved "${request.title}". We're contacting repair people now.`,
    { link: `/tenant/requests/${request.id}`, requestId: request.id },
  );
  return request;
}

// Landlord approves one of the suggestions -> confirm with contractor -> scheduled.
export async function approveRequest(request: MaintenanceRequest, offerIndex = 0): Promise<MaintenanceRequest> {
  const selected = request.suggestions[offerIndex];
  if (!selected) throw new Error("No contractor suggestion to approve");

  request = await saveRequest({ ...request, selected, status: "landlord_approved" });
  await confirmBooking(request, selected);

  request = await saveRequest({ ...request, scheduledAt: selected.availableAt, status: "scheduled" });
  await notify(
    { userId: request.tenantId, name: request.tenantName },
    `${selected.contractor.name} is booked for ${request.title}${selected.availableAt ? ` on ${new Date(selected.availableAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone: timeZoneFor(request.property?.state) })}` : ""}.`,
    { link: `/tenant/requests/${request.id}`, requestId: request.id },
  );
  return request;
}

export async function declineRequest(request: MaintenanceRequest): Promise<MaintenanceRequest> {
  request = await saveRequest({ ...request, status: "declined" });
  await notify({ userId: request.tenantId, name: request.tenantName }, `Your request "${request.title}" was declined.`, {
    link: `/tenant/requests/${request.id}`,
    requestId: request.id,
  });
  return request;
}

export async function completeRequest(request: MaintenanceRequest): Promise<MaintenanceRequest> {
  return saveRequest({ ...request, status: "completed" });
}

// ---------- Landlord chooses to ask more contractors ----------
// The automatic outreach only reaches the top choice in demo mode. These let the
// landlord have the AI email other nearby contractors (found online) one at a time.

const OPEN_STATUSES = ["submitted", "finding_contractor", "contractor_suggested"];

export type ExtraContractor = Contractor & { contacted: boolean };

/** Contractors found online for this request, marked if the AI already contacted them. */
export async function listExtraContractors(request: MaintenanceRequest): Promise<ExtraContractor[]> {
  if (!request.trade) return [];
  const [online, sent] = await Promise.all([
    searchContractorsOnline(request.trade, request.property),
    listMessages(request.id),
  ]);
  const contacted = new Set(sent.filter((m) => m.direction === "outbound").map((m) => m.contractor.id));
  return online.map((c) => ({ ...c, contacted: contacted.has(c.id) }));
}

/** The AI writes to one more contractor. Their reply comes back through the normal reply flow. */
export async function contactExtraContractor(
  request: MaintenanceRequest, contractorId: string,
): Promise<{ ok: true; contractor: Contractor } | { ok: false; error: string; status: number }> {
  if (!OPEN_STATUSES.includes(request.status)) {
    return { ok: false, error: `This request is already ${request.status}.`, status: 409 };
  }
  // Look the contractor up again on the server; never trust contact details from the browser.
  const contractor = (await listExtraContractors(request)).find((c) => c.id === contractorId);
  if (!contractor) return { ok: false, error: "That contractor isn't in the search results.", status: 404 };
  if (contractor.contacted) return { ok: false, error: `${contractor.name} was already contacted.`, status: 409 };

  const { contacted: _contacted, ...clean } = contractor;
  void _contacted;
  const channel = pickChannel(clean);
  const message = await writeOutreachMessage(request, clean, channel);
  if (request.status === "submitted") request = await startFindingContractors(request);
  const { reply } = await contactContractor(clean, message, channel, { requestId: request.id, subject: emailSubject(request) });
  // With no email/SMS keys the contact is simulated and replies right away.
  if (reply) await onContractorReply(request.id, clean, reply, channel);
  return { ok: true, contractor: clean };
}

// ---------- Landlord handles it personally ----------
// For small jobs ("tighten a cabinet hinge") the landlord can skip contractors.
// The request becomes "Booked" with the landlord as the repair person, the tenant
// is told, and any contractor replies that arrive later are only logged.

export async function handleItMyself(
  request: MaintenanceRequest,
  landlord: { id: string; name: string },
  opts: { when?: string; note?: string } = {},
): Promise<MaintenanceRequest | { error: string }> {
  if (!OPEN_STATUSES.includes(request.status)) return { error: `This request is already ${request.status}.` };
  const when = opts.when && !Number.isNaN(Date.parse(opts.when)) ? new Date(opts.when).toISOString() : undefined;
  const name = landlord.name || "Your landlord";
  const selected: ContractorOffer = {
    contractor: { id: "landlord-self", name: `${name} (your landlord)`, trade: request.trade ?? "general", source: "preapproved" },
    channel: "email",
    available: true,
    availableAt: when,
    aiReason: "Your landlord is handling this repair personally.",
  };
  request = await saveRequest({ ...request, selected, scheduledAt: when, status: "scheduled" });

  const timeZone = timeZoneFor(request.property?.state);
  const whenText = when
    ? ` on ${new Date(when).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone })}`
    : "";
  await notify(
    { userId: request.tenantId, name: request.tenantName },
    `${name} will take care of "${request.title}" personally${whenText}.`,
    { link: `/tenant/requests/${request.id}`, requestId: request.id },
  );
  const note = opts.note?.trim();
  if (note && request.tenantId) {
    await addMessage({
      id: crypto.randomUUID(), tenantId: request.tenantId, senderId: landlord.id, senderRole: "landlord",
      senderName: name, body: note.slice(0, 2000), createdAt: new Date().toISOString(),
    }).catch((err) => console.error("[pipeline] note to tenant failed", err));
  }
  return request;
}

// ---------- Who the AI contacted for a request ----------

export interface ContactLogEntry {
  id: string;
  contractorName: string;
  contractorSource: Contractor["source"];
  channel: ContractorOffer["channel"];
  direction: "sent" | "reply";
  to?: string;
  body: string;
  createdAt: string;
}

export async function contactHistory(requestId: string): Promise<ContactLogEntry[]> {
  const log = await listMessages(requestId);
  return log
    .map((m) => ({
      id: m.id,
      contractorName: m.contractor.name,
      contractorSource: m.contractor.source,
      channel: m.channel,
      direction: m.direction === "outbound" ? ("sent" as const) : ("reply" as const),
      to: m.direction === "outbound" ? m.to : undefined,
      body: m.body,
      createdAt: m.createdAt,
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
