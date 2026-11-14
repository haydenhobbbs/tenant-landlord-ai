// Teammate C: contractor outreach + notifications.
// These are the hand-off shapes other teammates build against.
// Kept here (not in lib/types.ts) so we don't touch the shared file without
// asking in the group chat first.

import type { Category, Contractor } from "../types";

export type Channel = "sms" | "call" | "email";

/** A contractor we can reach. Extends the shared Contractor shape. */
export interface OutreachContractor extends Contractor {
  email?: string;
  website?: string;
  address?: string;
  reviewCount?: number;
  source: "preapproved" | "online";
  placeId?: string; // Google Places id when source === "online"
}

/** Where to search, e.g. "Austin, TX" or "123 Main St, Austin, TX 78701". */
export type SearchLocation = string;

export type { Category };

/** Result of contactContractor(). `dryRun` is true when keys are missing. */
export interface ContactResult {
  ok: boolean;
  channel: Channel;
  to: string;
  providerId?: string; // Twilio SID or Resend id
  dryRun: boolean;
  error?: string;
}

export interface ContactOptions {
  requestId: string;
  subject?: string; // email only
  attachments?: { filename: string; content: string }[]; // base64, for calendar invites
}

/** One message in or out, saved so replies can be matched to a request. */
export interface OutreachMessage {
  id: string;
  requestId: string;
  contractorId: string;
  contractor?: OutreachContractor;
  channel: Channel;
  direction: "outbound" | "inbound";
  to: string;
  from: string;
  body: string;
  createdAt: string; // ISO
}

/** What the AI read out of a contractor's reply. Hayden's AI fills this in. */
export interface ParsedReply {
  available: boolean | null; // null = unclear
  proposedTime?: string; // ISO if we could parse one
  proposedTimeText?: string; // raw, e.g. "Tue 10am"
  price?: number; // USD
  notes?: string;
}

export type NotificationKind =
  | "status_change"
  | "new_message"
  | "rent_reminder"
  | "booking";

export interface AppNotification {
  id: string;
  userId: string;
  message: string;
  kind: NotificationKind;
  requestId?: string;
  read: boolean;
  createdAt: string; // ISO
}

export interface NotifyOptions {
  kind?: NotificationKind;
  requestId?: string;
  /** Also send by SMS / email if we have a phone / email for the user. */
  sms?: string;
  email?: string;
}
