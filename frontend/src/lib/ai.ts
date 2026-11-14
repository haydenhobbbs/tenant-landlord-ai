import { CONTRACTORS } from "./contractors";
import type { ContractorQuote, MaintenanceRequest } from "./types";

// 🤖 AI AGENT GOES HERE
//
// Right now this is a fake "AI" that just picks the contractor whose trade
// matches the category and makes up a price. The AI teammate should replace
// the body of this function with a real model call (e.g. Claude) that:
//   1. reads the tenant's description and figures out the trade + urgency
//   2. finds contractors who are available
//   3. returns the best quote with a short reason for the landlord
//
// Keep the function signature the same and nothing else needs to change.
export async function findBestContractor(
  request: MaintenanceRequest,
): Promise<ContractorQuote> {
  const contractor =
    CONTRACTORS.find((c) => c.trade === request.category) ??
    CONTRACTORS[CONTRACTORS.length - 1];

  const basePrice: Record<MaintenanceRequest["urgency"], number> = {
    low: 120,
    medium: 180,
    high: 260,
    emergency: 400,
  };

  const hoursOut = request.urgency === "emergency" ? 2 : request.urgency === "high" ? 24 : 72;
  const availableAt = new Date(Date.now() + hoursOut * 60 * 60 * 1000).toISOString();

  return {
    contractor,
    price: basePrice[request.urgency],
    availableAt,
    aiReason: `${contractor.name} handles ${request.category} jobs, is rated ${contractor.rating}★, and is free soonest.`,
  };
}
