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
  pickChannel,
  searchContractorsOnline,
} from "./outreach";
import { saveRequest } from "./store";
import { timeZoneFor } from "./timezone";
import type { ContractorOffer, MaintenanceRequest } from "./types";

const MAX_CONTACTS = 3;

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
  const candidates = [...preapproved, ...online].slice(0, MAX_CONTACTS);

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
  );
  return request;
}

export async function declineRequest(request: MaintenanceRequest): Promise<MaintenanceRequest> {
  request = await saveRequest({ ...request, status: "declined" });
  await notify({ userId: request.tenantId, name: request.tenantName }, `Your request "${request.title}" was declined.`);
  return request;
}

export async function completeRequest(request: MaintenanceRequest): Promise<MaintenanceRequest> {
  return saveRequest({ ...request, status: "completed" });
}
