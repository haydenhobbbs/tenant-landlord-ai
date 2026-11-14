import { getRequest, saveRequest } from "@/lib/store";
import { listMessages, saveMessage } from "./db";
import { notify } from "./notify";
import { normalizePhone } from "./send";
import type { Channel, OutreachMessage, ParsedReply } from "./types";

const addressKey = (address: string) => address.includes("@")
  ? address.trim().toLowerCase() : normalizePhone(address);

export async function findThreadByAddress(from: string): Promise<OutreachMessage | undefined> {
  const key = addressKey(from);
  if (!key) return undefined;
  return (await listMessages()).find((m) => m.direction === "outbound" && m.requestId && m.contractorId
    && addressKey(m.to) === key);
}

/** Local wall time in the server's TZ; relative dates choose the next occurrence. */
function heuristicReply(text: string, now = new Date()): ParsedReply {
  const priceMatch = text.match(/\$\s?(\d+)/);
  const timeMatch = text.match(/\b(?:(today|tomorrow|sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?)\s*(?:at\s*)?)?(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
  // A bare "no" only counts at the start ("No, sorry"), so "no problem, Tue 10am" still reads as yes.
  const unavailable = /^\s*no\b(?![\s,]+(?:problem|worries))|\b(?:cannot|not\s+available|fully\s+booked|unavailable)\b|\bcan['’]t\b/i.test(text);
  const result: ParsedReply = {
    available: unavailable ? false : timeMatch || priceMatch ? true : null,
    notes: text,
  };
  if (priceMatch) result.price = Number(priceMatch[1]);
  if (timeMatch) {
    result.proposedTimeText = timeMatch[0].trim();
    const date = new Date(now);
    const hour = Number(timeMatch[2]) % 12 + (/^p/i.test(timeMatch[4]) ? 12 : 0);
    date.setHours(hour, Number(timeMatch[3] ?? 0), 0, 0);
    const day = timeMatch[1]?.toLowerCase();
    if (day === "tomorrow") date.setDate(date.getDate() + 1);
    else if (day && day !== "today") {
      const target = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(day.slice(0, 3));
      const offset = (target - now.getDay() + 7) % 7;
      date.setDate(date.getDate() + offset);
      if (date <= now) date.setDate(date.getDate() + 7);
    } else if (!day && date <= now) date.setDate(date.getDate() + 1);
    result.proposedTime = date.toISOString();
  }
  return result;
}

function validReply(value: unknown): value is ParsedReply {
  if (!value || typeof value !== "object") return false;
  const r = value as ParsedReply;
  return (r.available === null || typeof r.available === "boolean")
    && (r.price === undefined || (typeof r.price === "number" && Number.isFinite(r.price) && r.price >= 0))
    && (r.proposedTime === undefined || (typeof r.proposedTime === "string" && Number.isFinite(Date.parse(r.proposedTime))))
    && (r.proposedTimeText === undefined || typeof r.proposedTimeText === "string")
    && (r.notes === undefined || typeof r.notes === "string");
}

export async function interpretReply(text: string): Promise<ParsedReply> {
  try {
    // The AI teammate's module is optional. Keep the specifier dynamic so a
    // checkout without it still typechecks and builds.
    const specifier = "@/lib/ai/readReply";
    const ai = await import(specifier) as { readContractorReply?: (text: string) => Promise<unknown> };
    if (typeof ai.readContractorReply === "function") {
      const parsed = await ai.readContractorReply(text);
      if (validReply(parsed)) return parsed;
    }
  } catch {
    // Missing module, missing model keys, or provider failure: parse locally.
  }
  return heuristicReply(text);
}

export async function onContractorReply(
  requestId: string, contractorId: string, text: string,
  context?: { thread?: OutreachMessage; channel?: Channel },
): Promise<ParsedReply> {
  const thread = context?.thread ?? (await listMessages()).find((m) => m.direction === "outbound"
    && m.requestId === requestId && m.contractorId === contractorId
    && (!context?.channel || m.channel === context.channel));
  await saveMessage({
    id: crypto.randomUUID(), requestId, contractorId, contractor: thread?.contractor,
    channel: context?.channel ?? thread?.channel ?? "sms", direction: "inbound", to: thread?.from ?? "",
    from: thread?.to ?? "", body: text, createdAt: new Date().toISOString(),
  });
  const parsed = await interpretReply(text);
  try {
    const request = await getRequest(requestId);
    if (!request) return parsed;
    const contractor = thread?.contractor
      ?? (request.quote?.contractor.id === contractorId ? request.quote.contractor : undefined)
      ?? { id: contractorId, name: "Contractor", trade: request.category, rating: 0, phone: thread?.to ?? "" };
    const previous = request.quote?.contractor.id === contractorId ? request.quote : undefined;
    request.quote = {
      contractor, price: parsed.price ?? previous?.price ?? 0,
      availableAt: parsed.proposedTime ?? previous?.availableAt ?? "",
      aiReason: `Replied by text: "${text}"`,
    };
    request.status = "awaiting_approval";
    await saveRequest(request);
    const details = [parsed.price !== undefined ? `$${parsed.price}` : undefined, parsed.proposedTimeText].filter(Boolean).join(", ");
    await notify("landlord", parsed.available === false
      ? `${contractor.name} is unavailable: ${text}`
      : parsed.price !== undefined ? `New price from ${contractor.name}: ${details}`
        : `New reply from ${contractor.name}: ${text}`, { kind: "new_message", requestId });
  } catch (error) {
    console.error("[outreach] Could not update request from reply", error);
  }
  return parsed;
}
