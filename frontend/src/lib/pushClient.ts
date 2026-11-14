"use client";

import { getBrowserSupabase } from "@/lib/supabaseBrowser";

export async function pushAccessToken() {
  const { data } = await getBrowserSupabase()?.auth.getSession() ?? { data: { session: null } };
  return data.session?.access_token ?? null;
}

export async function currentPushSubscription() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function unsubscribeCurrentDevice() {
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  const token = await pushAccessToken();
  if (token) {
    try {
      await fetch("/api/push/subscriptions", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    } catch {
      // Unsubscribing locally still stops this device receiving messages.
    }
  }
  await subscription.unsubscribe();
}

export function vapidKeyBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}
