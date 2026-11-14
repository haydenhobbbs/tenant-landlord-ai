import { getNotifications, readNotification, saveNotification } from "./db";
import { sendEmail, sendSms } from "./send";
import type { NotifyOptions } from "./types";

export async function notify(
  to: { userId?: string; name?: string; phone?: string; email?: string },
  message: string, opts: NotifyOptions = {},
): Promise<void> {
  try {
    await saveNotification({
      id: crypto.randomUUID(), userId: to.userId ?? `name:${to.name}`, message,
      type: opts.type ?? "request_update", link: opts.link, read: false, createdAt: new Date().toISOString(),
    });
    await Promise.all([
      to.phone ? sendSms(to.phone, message) : undefined,
      to.email ? sendEmail({ to: to.email, subject: "Home maintenance update", text: message }) : undefined,
    ]);
  } catch (error) {
    console.error("[outreach] Notification failed", error);
  }
}

export const listNotifications = getNotifications;
export const markNotificationRead = readNotification;
