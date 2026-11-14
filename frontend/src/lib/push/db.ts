import type { PushSubscription } from "web-push";
import { supabase } from "@/lib/store";

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}

const globalStore = globalThis as typeof globalThis & {
  __pushSubscriptions?: Map<string, SubscriptionRow>;
};
const subscriptions = (globalStore.__pushSubscriptions ??= new Map());

export async function savePushSubscription(userId: string, subscription: PushSubscription, userAgent: string | null): Promise<void> {
  const row: SubscriptionRow = {
    id: crypto.randomUUID(), user_id: userId, endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh, auth: subscription.keys.auth,
    user_agent: userAgent, created_at: new Date().toISOString(),
  };
  if (supabase) {
    try {
      const { error } = await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
      if (error) throw error;
      subscriptions.delete(row.endpoint);
      return;
    } catch (error) {
      console.error("[push] Subscription storage failed; using memory", error);
    }
  }
  subscriptions.set(row.endpoint, row);
}

export async function listPushSubscriptions(userId: string): Promise<PushSubscription[]> {
  const merged = new Map<string, SubscriptionRow>();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
      if (error) throw error;
      for (const row of (data ?? []) as SubscriptionRow[]) merged.set(row.endpoint, row);
    } catch (error) {
      console.error("[push] Subscription lookup failed; using memory", error);
    }
  }
  // A fallback upsert can also move a device to a different account.
  for (const row of subscriptions.values()) merged.set(row.endpoint, row);
  return [...merged.values()].filter((row) => row.user_id === userId).map((row) => ({
    endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth },
  }));
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  subscriptions.delete(endpoint);
  if (supabase) {
    try {
      const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      if (error) throw error;
    } catch (error) {
      console.error("[push] Subscription removal failed", error);
    }
  }
}
