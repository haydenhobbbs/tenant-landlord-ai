import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MaintenanceRequest } from "./types";

// 🗄️ DATA STORAGE for repair requests
//
// If SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (they are on Vercel),
// requests are saved in the Supabase `requests` table. Otherwise it falls back
// to in-memory storage so the app still runs for anyone without keys.
// Full schema: /supabase/schema.sql

// ---------- Supabase ----------

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

interface RequestRow {
  id: string;
  created_at: string;
  tenant_id: string | null;
  landlord_id: string | null;
  tenant_name: string;
  unit: string;
  property: MaintenanceRequest["property"] | null;
  title: string;
  description: string;
  photos: string[];
  trade: MaintenanceRequest["trade"] | null;
  urgency: MaintenanceRequest["urgency"];
  suggestions: MaintenanceRequest["suggestions"];
  legal_guidance: MaintenanceRequest["legalGuidance"] | null;
  selected: MaintenanceRequest["selected"] | null;
  scheduled_at: string | null;
  status: MaintenanceRequest["status"];
}

const fromRow = (r: RequestRow): MaintenanceRequest => ({
  id: r.id,
  createdAt: r.created_at,
  tenantId: r.tenant_id ?? undefined,
  landlordId: r.landlord_id ?? undefined,
  tenantName: r.tenant_name,
  unit: r.unit,
  property: r.property ?? undefined,
  title: r.title,
  description: r.description,
  photos: r.photos ?? [],
  trade: r.trade ?? undefined,
  urgency: r.urgency,
  suggestions: r.suggestions ?? [],
  legalGuidance: r.legal_guidance ?? undefined,
  selected: r.selected ?? undefined,
  scheduledAt: r.scheduled_at ?? undefined,
  status: r.status,
});

const toRow = (r: MaintenanceRequest): RequestRow => ({
  id: r.id,
  created_at: r.createdAt,
  tenant_id: r.tenantId ?? null,
  landlord_id: r.landlordId ?? null,
  tenant_name: r.tenantName,
  unit: r.unit,
  property: r.property ?? null,
  title: r.title,
  description: r.description,
  photos: r.photos,
  trade: r.trade ?? null,
  urgency: r.urgency,
  suggestions: r.suggestions,
  legal_guidance: r.legalGuidance ?? null,
  selected: r.selected ?? null,
  scheduled_at: r.scheduledAt ?? null,
  status: r.status,
});

// ---------- In-memory fallback ----------

const globalStore = globalThis as unknown as { __requests?: MaintenanceRequest[] };
globalStore.__requests ??= [];
const memory = globalStore.__requests;

// ---------- Public API (same functions either way) ----------

export async function listRequests(): Promise<MaintenanceRequest[]> {
  if (supabase) {
    const { data, error } = await supabase.from("requests").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data as RequestRow[]).map(fromRow);
  }
  return [...memory].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRequest(id: string): Promise<MaintenanceRequest | undefined> {
  if (supabase) {
    const { data, error } = await supabase.from("requests").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as RequestRow) : undefined;
  }
  return memory.find((r) => r.id === id);
}

export async function saveRequest(request: MaintenanceRequest): Promise<MaintenanceRequest> {
  if (supabase) {
    const { data, error } = await supabase.from("requests").upsert(toRow(request)).select().single();
    if (error) throw error;
    return fromRow(data as RequestRow);
  }
  const i = memory.findIndex((r) => r.id === request.id);
  if (i === -1) memory.push(request);
  else memory[i] = request;
  return request;
}
