import { getNotifications, readNotification, saveNotification } from "./db";
import { sendEmail, sendSms } from "./send";
import type { AppNotification, NotifyOptions } from "./types";

export async function notify(userId: string, message: string, opts: NotifyOptions = {}): Promise<AppNotification> {
  const notification = await saveNotification({
    id: crypto.randomUUID(), userId, message, kind: opts.kind ?? "new_message",
    requestId: opts.requestId, read: false, createdAt: new Date().toISOString(),
  });
  const context = { requestId: opts.requestId };
  await Promise.all([
    opts.sms ? sendSms(opts.sms, message, context) : undefined,
    opts.email ? sendEmail({ to: opts.email, subject: "Home maintenance update", text: message }, context) : undefined,
  ]);
  return notification;
}

export const listNotifications = getNotifications;
export const markRead = readNotification;
