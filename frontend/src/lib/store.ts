import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MaintenanceRequest } from "./types";

// 🗄️ DATA STORAGE
//
// If SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (they are on Vercel,
// and in your .env.local after `npx vercel env pull`), requests are saved in
// the Supabase `requests` table. Otherwise it falls back to in-memory storage
// so the app still runs for anyone without keys (data resets on restart).
//
// Table schema: see /supabase/schema.sql in the repo root.

// ---------- Supabase ----------

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

interface RequestRow {
  id: string;
  tenant_name: string;
  unit: string;
  title: string;
  description: string;
  category: MaintenanceRequest["category"];
  urgency: MaintenanceRequest["urgency"];
  status: MaintenanceRequest["status"];
  created_at: string;
  quote: MaintenanceRequest["quote"] | null;
}

const fromRow = (r: RequestRow): MaintenanceRequest => ({
  id: r.id,
  tenantName: r.tenant_name,
  unit: r.unit,
  title: r.title,
  description: r.description,
  category: r.category,
  urgency: r.urgency,
  status: r.status,
  createdAt: r.created_at,
  quote: r.quote ?? undefined,
});

const toRow = (r: MaintenanceRequest): RequestRow => ({
  id: r.id,
  tenant_name: r.tenantName,
  unit: r.unit,
  title: r.title,
  description: r.description,
  category: r.category,
  urgency: r.urgency,
  status: r.status,
  created_at: r.createdAt,
  quote: r.quote ?? null,
});

// ---------- In-memory fallback ----------

const globalStore = globalThis as unknown as { __requests?: MaintenanceRequest[] };

globalStore.__requests ??= [
  {
    id: "seed-1",
    tenantName: "Jordan Lee",
    unit: "Apt 3B",
    title: "Kitchen sink leaking",
    description: "Water drips from under the sink whenever it runs. There's a puddle in the cabinet.",
    category: "plumbing",
    urgency: "high",
    status: "awaiting_approval",
    createdAt: new Date().toISOString(),
    quote: {
      contractor: { id: "c1", name: "Rapid Rooter Plumbing", trade: "plumbing", rating: 4.8, phone: "(555) 201-3344" },
      price: 260,
      availableAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      aiReason: "Rapid Rooter Plumbing handles plumbing jobs, is rated 4.8★, and is free soonest.",
    },
  },
];

const memory = globalStore.__requests;

// ---------- Public API (same functions either way) ----------

export async function listRequests(): Promise<MaintenanceRequest[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });
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
