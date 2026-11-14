// 🔗 TENANT INVITES (server-side only)
//
// How a landlord gets their tenants:
//   1. Landlord adds a property -> it gets a short code like "MAPLE-4821".
//   2. Landlord shares the link /join/MAPLE-4821 (or just the code).
//   3. Tenant opens it (or types the code) and picks their unit -> we create a
//      lease row linking tenant -> property -> landlord.
//   4. From then on the tenant's requests carry that landlord + address, and the
//      landlord only sees requests from their own tenants.
//
// Uses the service-role client from store.ts. Never import this in client code.

import { isUuid, supabase } from "./store";
import type { Property } from "./types";

export interface PropertyInput {
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface InviteProperty extends Property {
  inviteCode: string;
  tenants: { id: string; name: string; unit: string }[];
}

/** What a tenant sees before joining: enough to recognize the place, nothing private. */
export interface InvitePreview {
  code: string;
  address: string;
  city: string;
  state: string;
  landlordName: string;
}

/** The tenant's current home, from their latest lease. */
export interface TenantLink {
  propertyId: string;
  landlordId: string;
  landlordName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  unit: string;
}

// ---------- Codes ----------

/** "418 Maple Street" -> "MAPLE-4821". Letters help people recognize it; digits make it unique. */
function newCode(address: string): string {
  const word = address.split(/\s+/).find((w) => /^[a-z]{3,}$/i.test(w.replace(/[^a-z]/gi, ""))) ?? "HOME";
  const letters = word.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 5);
  const digits = String(1000 + Math.floor(Math.random() * 9000));
  return `${letters}-${digits}`;
}

/** Accepts "maple 4821", "MAPLE4821", " maple-4821 " -> "MAPLE-4821". */
export function normalizeCode(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = clean.match(/^([A-Z]+)(\d{4})$/);
  return m ? `${m[1]}-${m[2]}` : clean;
}

// ---------- In-memory fallback (no Supabase keys, local dev) ----------

const mem = globalThis as unknown as {
  __properties?: (Property & { inviteCode: string })[];
  __leases?: { tenantId: string; tenantName: string; propertyId: string; unit: string }[];
};
mem.__properties ??= [];
mem.__leases ??= [];

// ---------- Landlord side ----------

export async function listLandlordProperties(landlordId: string): Promise<InviteProperty[]> {
  if (!supabase) {
    return mem.__properties!.filter((p) => p.landlordId === landlordId).map((p) => ({
      ...p,
      tenants: mem.__leases!.filter((l) => l.propertyId === p.id).map((l) => ({ id: l.tenantId, name: l.tenantName, unit: l.unit })),
    }));
  }
  if (!isUuid(landlordId)) return [];
  const { data, error } = await supabase
    .from("properties")
    .select("id, landlord_id, address, city, state, zip, invite_code, leases(tenant_id, unit, profiles(name))")
    .eq("landlord_id", landlordId)
    .order("created_at");
  if (error) throw error;

  const rows = data ?? [];
  // Older properties made before invites existed get a code the first time we list them.
  for (const row of rows) if (!row.invite_code) row.invite_code = await assignCode(row.id, row.address);

  return rows.map((row) => ({
    id: row.id,
    landlordId: row.landlord_id,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    inviteCode: row.invite_code!,
    tenants: (row.leases ?? [])
      .filter((l) => l.tenant_id)
      .map((l) => {
        const profile = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
        return { id: l.tenant_id!, name: profile?.name || "Tenant", unit: l.unit ?? "" };
      }),
  }));
}

async function assignCode(propertyId: string, address: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode(address);
    const { error } = await supabase!.from("properties").update({ invite_code: code }).eq("id", propertyId);
    if (!error) return code;
    if (error.code !== "23505") throw error; // 23505 = code already taken; try another
  }
  throw new Error("Couldn't create an invite code. Try again.");
}

export async function createProperty(landlordId: string, input: PropertyInput): Promise<InviteProperty> {
  const clean = {
    address: input.address.trim(),
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    zip: input.zip.trim(),
  };
  if (!supabase) {
    const p = { id: crypto.randomUUID(), landlordId, ...clean, inviteCode: newCode(clean.address) };
    mem.__properties!.push(p);
    return { ...p, tenants: [] };
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("properties")
      .insert({ landlord_id: landlordId, ...clean, invite_code: newCode(clean.address) })
      .select("id, landlord_id, address, city, state, zip, invite_code")
      .single();
    if (!error) {
      return {
        id: data.id, landlordId: data.landlord_id, address: data.address, city: data.city,
        state: data.state, zip: data.zip, inviteCode: data.invite_code, tenants: [],
      };
    }
    if (error.code !== "23505") throw error;
  }
  throw new Error("Couldn't create an invite code. Try again.");
}

