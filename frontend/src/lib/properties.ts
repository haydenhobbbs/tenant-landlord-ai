// Server data only: never import this module from a client component.
import { isUuid, listRequests, supabase } from "./store";
import { requestMatchesProperty } from "./property-matching";
import type { MaintenanceRequest, Property, PropertyDetail, PropertyResident, PropertySummary } from "./types";

type StoredProperty = Property & { residents: PropertyResident[] };
const globalStore = globalThis as unknown as {
  __properties?: StoredProperty[];
  __propertyFallback?: Set<string>;
  __requests?: MaintenanceRequest[];
};
const demo = (id: string, address: string, city: string, state: string, zip: string, residents: PropertyResident[]): StoredProperty => ({ id, landlordId: "demo-landlord", address, city, state, zip, residents });
globalStore.__properties ??= [
  demo("demo-maple", "1420 Maple Ave", "Columbus", "OH", "43215", [{ tenantId: "demo-jordan", name: "Jordan Lee", unit: "Apt 3B" }]),
  demo("demo-riverside", "88 Riverside Dr", "Austin", "TX", "78704", [{ tenantId: "demo-sam", name: "Sam Rivera", unit: "Unit 2" }, { tenantId: "demo-priya", name: "Priya Shah", unit: "Unit 2" }]),
  demo("demo-pine", "503 Pine St", "Denver", "CO", "80203", [{ tenantId: "demo-alex", name: "Alex Kim", unit: "Unit 1" }]),
];
globalStore.__propertyFallback ??= new Set();
const memory = globalStore.__properties;
const fallback = globalStore.__propertyFallback;

function notSetUp(error: { message: string; code?: string } | null) {
  return !!error && (["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "") || /does not exist|schema cache|could not find/i.test(error.message));
}

async function readProperties(landlordId: string): Promise<StoredProperty[]> {
  if (supabase && isUuid(landlordId) && !fallback.has(landlordId)) {
    const { data, error } = await supabase.from("properties").select("id,landlord_id,address,city,state,zip").eq("landlord_id", landlordId);
    if (error && !notSetUp(error)) throw error;
    if (!error) {
      if (!data.length) return [];
      const { data: leases, error: leaseError } = await supabase.from("leases").select("property_id,tenant_id,unit").in("property_id", data.map((row) => row.id));
      if (leaseError && !notSetUp(leaseError)) throw leaseError;
      if (!leaseError) {
        const ids = [...new Set(leases.map((lease) => lease.tenant_id).filter(Boolean))];
        const { data: people, error: peopleError } = ids.length
          ? await supabase.from("profiles").select("id,name").in("id", ids)
          : { data: [], error: null };
        if (peopleError && !notSetUp(peopleError)) throw peopleError;
        if (!peopleError) return data.map((row) => ({
          id: row.id, landlordId: row.landlord_id, address: row.address, city: row.city, state: row.state, zip: row.zip,
          residents: [...new Map(leases.filter((lease) => lease.property_id === row.id && lease.tenant_id).map((lease) => [lease.tenant_id, { tenantId: lease.tenant_id as string, name: people?.find((person) => person.id === lease.tenant_id)?.name || "Resident", unit: lease.unit ?? "" }])).values()],
        }));
      }
    }
    fallback.add(landlordId);
  }
  return memory.filter((property) => property.landlordId === landlordId);
}

async function requestsFor(landlordId: string) {
  // Demo accounts stay in memory even on a deployment with database keys.
  if (!supabase || !isUuid(landlordId)) return globalStore.__requests ?? [];
  try { return await listRequests(); }
  catch (error) {
    if (!notSetUp(error as { message: string; code?: string })) throw error;
    return globalStore.__requests ?? [];
  }
}

function withRequests(property: StoredProperty, requests: MaintenanceRequest[]): PropertyDetail {
  const summary = { ...property, openRequestCount: 0 };
  const matched = requests.filter((request) => requestMatchesProperty(request, summary)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { ...summary, openRequestCount: matched.filter((request) => request.status !== "completed" && request.status !== "declined").length, requests: matched };
}

export async function listProperties(landlordId: string): Promise<PropertySummary[]> {
  const [properties, requests] = await Promise.all([readProperties(landlordId), requestsFor(landlordId)]);
  return properties.map((property) => {
    const { requests: matched, ...summary } = withRequests(property, requests);
    void matched;
    return summary;
  });
}

export async function getProperty(landlordId: string, id: string): Promise<PropertyDetail | undefined> {
  const property = (await readProperties(landlordId)).find((item) => item.id === id);
  return property ? withRequests(property, await requestsFor(landlordId)) : undefined;
}

export async function createProperty(landlordId: string, input: Pick<Property, "address" | "city" | "state" | "zip">): Promise<PropertySummary> {
  // Discover a partial schema before writing, so read and create use the same store.
  await readProperties(landlordId);
  const requests = await requestsFor(landlordId);
  if (supabase && isUuid(landlordId) && !fallback.has(landlordId)) {
    const { data, error } = await supabase.from("properties").insert({ landlord_id: landlordId, ...input }).select("id").single();
    if (!error) return withRequests({ ...input, id: data.id, landlordId, residents: [] }, requests);
    if (!notSetUp(error)) throw error;
    fallback.add(landlordId);
  }
  const property = { ...input, id: crypto.randomUUID(), landlordId, residents: [] };
  memory.push(property);
  return withRequests(property, requests);
}
