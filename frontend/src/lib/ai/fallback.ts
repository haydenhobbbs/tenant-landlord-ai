// Simple rule-based versions of every AI function. Used when there's no
// ANTHROPIC_API_KEY (e.g. teammates running locally) or if a Claude call fails.

import type { ContractorOffer, LegalGuidance, MaintenanceRequest, Trade, Urgency } from "../types";

export const DISCLAIMER = "General information, not legal advice. Check your local laws or ask an attorney.";

export function fakeTriage(request: Pick<MaintenanceRequest, "title" | "description" | "urgency">): { trade: Trade; urgency: Urgency } {
  const text = `${request.title} ${request.description}`.toLowerCase();
  const rules: [Trade, RegExp][] = [
    ["plumbing", /leak|sink|toilet|pipe|drain|water|faucet|shower/],
    ["electrical", /outlet|power|light|breaker|electric|switch|spark/],
    ["hvac", /heat|ac\b|air ?condition|furnace|thermostat|cold|hot air/],
    ["appliance", /fridge|refrigerator|oven|stove|dishwasher|washer|dryer|microwave/],
    ["pest", /mouse|mice|rat|roach|bug|ant|pest|termite/],
  ];
  return { trade: rules.find(([, re]) => re.test(text))?.[0] ?? "general", urgency: request.urgency };
}

export function fakeOutreach(request: MaintenanceRequest, contractorName: string, channel: string): string {
  const where = request.property ? `${request.property.city}, ${request.property.state}` : "a rental unit";
  const intro = channel === "email" ? `Hi ${contractorName},\n\n` : `Hi ${contractorName}, `;
  return `${intro}we have a ${request.urgency}-priority ${request.trade ?? "repair"} job in ${where}: "${request.title}". Are you available, and what's your earliest time and estimated price? Reply YES with a time and price, or NO.`;
}

export function fakeReadReply(reply: string): Pick<ContractorOffer, "available" | "availableAt" | "price"> {
  const available = /\byes\b|available|can do|sure/i.test(reply) && !/\bno\b/i.test(reply);
  const price = Number(reply.match(/\$\s?(\d+)/)?.[1]) || undefined;
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return { available, price, availableAt: available ? d.toISOString() : undefined };
}

export function fakeRank(offers: Omit<ContractorOffer, "aiReason">[]): ContractorOffer[] {
  return offers
    .filter((o) => o.available)
    .sort(
      (a, b) =>
        Number(b.contractor.source === "preapproved") - Number(a.contractor.source === "preapproved") ||
        (a.availableAt ?? "").localeCompare(b.availableAt ?? "") ||
        (a.price ?? Infinity) - (b.price ?? Infinity),
    )
    .map((o) => ({ ...o, aiReason: fakeReason(o) }));
}

export function fakeReason(o: Omit<ContractorOffer, "aiReason">): string {
  return [
    o.contractor.source === "preapproved" ? "On your trusted list" : "Found online",
    o.contractor.rating ? `rated ${o.contractor.rating}★` : null,
    o.price ? `quoted $${o.price}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function fakeLegalGuidance(request: MaintenanceRequest): LegalGuidance {
  const state = request.property?.state || "your state";
  const urgent = request.urgency === "high" || request.urgency === "emergency";
  return {
    summary: urgent
      ? `This sounds like a habitability issue. In ${state}, landlords generally must start urgent repairs quickly.`
      : `This is a routine repair. Fix it within a reasonable time and give proper notice before entering.`,
    mustDo: [
      { action: "Reply to the tenant in writing to acknowledge the request", deadline: "Today" },
      { action: "Give written notice before you or a contractor enter the unit", deadline: "At least 24 hours before (check local rules)" },
      { action: urgent ? "Start the repair" : "Complete the repair", deadline: urgent ? "Within 24–72 hours" : "Within a reasonable time (often 7–30 days)" },
    ],
    sources: [],
    disclaimer: DISCLAIMER,
  };
}
