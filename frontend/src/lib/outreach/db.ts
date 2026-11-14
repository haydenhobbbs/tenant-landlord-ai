import { supabase } from "@/lib/store";
import type { Contractor } from "../types";
import type { AppNotification, OutreachMessage } from "./types";

interface MessageRow {
  id: string;
  request_id: string;
  contractor: Contractor & { _to?: string };
  channel: OutreachMessage["channel"];
  direction: OutreachMessage["direction"];
  body: string;
  created_at: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  body: string;
  type: AppNotification["type"];
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const messageFromRow = (r: MessageRow): OutreachMessage => {
  const { _to, ...contractor } = r.contractor;
  return {
    id: r.id, requestId: r.request_id, contractor, channel: r.channel,
    direction: r.direction, to: _to, body: r.body, createdAt: r.created_at,
  };
};
const notificationFromRow = (r: NotificationRow): AppNotification => ({
  id: r.id, userId: r.user_id, message: r.body, type: r.type,
  link: r.link ?? undefined, read: !!r.read_at, readAt: r.read_at ?? undefined, createdAt: r.created_at,
});

export const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const globalStore = globalThis as typeof globalThis & {
  __outreachMessages?: OutreachMessage[];
  __outreachNotifications?: AppNotification[];
};
const messages = (globalStore.__outreachMessages ??= []);
const notifications = (globalStore.__outreachNotifications ??= []);

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

export async function saveMessage(message: OutreachMessage): Promise<void> {
  remember(messages, message);
  if (supabase) {
    try {
      const { error } = await supabase.from("outreach_log").insert({
        id: message.id, request_id: message.requestId,
        contractor: { ...message.contractor, _to: message.to }, channel: message.channel,
        direction: message.direction, body: message.body, created_at: message.createdAt,
      });
      if (error) throw error;
    } catch (error) {
      console.error("[outreach] Message storage failed; using memory", error);
    }
  }
}

export async function listMessages(requestId?: string, contractorId?: string): Promise<OutreachMessage[]> {
  const matches = (m: OutreachMessage) => (!requestId || m.requestId === requestId)
    && (!contractorId || m.contractor.id === contractorId);
  const local = messages.filter(matches);
  if (supabase) {
    try {
      let query = supabase.from("outreach_log").select("*");
      if (requestId) query = query.eq("request_id", requestId);
      if (contractorId) query = query.eq("contractor->>id", contractorId);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return newest((data as MessageRow[]).map(messageFromRow), local);
    } catch (error) {
      console.error("[outreach] Message lookup failed; using memory", error);
    }
  }
  return newest([], local);
}

export async function saveNotification(notification: AppNotification): Promise<void> {
  if (supabase && isUuid(notification.userId)) {
    try {
      const { error } = await supabase.from("notifications").insert({
        id: notification.id, user_id: notification.userId, body: notification.message,
        type: notification.type, link: notification.link ?? null,
        read_at: notification.readAt ?? null, created_at: notification.createdAt,
      });
      if (error) throw error;
      return;
    } catch (error) {
      console.error("[outreach] Notification storage failed; using memory", error);
    }
  }
  remember(notifications, notification);
}

export async function getNotifications(key: string): Promise<AppNotification[]> {
  const local = notifications.filter((n) => n.userId === key);
  if (supabase && isUuid(key)) {
    try {
      const { data, error } = await supabase.from("notifications").select("*")
        .eq("user_id", key).order("created_at", { ascending: false });
      if (error) throw error;
      return newest((data as NotificationRow[]).map(notificationFromRow), local);
    } catch (error) {
      console.error("[outreach] Notification lookup failed; using memory", error);
    }
  }
  return newest([], local);
}

export async function readNotification(id: string): Promise<AppNotification | undefined> {
  const readAt = new Date().toISOString();
  const local = notifications.find((n) => n.id === id);
  if (local) remember(notifications, { ...local, read: true, readAt });
  if (supabase && isUuid(id)) {
    try {
      const { data, error } = await supabase.from("notifications").update({ read_at: readAt })
        .eq("id", id).select().maybeSingle();
      if (error) throw error;
      if (data) return notificationFromRow(data as NotificationRow);
    } catch (error) {
      console.error("[outreach] Mark read failed; using memory", error);
    }
  }
  return notifications.find((n) => n.id === id);
}
