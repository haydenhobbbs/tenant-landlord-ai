// Shared data shapes. Everyone imports from here so the tenant app, landlord
// app, AI and outreach code all agree. ⚠️ Ask in the group chat before changing.

// ---------- People ----------

// Only tenants and landlords log in. Contractors never do; the AI contacts them.
export type Role = "tenant" | "landlord";

export interface Profile {
  id: string;
  role: Role;
  name: string;
  phone?: string;
  email?: string;
}

export interface Property {
  id: string;
  landlordId: string;
  address: string;
  city: string;
  state: string; // 2-letter, e.g. "TX" (drives legal guidance)
  zip: string;
}

// ---------- Contractors ----------

export type Trade = "plumbing" | "electrical" | "hvac" | "appliance" | "pest" | "general";

export type ContactChannel = "sms" | "email" | "call";

export interface Contractor {
  id: string;
  name: string;
  trade: Trade;
  phone?: string;
  email?: string;
  website?: string;
  rating?: number; // 0-5
  source: "preapproved" | "online"; // landlord's trusted list, or found by AI
}

// One contractor's answer after the AI reached out.
export interface ContractorOffer {
  contractor: Contractor;
  channel: ContactChannel; // how the AI reached them
  available: boolean;
  availableAt?: string; // ISO date-time they can come
  price?: number; // USD quote
  aiReason: string; // why the AI recommends (or ranks) them
}

// ---------- Legal guidance (for landlords) ----------

export interface LegalGuidance {
  summary: string; // one or two plain-English sentences
  mustDo: { action: string; deadline?: string }[]; // checklist
  sources: { title: string; url?: string }[];
  disclaimer: string; // "General information, not legal advice."
}

// ---------- Repair requests ----------

export type Urgency = "low" | "medium" | "high" | "emergency";

// The flow, in order. `declined` can happen at any step.
export type RequestStatus =
  | "submitted" // tenant sent it
  | "finding_contractor" // AI is searching + contacting contractors
  | "contractor_suggested" // landlord needs to pick / approve
  | "landlord_approved" // landlord approved, AI is confirming with the contractor
  | "scheduled" // contractor confirmed, on the calendar
  | "completed"
  | "declined";

export const STATUS_ORDER: RequestStatus[] = [
  "submitted",
  "finding_contractor",
  "contractor_suggested",
  "landlord_approved",
  "scheduled",
  "completed",
];

export interface MaintenanceRequest {
  id: string;
  createdAt: string; // ISO date-time

  // who + where
  tenantId?: string;
  landlordId?: string;
  tenantName: string;
  unit: string;
  property?: Pick<Property, "address" | "city" | "state" | "zip">;

  // what the tenant sent
  title: string;
  description: string;
  photos: string[]; // image URLs

  // filled in by the AI
  trade?: Trade;
  urgency: Urgency;
  suggestions: ContractorOffer[]; // best first
  legalGuidance?: LegalGuidance;

  // filled in after the landlord approves
  selected?: ContractorOffer;
  scheduledAt?: string;

  status: RequestStatus;
}

// What the tenant form sends.
export interface NewRequestInput {
  tenantName: string;
  unit: string;
  title: string;
  description: string;
  urgency: Urgency;
  photos?: string[];
  property?: MaintenanceRequest["property"];
}
