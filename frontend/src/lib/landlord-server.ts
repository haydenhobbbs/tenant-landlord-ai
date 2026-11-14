import { createClient } from "@supabase/supabase-js";
import type { PreferredContractor } from "@/lib/landlord";

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
