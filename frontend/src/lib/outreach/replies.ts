import { readContractorReply, rankOffers } from "@/lib/ai";
import { getRequest, saveRequest } from "@/lib/store";
import type { ContactChannel, Contractor, ContractorOffer } from "../types";
import { listMessages, saveMessage } from "./db";
import { notify } from "./notify";
import { normalizePhone } from "./send";

const addressKey = (address: string) => address.includes("@")
  ? (address.match(/<([^<>]+)>/)?.[1] ?? address).trim().toLowerCase() : normalizePhone(address);

export async function findThreadByAddress(from: string) {
  const key = addressKey(from);
  if (!key) return undefined;
  const thread = (await listMessages()).find((m) => m.direction === "outbound"
    && [m.to, m.contractor.phone, m.contractor.email].some((a) => a && addressKey(a) === key));
  return thread && { requestId: thread.requestId, contractor: thread.contractor, channel: thread.channel };
}

export async function findThreadByContractor(requestId: string, contractorId: string) {
  return (await listMessages(requestId, contractorId)).find((m) => m.direction === "outbound");
}

export async function onContractorReply(
  requestId: string, contractor: Contractor, text: string, channel: ContactChannel,
): Promise<void> {
  try {
    await saveMessage({
      id: crypto.randomUUID(), requestId, contractor, channel, direction: "inbound",
      body: text, createdAt: new Date().toISOString(),
    });
    const parsed = await readContractorReply(text);
    const request = await getRequest(requestId);
    if (!request || !["submitted", "finding_contractor", "contractor_suggested"].includes(request.status)) return;
    const offers: Omit<ContractorOffer, "aiReason">[] = request.suggestions
      .filter((o) => o.contractor.id !== contractor.id)
      .map(({ contractor, channel, available, availableAt, price }) => ({ contractor, channel, available, availableAt, price }));
    offers.push({ contractor, channel, ...parsed });
    const suggestions = await rankOffers(request, offers);
    // Reload after AI work so an approval received while ranking is preserved.
    const latest = await getRequest(requestId);
    if (!latest || !["submitted", "finding_contractor", "contractor_suggested"].includes(latest.status)) return;
    await saveRequest({ ...latest, suggestions, status: suggestions.length ? "contractor_suggested" : latest.status });
    const details = [parsed.price !== undefined ? `$${parsed.price}` : undefined,
      parsed.availableAt ? new Date(parsed.availableAt).toLocaleString("en-US", {
        weekday: "short", hour: "numeric", minute: "2-digit",
      }) : undefined].filter(Boolean).join(", ");
    await notify({ userId: request.landlordId, name: "Landlord" }, parsed.available
      ? `${contractor.name} replied: ${details || text}`
      : `${contractor.name} can't take the job.`, { type: "request_update", requestId });
  } catch (error) {
    console.error("[outreach] Could not update request from reply", error);
  }
}
