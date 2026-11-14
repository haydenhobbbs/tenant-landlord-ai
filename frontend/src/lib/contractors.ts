import type { Contractor } from "./types";

// Fake contractor directory. Replace with a real source
// (database, Google Places, Thumbtack, etc.) later.
export const CONTRACTORS: Contractor[] = [
  { id: "c1", name: "Rapid Rooter Plumbing", trade: "plumbing", rating: 4.8, phone: "(555) 201-3344" },
  { id: "c2", name: "Bright Spark Electric", trade: "electrical", rating: 4.6, phone: "(555) 482-1190" },
  { id: "c3", name: "CoolAir HVAC", trade: "hvac", rating: 4.7, phone: "(555) 330-7781" },
  { id: "c4", name: "FixIt Appliance Repair", trade: "appliance", rating: 4.5, phone: "(555) 918-2207" },
  { id: "c5", name: "GreenShield Pest Control", trade: "pest", rating: 4.4, phone: "(555) 640-5512" },
  { id: "c6", name: "Handy Hank General Repair", trade: "other", rating: 4.3, phone: "(555) 777-0101" },
];
