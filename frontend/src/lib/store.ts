import type { MaintenanceRequest } from "./types";

// 🗄️ DATABASE GOES HERE
//
// Temporary in-memory storage so the app works end to end today.
// Everything resets when the dev server restarts. Swap these functions for
// real database calls (Supabase, Postgres, etc.) without changing callers.

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

const requests = globalStore.__requests;

export function listRequests(): MaintenanceRequest[] {
  return [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getRequest(id: string): MaintenanceRequest | undefined {
  return requests.find((r) => r.id === id);
}

export function saveRequest(request: MaintenanceRequest): MaintenanceRequest {
  const i = requests.findIndex((r) => r.id === request.id);
  if (i === -1) requests.push(request);
  else requests[i] = request;
  return request;
}
