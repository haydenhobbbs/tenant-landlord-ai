import { notify } from "./notify";

export interface RentTenant {
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  rentDue: string;
  amount: number;
}

export async function sendRentReminders(tenants: RentTenant[]): Promise<void[]> {
  const now = Date.now();
  const due = tenants.filter((tenant) => {
    const untilDue = Date.parse(tenant.rentDue) - now;
    return untilDue >= 0 && untilDue <= 3 * 24 * 60 * 60 * 1000;
  });
  return Promise.all(due.map((tenant) => notify(tenant,
    `Hi ${tenant.name}, your rent of $${tenant.amount.toLocaleString("en-US")} is due ${new Date(tenant.rentDue).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
    { type: "rent_reminder" })));
}

export const FAKE_TENANTS: RentTenant[] = [
  { userId: "tenant:Jordan Lee", name: "Jordan Lee", rentDue: new Date(Date.now() + 2 * 86_400_000).toISOString(), amount: 1850 },
  { userId: "tenant:Sam Rivera", name: "Sam Rivera", rentDue: new Date(Date.now() + 7 * 86_400_000).toISOString(), amount: 1600 },
];
