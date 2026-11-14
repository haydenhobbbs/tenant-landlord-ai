import { createClient } from "@supabase/supabase-js";
import * as webpush from "web-push";
import { isUuid, supabase } from "@/lib/store";

export interface StoredPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

export function pushConfigured() {
  return !!(supabase && publicKey && privateKey && subject);
}

export function pushPublicKey() {
  return pushConfigured() ? publicKey : null;
}

export async function authenticatedUser(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !anonKey) return null;
  const auth = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await auth.auth.getUser(token);
  return error ? null : data.user;
}

// Web Push endpoints are HTTPS delivery capabilities. Limit server requests to
// browser push services so a crafted subscription cannot target arbitrary hosts.
function allowedEndpoint(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return value.length <= 2048 && url.protocol === "https:" && !url.username && !url.password
      && (!url.port || url.port === "443") && (
        host === "fcm.googleapis.com" ||
        host === "web.push.apple.com" || host.endsWith(".push.apple.com") ||
        host === "updates.push.services.mozilla.com" ||
        host.endsWith(".notify.windows.com")
      );
  } catch {
    return false;
  }
}

export function validSubscription(value: unknown): value is StoredPushSubscription {
  if (!value || typeof value !== "object") return false;
  const sub = value as Partial<StoredPushSubscription>;
  const key = sub.keys;
  return typeof sub.endpoint === "string" && allowedEndpoint(sub.endpoint)
    && !!key && typeof key.p256dh === "string" && typeof key.auth === "string"
    && /^[A-Za-z0-9_=-]{40,200}$/.test(key.p256dh)
    && /^[A-Za-z0-9_=-]{8,100}$/.test(key.auth);
}

export async function savePushSubscription(userId: string, sub: StoredPushSubscription) {
  if (!supabase) throw new Error("Push storage is unavailable");
  const { data: existing, error: lookupError } = await supabase.from("push_subscriptions")
    .select("user_id").eq("endpoint", sub.endpoint).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing && existing.user_id !== userId) throw new Error("This device is subscribed to another account. Turn off its notifications first.");
  const { error } = await supabase.from("push_subscriptions").upsert({
    endpoint: sub.endpoint, user_id: userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth,
  }, { onConflict: "endpoint" });
  if (error) throw error;
}

export async function removePushSubscription(userId: string, endpoint: string) {
  if (!supabase) throw new Error("Push storage is unavailable");
  const { error } = await supabase.from("push_subscriptions").delete()
    .eq("user_id", userId).eq("endpoint", endpoint);
  if (error) throw error;
}

export async function sendPush(userId: string, body: string, link?: string) {
  const db = supabase;
  if (!pushConfigured() || !db || !isUuid(userId)) return;
  const { data, error } = await db.from("push_subscriptions")
    .select("endpoint,p256dh,auth").eq("user_id", userId);
  if (error) {
    console.error("[push] Subscription lookup failed", error);
    return;
  }
  webpush.setVapidDetails(subject!, publicKey!, privateKey!);
  const url = link?.startsWith("/") && !link.startsWith("//") ? link : "/";
  await Promise.allSettled((data ?? []).map(async (row) => {
    try {
      await webpush.sendNotification({
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      }, JSON.stringify({ body, url }), { TTL: 86400 });
    } catch (failure) {
      const status = (failure as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
      } else {
        console.error("[push] Delivery failed", status ?? failure);
      }
    }
  }));
}
