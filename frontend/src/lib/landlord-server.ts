import { createClient } from "@supabase/supabase-js";
import type { PreferredContractor } from "@/lib/landlord";
import { isUuid, supabase } from "@/lib/store";

// Chat has one thread per tenant. Prefer their latest lease's property owner;
// a linked repair request also works before a lease has been entered.
export async function landlordIdForTenant(tenantId: string): Promise<string | undefined> {
  if (!isUuid(tenantId)) return "demo-landlord";
  if (!supabase) return undefined;

  const { data: lease, error: leaseError } = await supabase.from("leases")
    .select("properties(landlord_id)").eq("tenant_id", tenantId)
    .order("start_date", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  if (leaseError) console.error("[chat] Landlord lease lookup failed", leaseError);
  const property = Array.isArray(lease?.properties) ? lease.properties[0] : lease?.properties;
  if (property?.landlord_id) return property.landlord_id;

  const { data: request, error } = await supabase.from("requests")
    .select("landlord_id").eq("tenant_id", tenantId).not("landlord_id", "is", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) console.error("[chat] Landlord request lookup failed", error);
  return request?.landlord_id ?? undefined;
}

// Hayden's matching service can call this after requests have a landlord ID.
// Never import this module in client components or expose the service role key.
export async function listPreferredContractorsForLandlord(landlordId: string): Promise<PreferredContractor[]> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.from("contractors").select("id,name,trade,phone,email,notes").eq("landlord_id", landlordId).order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, trade: row.trade, phone: row.phone ?? "", email: row.email ?? "", notes: row.notes ?? "" })) as PreferredContractor[];
}
