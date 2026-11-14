"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client (uses the public anon key, safe to ship).
// Returns null when keys aren't set, and the app falls back to demo login.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  client ??= createClient(url, anonKey);
  return client;
}

export const authMode: "supabase" | "demo" = url && anonKey ? "supabase" : "demo";
