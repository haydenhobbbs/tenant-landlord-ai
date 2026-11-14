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

// Supabase user ids are UUIDs. Demo-mode ids (e.g. "demo-jordan") aren't, and
// the tenant_id / landlord_id columns would reject them.
export const isUuid = (id?: string | null): id is string =>
  !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

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
  tenant_id: isUuid(r.tenantId) ? r.tenantId : null,
  landlord_id: isUuid(r.landlordId) ? r.landlordId : null,
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
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

// One sample request for the demo tenant (lib/auth.tsx) when running without Supabase.
globalStore.__requests ??= [
  {
    id: "seed-1",
    createdAt: hoursFromNow(-2),
    tenantId: "demo-jordan",
    tenantName: "Jordan Lee",
    unit: "Apt 3B",
    property: { address: "418 Maple Street", city: "Columbus", state: "OH", zip: "43215" },
    title: "Kitchen sink leaking",
    description: "Water drips from under the sink whenever it runs. There's a puddle in the cabinet.",
    photos: [],
    trade: "plumbing",
    urgency: "high",
    status: "contractor_suggested",
    suggestions: [
      {
        contractor: { id: "pre-1", name: "Rapid Rooter Plumbing", trade: "plumbing", phone: "+15552013344", rating: 4.8, source: "preapproved" },
        channel: "sms",
        available: true,
        availableAt: hoursFromNow(22),
        price: 180,
        aiReason: "On your trusted list, rated 4.8, and free tomorrow morning.",
      },
      {
        contractor: { id: "web-1", name: "AquaFix Plumbers", trade: "plumbing", phone: "+15559001122", rating: 4.5, source: "online" },
        channel: "sms",
        available: true,
        availableAt: hoursFromNow(46),
        price: 150,
        aiReason: "Cheapest quote, but can't come until the day after tomorrow.",
      },
    ],
  },
];
const memory = globalStore.__requests;

// ---------- Public API (same functions either way) ----------

// Pass a tenantId to get only that tenant's requests.
export async function listRequests(filter?: { tenantId?: string }): Promise<MaintenanceRequest[]> {
  if (supabase && (!filter?.tenantId || isUuid(filter.tenantId))) {
    let query = supabase.from("requests").select("*").order("created_at", { ascending: false });
    if (filter?.tenantId) query = query.eq("tenant_id", filter.tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return (data as RequestRow[]).map(fromRow);
  }
  return memory
    .filter((r) => !filter?.tenantId || r.tenantId === filter.tenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
