// 📞 CONTRACTOR OUTREACH + NOTIFICATIONS (owner: Teammate C)
//
// Every function here is a FAKE placeholder so the app works end to end today.
// Replace each body with the real thing:
//   - searchContractorsOnline -> Google Places API (or Yelp)
//   - contactContractor       -> Twilio SMS / voice call, Resend email
//   - confirmBooking          -> confirmation text/email + .ics calendar invite
//   - notify                  -> email/SMS/in-app notification
// Keep the names, inputs and outputs the same.
//
// NOTE: real replies arrive later (Twilio/Resend webhooks), not instantly.
// When you wire that up, the webhook should call readContractorReply() from
// lib/ai and then save the offer on the request. The fake below replies
// instantly so the demo flow works.

import { addNotification } from "../tenantData";
import type { ContactChannel, Contractor, ContractorOffer, MaintenanceRequest, Trade } from "../types";

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
  void landlordId; // real version: filter by landlord
  return FAKE_PREAPPROVED.filter((c) => c.trade === trade);
}

export async function searchContractorsOnline(
  trade: Trade,
  location: MaintenanceRequest["property"],
): Promise<Contractor[]> {
  void location; // real version: search near this address
  const matches = FAKE_ONLINE.filter((c) => c.trade === trade);
  return matches.length ? matches : FAKE_ONLINE.filter((c) => c.trade === "general");
}

// Sends the message. Returns the contractor's reply text if it arrived right
// away (fake), or null if it will come later via webhook (real).
export async function contactContractor(
  contractor: Contractor,
  message: string,
  channel: ContactChannel,
): Promise<{ sent: boolean; reply: string | null }> {
  console.log(`[outreach:fake] ${channel} -> ${contractor.name}: ${message}`);
  const price = 120 + Math.round(Math.random() * 20) * 10;
  return { sent: true, reply: `Yes, I can come tomorrow at 10am. About $${price}.` };
}

export function pickChannel(contractor: Contractor): ContactChannel {
  return contractor.phone ? "sms" : "email";
}

// After the landlord approves: tell the contractor it's booked + send a calendar invite.
export async function confirmBooking(request: MaintenanceRequest, offer: ContractorOffer): Promise<void> {
  console.log(`[outreach:fake] confirm -> ${offer.contractor.name} for "${request.title}" at ${offer.availableAt}`);
}

// Notify a tenant or landlord (new message, status change, rent reminder...).
// `link` is where tapping the in-app notification goes (optional).
export async function notify(to: { userId?: string; name?: string }, message: string, link?: string): Promise<void> {
  console.log(`[notify:fake] -> ${to.name ?? to.userId}: ${message}`);
  // In-app notification (the bell). Added by Nermin; real SMS/email goes above this.
  if (!to.userId) return;
  try {
    await addNotification({
      id: crypto.randomUUID(),
      userId: to.userId,
      message,
      href: link,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("in-app notification failed", err); // never block the main action
  }
}
