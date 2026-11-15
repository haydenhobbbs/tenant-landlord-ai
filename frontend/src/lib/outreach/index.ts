// Public contractor outreach API: Google Places, Twilio, Resend, and demo fallbacks.

import { supabase } from "../store";
import { searchPlaces } from "./search";

export { contactContractor } from "./contact";
export { confirmBooking } from "./booking";
export { notify, listNotifications, markNotificationRead } from "./notify";
export { onContractorReply, findThreadByAddress, findThreadByContractor, findThreadByRef } from "./replies";
export { buildIcs } from "./ics";
export { sendRentReminders, FAKE_TENANTS } from "./rent";
export { isTrade } from "./search";

import type { ContactChannel, Contractor, MaintenanceRequest, Trade } from "../types";

// Landlord's trusted contractors. Teammate B builds the UI to manage these;
// they'll live in the Supabase `contractors` table.
const FAKE_PREAPPROVED: Contractor[] = [
  { id: "pre-1", name: "Rapid Rooter Plumbing", trade: "plumbing", phone: "+15552013344", rating: 4.8, source: "preapproved" },
  { id: "pre-2", name: "Bright Spark Electric", trade: "electrical", phone: "+15554821190", rating: 4.6, source: "preapproved" },
];

const FAKE_ONLINE: Contractor[] = [
  { id: "web-1", name: "AquaFix Plumbers", trade: "plumbing", phone: "+15559001122", website: "https://example.com", rating: 4.5, source: "online" },
  { id: "web-2", name: "Volt Pros", trade: "electrical", phone: "+15559003344", rating: 4.4, source: "online" },
  { id: "web-3", name: "CoolAir HVAC", trade: "hvac", phone: "+15553307781", rating: 4.7, source: "online" },
  { id: "web-4", name: "FixIt Appliance Repair", trade: "appliance", email: "jobs@example.com", rating: 4.5, source: "online" },
  { id: "web-5", name: "GreenShield Pest Control", trade: "pest", phone: "+15556405512", rating: 4.4, source: "online" },
  { id: "web-6", name: "Handy Hank General Repair", trade: "general", phone: "+15557770101", rating: 4.3, source: "online" },
];

export async function getPreapprovedContractors(landlordId: string | undefined, trade: Trade): Promise<Contractor[]> {
  if (supabase && landlordId) {
    try {
      const { data, error } = await supabase.from("contractors").select("*")
        .eq("landlord_id", landlordId).eq("trade", trade);
      if (error) throw error;
      if (data?.length) return data.map((row) => ({
        id: row.id, name: row.name, trade, phone: row.phone ?? undefined,
        email: row.email ?? undefined, website: row.website ?? undefined,
        rating: row.rating == null ? undefined : Number(row.rating), source: "preapproved" as const,
      }));
    } catch (error) {
      console.error("[outreach] Trusted contractor lookup failed; using demo list", error);
    }
  }
  return FAKE_PREAPPROVED.filter((c) => c.trade === trade);
}

export async function searchContractorsOnline(
  trade: Trade,
  location: MaintenanceRequest["property"],
): Promise<Contractor[]> {
  const found = await searchPlaces(trade, location);
  if (found !== null) return found;
  const matches = FAKE_ONLINE.filter((c) => c.trade === trade);
  return matches.length ? matches : FAKE_ONLINE.filter((c) => c.trade === "general");
}

// Email by default (free, no carrier registration). Set OUTREACH_CHANNEL=call
// or OUTREACH_CHANNEL=sms to phone contractors that have a number instead.
export function outreachChannel(): ContactChannel {
  const preferred = process.env.OUTREACH_CHANNEL?.trim().toLowerCase();
  return preferred === "call" || preferred === "sms" ? preferred : "email";
}

export function pickChannel(contractor: Contractor): ContactChannel {
  const preferred = outreachChannel();
  if (preferred !== "email" && (process.env.DEMO_CONTRACTOR_PHONE || contractor.phone)) return preferred;
  return "email";
}
