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
import { saveRequest } from "./store";
import { timeZoneFor } from "./timezone";
import type { Contractor, ContractorOffer, MaintenanceRequest } from "./types";

const MAX_CONTACTS = 3;

// In demo mode every contractor's email or text is redirected to one teammate
// inbox/phone, so contacting 3 would land 3 near-identical messages there.
// Contact only the top choice (preapproved first) when a redirect is set.
function contactLimit(): number {
  return process.env.DEMO_CONTRACTOR_EMAIL || process.env.DEMO_CONTRACTOR_PHONE ? 1 : MAX_CONTACTS;
}

// Tenant just submitted -> AI finds + contacts contractors -> landlord gets suggestions.
export async function processNewRequest(request: MaintenanceRequest): Promise<MaintenanceRequest> {
  const { trade, urgency } = await triageRequest(request);
  request = await saveRequest({ ...request, trade, urgency, status: "finding_contractor" });

  // Legal research runs in the background while contractors are contacted.
  const legalPromise = getLegalGuidance(request);

  const [preapproved, online] = await Promise.all([
    getPreapprovedContractors(request.landlordId, trade),
    searchContractorsOnline(trade, request.property),
  ]);
  const candidates = [...preapproved, ...online].slice(0, contactLimit());

  // Contact all candidates at once.
  const results = await Promise.all(
    candidates.map(async (contractor): Promise<Omit<ContractorOffer, "aiReason"> | null> => {
      const channel = pickChannel(contractor);
      const message = await writeOutreachMessage(request, contractor, channel);
      const { reply } = await contactContractor(contractor, message, channel, { requestId: request.id });
      return reply ? { contractor, channel, ...(await readContractorReply(reply, { timeZone: timeZoneFor(request.property?.state) })) } : null;
    }),
  );
  const offers = results.filter((o): o is Omit<ContractorOffer, "aiReason"> => o !== null);

  const [suggestions, legalGuidance] = await Promise.all([rankOffers(request, offers), legalPromise]);

  request = await saveRequest({
    ...request,
    suggestions,
    legalGuidance,
    status: suggestions.length ? "contractor_suggested" : "finding_contractor",
  });
  await notify({ userId: request.landlordId, name: "Landlord" }, `New repair request needs your approval: ${request.title}`);
  if (suggestions.length) {
    await notify(
      { userId: request.tenantId, name: request.tenantName },
      `We found ${suggestions.length === 1 ? "a repair person" : `${suggestions.length} repair people`} for "${request.title}". Waiting on your landlord to choose.`,
      { link: `/tenant/requests/${request.id}`, requestId: request.id },
    );
  }
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
  const { reply } = await contactContractor(clean, message, channel, { requestId: request.id });
  // With no email/SMS keys the contact is simulated and replies right away.
  if (reply) await onContractorReply(request.id, clean, reply, channel);
  return { ok: true, contractor: clean };
}
