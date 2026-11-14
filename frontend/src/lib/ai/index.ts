// 🤖 AI BRAIN (owner: Hayden)
//
// Every function here is a FAKE placeholder so the app works end to end today.
// Replace each body with a real Claude call (ANTHROPIC_API_KEY is already set
// on Vercel; put your own copy in frontend/.env.local). Keep the function
// names, inputs and outputs the same and nothing else needs to change.
// Tip: keep the fake logic as a fallback when there's no API key.

import type {
  ContactChannel,
  Contractor,
  ContractorOffer,
  LegalGuidance,
  MaintenanceRequest,
  Trade,
  Urgency,
} from "../types";

// 1. Understand the tenant's message -> trade + urgency.
export async function triageRequest(
  request: Pick<MaintenanceRequest, "title" | "description" | "urgency" | "photos">,
): Promise<{ trade: Trade; urgency: Urgency }> {
  const text = `${request.title} ${request.description}`.toLowerCase();
  const rules: [Trade, RegExp][] = [
    ["plumbing", /leak|sink|toilet|pipe|drain|water|faucet|shower/],
    ["electrical", /outlet|power|light|breaker|electric|switch|spark/],
    ["hvac", /heat|ac\b|air ?condition|furnace|thermostat|cold|hot air/],
    ["appliance", /fridge|refrigerator|oven|stove|dishwasher|washer|dryer|microwave/],
    ["pest", /mouse|mice|rat|roach|bug|ant|pest|termite/],
  ];
  const trade = rules.find(([, re]) => re.test(text))?.[0] ?? "general";
  return { trade, urgency: request.urgency };
}

// 2. What the AI says when it contacts a contractor.
export async function writeOutreachMessage(
  request: MaintenanceRequest,
  contractor: Contractor,
  channel: ContactChannel,
): Promise<string> {
  const where = request.property ? `${request.property.city}, ${request.property.state}` : "a rental unit";
  const intro = channel === "email" ? `Hi ${contractor.name},\n\n` : `Hi ${contractor.name}, `;
  return `${intro}we have a ${request.urgency}-priority ${request.trade ?? "repair"} job in ${where}: "${request.title}". Are you available, and what's your earliest time and estimated price? Reply YES with a time and price, or NO.`;
}

// 3. Read a contractor's reply ("Yes, Tue 10am, $180") -> structured answer.
export async function readContractorReply(
  reply: string,
): Promise<Pick<ContractorOffer, "available" | "availableAt" | "price">> {
  const available = /\byes\b|available|can do|sure/i.test(reply) && !/\bno\b/i.test(reply);
  const price = Number(reply.match(/\$\s?(\d+)/)?.[1]) || undefined;
  return {
    available,
    price,
    // Fake: assume "tomorrow 10am". The real AI should parse the actual time.
    availableAt: available ? nextDayAt(10) : undefined,
  };
}

// 4. Rank the offers and explain the choice to the landlord.
export async function rankOffers(
  request: MaintenanceRequest,
  offers: Omit<ContractorOffer, "aiReason">[],
): Promise<ContractorOffer[]> {
  return offers
    .filter((o) => o.available)
    .sort(
      (a, b) =>
        Number(b.contractor.source === "preapproved") - Number(a.contractor.source === "preapproved") ||
        (a.availableAt ?? "").localeCompare(b.availableAt ?? "") ||
        (a.price ?? Infinity) - (b.price ?? Infinity),
    )
    .map((o) => ({
      ...o,
      aiReason: [
        o.contractor.source === "preapproved" ? "On your trusted list" : "Found online",
        o.contractor.rating ? `rated ${o.contractor.rating}★` : null,
        o.price ? `quoted $${o.price}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
}

// 5. Lawful-handling guidance for the landlord, based on location + issue.
export async function getLegalGuidance(request: MaintenanceRequest): Promise<LegalGuidance> {
  const state = request.property?.state ?? "your state";
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
    sources: [{ title: `${state} landlord-tenant law (placeholder: AI will cite real sources)` }],
    disclaimer: "General information, not legal advice. Check your local laws or ask an attorney.",
  };
}

function nextDayAt(hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
