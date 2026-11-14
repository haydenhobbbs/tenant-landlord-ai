// Shared data shapes. Everyone should import from here so the tenant UI,
// landlord UI, AI agent and API all agree on what a request looks like.

export type Category =
  | "plumbing"
  | "electrical"
  | "hvac"
  | "appliance"
  | "pest"
  | "other";

export type Urgency = "low" | "medium" | "high" | "emergency";

export type RequestStatus =
  | "submitted" // tenant sent it, AI hasn't matched yet
  | "awaiting_approval" // AI found a contractor, landlord needs to decide
  | "approved" // landlord approved, job is booked
  | "declined"; // landlord said no

export interface Contractor {
  id: string;
  name: string;
  trade: Category;
  rating: number; // 0-5
  phone: string;
}

export interface ContractorQuote {
  contractor: Contractor;
  price: number; // USD
  availableAt: string; // ISO date-time
  aiReason: string; // why the AI picked this one
}

export interface MaintenanceRequest {
  id: string;
  tenantName: string;
  unit: string;
  title: string;
  description: string;
  category: Category;
  urgency: Urgency;
  status: RequestStatus;
  createdAt: string; // ISO date-time
  quote?: ContractorQuote; // filled in by the AI
}

export type NewRequestInput = Pick<
  MaintenanceRequest,
  "tenantName" | "unit" | "title" | "description" | "category" | "urgency"
>;
