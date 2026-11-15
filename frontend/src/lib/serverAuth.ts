// Who is calling this API route? (server-side only)
//
// The browser sends its Supabase access token (see lib/authFetch.ts). We ask
// Supabase who it belongs to, so a page can't just claim to be another user.
// Without Supabase keys (local demo mode) there are no tokens, so we accept the
// id the page sends instead.

import { NextResponse } from "next/server";
import { landlordIdForTenant } from "./landlord-server";
import { supabase } from "./store";
import type { MaintenanceRequest } from "./types";

export interface Caller {
  id: string;
  name: string;
  role: "tenant" | "landlord";
}

export async function getCaller(req: Request, demoFallback?: Partial<Caller>): Promise<Caller | undefined> {
  if (!supabase) {
    // Local demo mode: no real accounts exist, so trust what the page sends.
    const role = demoFallback?.role ?? "tenant";
    return { id: demoFallback?.id ?? (role === "landlord" ? "demo-landlord" : "demo-jordan"), name: demoFallback?.name ?? "", role };
  }
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return undefined;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return undefined;
  const meta = data.user.user_metadata ?? {};
  return {
    id: data.user.id,
    name: meta.name ?? data.user.email?.split("@")[0] ?? "",
    role: meta.role === "landlord" ? "landlord" : "tenant",
  };
}

// ---------- Guards for API routes ----------


export const unauthorized = (message = "Please sign in.") => NextResponse.json({ error: message }, { status: 401 });
export const forbidden = (message = "You don't have access to this.") => NextResponse.json({ error: message }, { status: 403 });

/** Demo-mode fallback ids, read from the query string (only used without Supabase). */
export function demoFrom(req: Request): Partial<Caller> {
  const p = new URL(req.url).searchParams;
  const id = p.get("userId") ?? p.get("tenantId") ?? p.get("landlordId") ?? undefined;
  const role = p.get("role") === "landlord" || p.has("landlordId") ? "landlord" : "tenant";
  return { id: id ?? undefined, role };
}

/** A tenant sees their own requests; a landlord sees requests from their own tenants. */
export function canSeeRequest(caller: Caller, request: MaintenanceRequest): boolean {
  if (!supabase) return true; // local demo mode has no real accounts
  return caller.role === "tenant" ? request.tenantId === caller.id : request.landlordId === caller.id;
}

/** Only the request's landlord can approve, decline, complete, or contact more contractors. */
export function isRequestLandlord(caller: Caller, request: MaintenanceRequest): boolean {
  if (!supabase) return caller.role === "landlord";
  return caller.role === "landlord" && request.landlordId === caller.id;
}

/** A chat thread (one per tenant) is open to that tenant and to their landlord. */
export async function canUseThread(caller: Caller, tenantId: string): Promise<boolean> {
  if (!supabase) return true;
  if (caller.role === "tenant") return caller.id === tenantId;
  return (await landlordIdForTenant(tenantId)) === caller.id;
}
