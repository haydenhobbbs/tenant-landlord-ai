import { sendNotification } from "web-push";
import { deletePushSubscription, listPushSubscriptions } from "./db";

export function vapidPublicKey(): string | undefined {
  return process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined;
}

export async function sendWebPush(userId: string, message: string, url: string): Promise<void> {
  const publicKey = vapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.info("[push] Dry run: VAPID is not configured; skipping delivery");
    return;
  }
  try {
    const subscriptions = await listPushSubscriptions(userId);
    const payload = JSON.stringify({ title: "Tenly", body: message, url });
    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await sendNotification(subscription, payload, {
          vapidDetails: { subject, publicKey, privateKey }, timeout: 5000, TTL: 3600,
        });
      } catch (error) {
        const status = (error as { statusCode?: number } | null)?.statusCode;
        if (status === 404 || status === 410) await deletePushSubscription(subscription.endpoint);
        // Avoid logging subscription endpoints or keys from provider errors.
        else console.error("[push] Delivery failed", status ?? "unknown status");
      }
    }));
  } catch {
    console.error("[push] Delivery failed");
  }
}
