// Server data only. Invites owns property storage and all tenant/lease links.
import { createProperty as createInviteProperty, listLandlordProperties, type PropertyInput } from "./invites";
import { isUuid, listRequests, supabase } from "./store";
import { requestMatchesProperty } from "./property-matching";
import type { InviteProperty, MaintenanceRequest, PropertyDetail, PropertySummary } from "./types";

async function requestsFor(landlordId: string): Promise<MaintenanceRequest[]> {
  // Never query the database for a demo ID, or fetch another landlord's requests.
  if (!supabase || !isUuid(landlordId)) {
    return (globalThis as unknown as { __requests?: MaintenanceRequest[] }).__requests ?? [];
  }
  return listRequests({ landlordId });
}

function withRequests(property: InviteProperty, requests: MaintenanceRequest[]): PropertyDetail {
  const residents = [...new Map(property.tenants.map((tenant) => [tenant.id, {
    tenantId: tenant.id, name: tenant.name, unit: tenant.unit,
  }])).values()];
  const summary = { ...property, residents, openRequestCount: 0 };
  const matched = requests.filter((request) => requestMatchesProperty(request, summary)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { ...summary, openRequestCount: matched.filter((request) => request.status !== "completed" && request.status !== "declined").length, requests: matched };
}

export async function listProperties(landlordId: string): Promise<PropertySummary[]> {
  const [properties, requests] = await Promise.all([listLandlordProperties(landlordId), requestsFor(landlordId)]);
  return properties.map((property) => {
    const { requests: matched, ...summary } = withRequests(property, requests);
    void matched;
    return summary;
  });
}

export async function getProperty(landlordId: string, id: string): Promise<PropertyDetail | undefined> {
  const property = (await listLandlordProperties(landlordId)).find((item) => item.id === id);
  return property ? withRequests(property, await requestsFor(landlordId)) : undefined;
}

export async function createProperty(landlordId: string, input: PropertyInput): Promise<PropertySummary> {
  const property = await createInviteProperty(landlordId, input);
  return { ...property, residents: [], openRequestCount: 0 };
}
