import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MaintenanceRequest, Trade } from "@/lib/types";

export type PreferredContractor = {
  id: string;
  name: string;
  trade: Trade;
  phone: string;
  email: string;
  notes: string;
};

export type LandlordMessage = {
  id: string;
  requestId: string;
  senderRole: "landlord" | "tenant";
  body: string;
  createdAt: string;
};

export type LandlordRequest = MaintenanceRequest;

const CONTRACTORS_KEY = "fixflow:landlord:preferred-contractors";
const MESSAGES_KEY = "fixflow:landlord:messages";

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function localPreferredContractors() {
  return readLocal<PreferredContractor[]>(CONTRACTORS_KEY, []);
}

export function saveLocalPreferredContractors(items: PreferredContractor[]) {
  writeLocal(CONTRACTORS_KEY, items);
}

export function localMessages(requestId: string) {
  return readLocal<LandlordMessage[]>(MESSAGES_KEY, [])
    .filter((message) => message.requestId === requestId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function saveLocalMessage(message: LandlordMessage) {
  const messages = readLocal<LandlordMessage[]>(MESSAGES_KEY, []);
  writeLocal(MESSAGES_KEY, [...messages, message]);
}

let browserClient: SupabaseClient | null | undefined;

export function landlordSupabase(): SupabaseClient | null {
  if (browserClient !== undefined) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  browserClient = url && key ? createClient(url, key) : null;
  return browserClient;
}

export async function landlordSession() {
  const client = landlordSupabase();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user;
}
