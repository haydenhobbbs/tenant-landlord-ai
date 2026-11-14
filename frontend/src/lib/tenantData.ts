import { isUuid, supabase as db } from "./store";
import type { AppNotification, ChatMessage, Lease } from "./types";

// 🗄️ STORAGE for chat messages, notifications and leases (server-side only).
//
// Uses the team's Supabase tables (supabase/schema.sql) when keys are set and
// the user is a real Supabase account. Otherwise (no keys, demo accounts, or a
// column that hasn't been added yet) it falls back to memory, so the app keeps
// working either way.

const g = globalThis as unknown as {
  __messages?: ChatMessage[];
  __notifications?: AppNotification[];
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

g.__messages ??= [
  {
    id: "m1",
    tenantId: "demo-jordan",
    senderId: "demo-landlord",
    senderRole: "landlord",
    senderName: "Pat Morgan",
    body: "Hi Jordan, welcome to the building! Message me here any time.",
    createdAt: hoursAgo(50),
  },
];

g.__notifications ??= [
  {
    id: "n1",
    userId: "demo-jordan",
    message: "We found 2 repair people for “Kitchen sink leaking”. Waiting on your landlord to choose.",
    href: "/tenant/requests/seed-1",
    read: false,
    createdAt: hoursAgo(1),
  },
];

const mem = { messages: g.__messages, notifications: g.__notifications };

// Missing table/column → use memory instead of crashing.
function notSetUp(error: { message: string; code?: string } | null) {
  return (
    !!error &&
    (["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "") ||
      /does not exist|schema cache|could not find/i.test(error.message))
  );
}

// ---------- Messages ----------
// Table `messages` + the tenant_id / sender_role / sender_name columns added
// in the "Added by Nermin" part of schema.sql.

export async function listMessages(tenantId: string): Promise<ChatMessage[]> {
  if (db && isUuid(tenantId)) {
    const { data, error } = await db
      .from("messages")
      .select("id, tenant_id, sender_id, sender_role, sender_name, body, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });
    if (!notSetUp(error)) {
      if (error) throw error;
      return data.map((r) => ({
        id: r.id,
        tenantId: r.tenant_id,
        senderId: r.sender_id,
        senderRole: r.sender_role,
        senderName: r.sender_name ?? "",
        body: r.body,
        createdAt: r.created_at,
      }));
    }
  }
  return mem.messages.filter((m) => m.tenantId === tenantId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addMessage(m: ChatMessage): Promise<ChatMessage> {
  if (db && isUuid(m.tenantId) && isUuid(m.senderId)) {
    const { error } = await db.from("messages").insert({
      id: m.id,
      tenant_id: m.tenantId,
      sender_id: m.senderId,
      sender_role: m.senderRole,
      sender_name: m.senderName,
      body: m.body,
      created_at: m.createdAt,
    });
    if (!notSetUp(error)) {
      if (error) throw error;
      return m;
    }
  }
  mem.messages.push(m);
  return m;
}

// ---------- Notifications ----------
// Team table: notifications(id, user_id, type, body, link, read_at, created_at)

export async function listNotifications(userId: string): Promise<AppNotification[]> {
  if (db && isUuid(userId)) {
    const { data, error } = await db
      .from("notifications")
      .select("id, user_id, body, link, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!notSetUp(error)) {
      if (error) throw error;
      return data.map((r) => ({
        id: r.id,
        userId: r.user_id,
        message: r.body,
        href: r.link ?? undefined,
        read: r.read_at !== null,
        createdAt: r.created_at,
      }));
    }
  }
  return mem.notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addNotification(n: AppNotification): Promise<void> {
  if (db && isUuid(n.userId)) {
    const { error } = await db.from("notifications").insert({
      id: n.id,
      user_id: n.userId,
      type: "request_update",
      body: n.message,
      link: n.href ?? null,
      created_at: n.createdAt,
    });
    if (!notSetUp(error)) {
      if (error) throw error;
      return;
    }
  }
  mem.notifications.push(n);
}

export async function markAllRead(userId: string): Promise<void> {
  if (db && isUuid(userId)) {
    const { error } = await db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    if (!notSetUp(error)) {
      if (error) throw error;
      return;
    }
  }
  for (const n of mem.notifications) if (n.userId === userId) n.read = true;
}

// ---------- Lease ----------
// Team tables: leases (+ the property it's for, + the landlord's profile).
// Until a tenant has a lease row, they see a sample lease so the screen isn't empty.

export const DEFAULT_TERMS: Lease["terms"] = [
  { title: "Rent", body: "Due on the 1st of each month. A $50 late fee applies after the 5th." },
  { title: "Repairs", body: "Report problems through FixFlow. Your landlord arranges and pays for repairs you didn't cause." },
  { title: "Entry", body: "Your landlord gives at least 24 hours' notice before entering, except in an emergency." },
  { title: "Pets", body: "One cat or small dog allowed with a $300 pet deposit." },
  { title: "Utilities", body: "Water and trash are included. You pay electric and internet." },
  { title: "Moving out", body: "Give 60 days' written notice before your lease ends." },
];

const SAMPLE: Omit<Lease, "tenantId" | "tenantName" | "unit"> = {
  landlordName: "Pat Morgan",
  propertyAddress: "418 Maple Street",
  city: "Columbus",
  state: "OH",
  zip: "43215",
  startDate: "2026-06-01",
  endDate: "2027-05-31",
  monthlyRent: 1450,
  rentDueDay: 1,
  securityDeposit: 1450,
  terms: DEFAULT_TERMS,
};

export async function getLease(tenantId: string, fallback: { tenantName: string; unit: string }): Promise<Lease> {
  if (db && isUuid(tenantId)) {
    const { data, error } = await db
      .from("leases")
      .select("*, properties(address, city, state, zip, profiles(name))")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!notSetUp(error)) {
      if (error) throw error;
      if (data) {
        const p = data.properties ?? {};
        return {
          tenantId,
          tenantName: fallback.tenantName,
          landlordName: p.profiles?.name || "Your landlord",
          propertyAddress: p.address ?? "",
          city: p.city ?? "",
          state: p.state ?? "",
          zip: p.zip ?? "",
          unit: data.unit ?? fallback.unit,
          startDate: data.start_date ?? SAMPLE.startDate,
          endDate: data.end_date ?? SAMPLE.endDate,
          monthlyRent: Number(data.rent_amount ?? 0),
          rentDueDay: data.rent_due_day ?? 1,
          securityDeposit: Number(data.security_deposit ?? 0),
          terms: data.terms ?? DEFAULT_TERMS,
          documentUrl: data.file_url ?? undefined,
        };
      }
    }
  }
  return { ...SAMPLE, tenantId, ...fallback };
}