// ---------- Tenant side ----------

async function findByCode(code: string) {
  const normalized = normalizeCode(code);
  if (!supabase) {
    const p = mem.__properties!.find((x) => x.inviteCode === normalized);
    return p && { id: p.id, landlordId: p.landlordId, address: p.address, city: p.city, state: p.state, zip: p.zip, code: p.inviteCode, landlordName: "Your landlord" };
  }
  const { data, error } = await supabase
    .from("properties")
    .select("id, landlord_id, address, city, state, zip, invite_code, profiles(name)")
    .eq("invite_code", normalized)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const landlord = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  return {
    id: data.id, landlordId: data.landlord_id, address: data.address, city: data.city,
    state: data.state, zip: data.zip, code: data.invite_code as string, landlordName: landlord?.name || "Your landlord",
  };
}

export async function previewInvite(code: string): Promise<InvitePreview | undefined> {
  const p = await findByCode(code);
  return p && { code: p.code, address: p.address, city: p.city, state: p.state, landlordName: p.landlordName };
}

export async function joinProperty(
  tenant: { id: string; name: string },
  code: string,
  unit: string,
): Promise<TenantLink | undefined> {
  const property = await findByCode(code);
  if (!property) return undefined;
  const cleanUnit = unit.trim();

  if (!supabase) {
    mem.__leases = mem.__leases!.filter((l) => l.tenantId !== tenant.id);
    mem.__leases.push({ tenantId: tenant.id, tenantName: tenant.name, propertyId: property.id, unit: cleanUnit });
  } else {
    // Already linked to this property? Just update the unit. Otherwise start a new lease row.
    const { data: existing, error: findError } = await supabase
      .from("leases").select("id").eq("tenant_id", tenant.id).eq("property_id", property.id).limit(1).maybeSingle();
    if (findError) throw findError;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = existing
      ? await supabase.from("leases").update({ unit: cleanUnit, start_date: today }).eq("id", existing.id)
      : await supabase.from("leases").insert({ tenant_id: tenant.id, property_id: property.id, unit: cleanUnit, start_date: today });
    if (error) throw error;

    // Keep the unit on the tenant's account in sync (the app shows it in a few places).
    const { data: account } = await supabase.auth.admin.getUserById(tenant.id);
    if (account?.user) {
      await supabase.auth.admin.updateUserById(tenant.id, {
        user_metadata: { ...account.user.user_metadata, unit: cleanUnit },
      });
    }
  }

  return {
    propertyId: property.id, landlordId: property.landlordId, landlordName: property.landlordName,
    address: property.address, city: property.city, state: property.state, zip: property.zip, unit: cleanUnit,
  };
}

/** The property + landlord a tenant belongs to (their most recent lease), if they've joined one. */
export async function tenantLink(tenantId: string | undefined): Promise<TenantLink | undefined> {
  if (!tenantId) return undefined;
  if (!supabase) {
    const lease = mem.__leases!.find((l) => l.tenantId === tenantId);
    const p = lease && mem.__properties!.find((x) => x.id === lease.propertyId);
    return p && lease
      ? { propertyId: p.id, landlordId: p.landlordId, landlordName: "Your landlord", address: p.address, city: p.city, state: p.state, zip: p.zip, unit: lease.unit }
      : undefined;
  }
  if (!isUuid(tenantId)) return undefined;
  const { data, error } = await supabase
    .from("leases")
    .select("unit, start_date, created_at, properties(id, landlord_id, address, city, state, zip, profiles(name))")
    .eq("tenant_id", tenantId)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const p = Array.isArray(data?.properties) ? data.properties[0] : data?.properties;
  if (!p) return undefined;
  const landlord = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
  return {
    propertyId: p.id, landlordId: p.landlord_id, landlordName: landlord?.name || "Your landlord",
    address: p.address, city: p.city, state: p.state, zip: p.zip, unit: data?.unit ?? "",
  };
}
