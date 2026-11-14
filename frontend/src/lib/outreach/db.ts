import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppNotification, OutreachMessage } from "./types";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

interface MessageRow {
  id: string;
  request_id: string;
  contractor_id: string;
  contractor: OutreachMessage["contractor"] | null;
  channel: OutreachMessage["channel"];
  direction: OutreachMessage["direction"];
  to_address: string;
  from_address: string;
  body: string;
  created_at: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  message: string;
  kind: AppNotification["kind"];
  request_id: string | null;
  read: boolean;
  created_at: string;
}

const messageFromRow = (r: MessageRow): OutreachMessage => ({
  id: r.id, requestId: r.request_id, contractorId: r.contractor_id,
  contractor: r.contractor ?? undefined, channel: r.channel, direction: r.direction,
  to: r.to_address, from: r.from_address, body: r.body, createdAt: r.created_at,
});
const messageToRow = (m: OutreachMessage): MessageRow => ({
  id: m.id, request_id: m.requestId, contractor_id: m.contractorId,
  contractor: m.contractor ?? null, channel: m.channel, direction: m.direction,
  to_address: m.to, from_address: m.from, body: m.body, created_at: m.createdAt,
});
const notificationFromRow = (r: NotificationRow): AppNotification => ({
  id: r.id, userId: r.user_id, message: r.message, kind: r.kind,
  requestId: r.request_id ?? undefined, read: r.read, createdAt: r.created_at,
});
const notificationToRow = (n: AppNotification): NotificationRow => ({
  id: n.id, user_id: n.userId, message: n.message, kind: n.kind,
  request_id: n.requestId ?? null, read: n.read, created_at: n.createdAt,
});

const globalStore = globalThis as typeof globalThis & {
  __outreachMessages?: OutreachMessage[];
  __outreachNotifications?: AppNotification[];
};
const messages = (globalStore.__outreachMessages ??= []);
const notifications = (globalStore.__outreachNotifications ??= []);

// Mirror writes locally so a database outage doesn't stop the demo or messaging.
function remember<T extends { id: string }>(items: T[], value: T): T {
  const index = items.findIndex((item) => item.id === value.id);
  if (index >= 0) items[index] = value;
  else items.unshift(value);
  return value;
}

function newest<T extends { id: string; createdAt: string }>(remote: T[], local: T[]): T[] {
  const merged = new Map(local.map((item) => [item.id, item]));
  for (const item of remote) merged.set(item.id, item);
  return [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveMessage(message: OutreachMessage): Promise<OutreachMessage> {
  remember(messages, message);
  if (supabase) {
    try {
      const { error } = await supabase.from("outreach_messages").upsert(messageToRow(message));
      if (error) throw error;
    } catch (error) {
      console.error("[outreach] Message storage failed; using memory", error);
    }
  }
  return message;
}

export async function listMessages(): Promise<OutreachMessage[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("outreach_messages").select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return newest((data as MessageRow[]).map(messageFromRow), messages);
    } catch (error) {
      console.error("[outreach] Message lookup failed; using memory", error);
    }
  }
  return newest([], messages);
}

export async function saveNotification(notification: AppNotification): Promise<AppNotification> {
  remember(notifications, notification);
  if (supabase) {
    try {
      const { error } = await supabase.from("notifications").upsert(notificationToRow(notification));
      if (error) throw error;
    } catch (error) {
      console.error("[outreach] Notification storage failed; using memory", error);
    }
  }
  return notification;
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const local = notifications.filter((n) => n.userId === userId);
  if (supabase) {
    try {
      const { data, error } = await supabase.from("notifications").select("*")
        .eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return newest((data as NotificationRow[]).map(notificationFromRow), local);
    } catch (error) {
      console.error("[outreach] Notification lookup failed; using memory", error);
    }
  }
  return newest([], local);
}

export async function readNotification(id: string): Promise<AppNotification | undefined> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("notifications").update({ read: true })
        .eq("id", id).select().maybeSingle();
      if (error) throw error;
      if (data) return remember(notifications, notificationFromRow(data as NotificationRow));
    } catch (error) {
      console.error("[outreach] Mark read failed; using memory", error);
    }
  }
  const notification = notifications.find((n) => n.id === id);
  return notification ? remember(notifications, { ...notification, read: true }) : undefined;
}
