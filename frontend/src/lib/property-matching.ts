import type { MaintenanceRequest, PropertySummary } from "./types";

const normalizedAddress = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

// Explicit ownership takes precedence. Legacy requests may have no landlord ID.
export function requestMatchesProperty(request: MaintenanceRequest, property: PropertySummary): boolean {
  if (request.landlordId && request.landlordId !== property.landlordId) return false;
  if (request.tenantId && property.residents.some((resident) => resident.tenantId === request.tenantId)) return true;
  const address = request.property?.address;
  return !!address && !!normalizedAddress(address) && normalizedAddress(address) === normalizedAddress(property.address)
    && (!request.property?.state || request.property.state.trim().toUpperCase() === property.state.trim().toUpperCase())
    && (!request.property?.city || normalizedAddress(request.property.city) === normalizedAddress(property.city));
}
