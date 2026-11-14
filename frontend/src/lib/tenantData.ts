import { isUuid, supabase as db } from "./store";
import type { ChatMessage, Lease, UnreadThread } from "./types";

// 🗄️ STORAGE for chat messages and leases (server-side only).
// (Notifications are Teammate C's: lib/outreach/notify.ts.)
//
// Uses the team's Supabase tables (supabase/schema.sql) when keys are set and
// the user is a real Supabase account. Otherwise (no keys, demo accounts, or a
// column that hasn't been added yet) it falls back to memory, so the app keeps
// working either way.

const g = globalThis as unknown as {
  __messages?: ChatMessage[];
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


const mem = { messages: g.__messages };

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
      .select("id, tenant_id, sender_id, sender_role, sender_name, body, read_at, created_at")
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
        readAt: r.read_at ?? undefined,
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

// ---------- Unread messages ----------
// "Unread" = sent by the other side and not opened yet.
//   landlord: every tenant thread with unread tenant messages
//   tenant:   their own thread's unread landlord messages

function summarize(list: ChatMessage[], reader: ChatMessage["senderRole"]): UnreadThread[] {
  const byTenant = new Map<string, UnreadThread>();
  for (const m of list) {
    if (m.senderRole === reader || m.readAt) continue;
    const t = byTenant.get(m.tenantId);
    if (!t) {
      byTenant.set(m.tenantId, {
        tenantId: m.tenantId,
        tenantName: m.senderRole === "tenant" ? m.senderName : "",
        count: 1,
        latestId: m.id,
        latestBody: m.body,
        latestAt: m.createdAt,
        fromName: m.senderName,
      });
    } else {
      t.count += 1;
      if (m.createdAt > t.latestAt) Object.assign(t, { latestId: m.id, latestBody: m.body, latestAt: m.createdAt, fromName: m.senderName });
      if (m.senderRole === "tenant" && !t.tenantName) t.tenantName = m.senderName;
    }
  }
  return [...byTenant.values()].sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

export async function listUnread(reader: ChatMessage["senderRole"], tenantId?: string): Promise<UnreadThread[]> {
  const other = reader === "landlord" ? "tenant" : "landlord";
  let fromDb: ChatMessage[] = [];
  if (db && (!tenantId || isUuid(tenantId))) {
    let q = db
      .from("messages")
      .select("id, tenant_id, sender_id, sender_role, sender_name, body, read_at, created_at")
      .eq("sender_role", other)
      .is("read_at", null)
      .not("tenant_id", "is", null)
      .limit(500);
    if (tenantId) q = q.eq("tenant_id", tenantId);
    const { data, error } = await q;
    if (!notSetUp(error)) {
      if (error) throw error;
      fromDb = data.map((r) => ({
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
  const local = mem.messages.filter((m) => !tenantId || m.tenantId === tenantId);
  return summarize([...fromDb, ...local], reader);
}

// Called when someone opens a thread: everything the other side sent is now read.
export async function markThreadRead(tenantId: string, reader: ChatMessage["senderRole"]): Promise<void> {
  const other = reader === "landlord" ? "tenant" : "landlord";
  const now = new Date().toISOString();
  if (db && isUuid(tenantId)) {
    const { error } = await db
      .from("messages")
      .update({ read_at: now })
      .eq("tenant_id", tenantId)
      .eq("sender_role", other)
      .is("read_at", null);
    if (!notSetUp(error) && error) throw error;
  }
  for (const m of mem.messages) if (m.tenantId === tenantId && m.senderRole === other && !m.readAt) m.readAt = now;
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
