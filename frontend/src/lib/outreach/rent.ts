import { notify } from "./notify";
import type { AppNotification } from "./types";

export interface RentTenant {
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  rentDue: string;
  amount: number;
}

export async function sendRentReminders(tenants: RentTenant[]): Promise<AppNotification[]> {
  const now = Date.now();
  const due = tenants.filter((tenant) => {
    const untilDue = Date.parse(tenant.rentDue) - now;
    return untilDue >= 0 && untilDue <= 3 * 24 * 60 * 60 * 1000;
  });
  return Promise.all(due.map((tenant) => notify(tenant.userId,
    `Hi ${tenant.name}, your rent of $${tenant.amount.toLocaleString("en-US")} is due ${new Date(tenant.rentDue).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
    { kind: "rent_reminder", sms: tenant.phone, email: tenant.email })));
}

export const FAKE_TENANTS: RentTenant[] = [
  { userId: "tenant:Jordan Lee", name: "Jordan Lee", rentDue: new Date(Date.now() + 2 * 86_400_000).toISOString(), amount: 1850 },
  { userId: "tenant:Sam Rivera", name: "Sam Rivera", rentDue: new Date(Date.now() + 7 * 86_400_000).toISOString(), amount: 1600 },
];
