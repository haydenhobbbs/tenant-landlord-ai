import type { ContactChannel, Contractor } from "../types";

export type { ContactChannel as Channel } from "../types";

export interface ContactResult {
  ok: boolean;
  channel: ContactChannel;
  to: string;
  providerId?: string;
  dryRun: boolean;
  error?: string;
}

export interface OutreachMessage {
  id: string;
  requestId: string;
  contractor: Contractor;
  channel: ContactChannel;
  direction: "outbound" | "inbound";
  to?: string;
  body: string;
  createdAt: string;
}

export type NotificationType = "message" | "request_update" | "rent_reminder";

export interface AppNotification {
  id: string;
  userId: string;
  message: string;
  type: NotificationType;
  link?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotifyOptions {
  type?: NotificationType;
  link?: string;
  requestId?: string;
}
