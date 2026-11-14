import { connection, NextResponse } from "next/server";
import { listNotifications, notify } from "@/lib/outreach";
import type { NotificationType } from "@/lib/outreach/types";

export async function GET(request: Request) {
  await connection();
  const query = new URL(request.url).searchParams;
  const userId = query.get("userId")?.trim();
  const name = query.get("name")?.trim();
  if (!userId && !name) return NextResponse.json({ error: "userId or name is required" }, { status: 400 });
  return NextResponse.json(await listNotifications(userId || `name:${name}`));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || (body.userId !== undefined && (typeof body.userId !== "string" || !body.userId.trim()))
    || (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim()))
    || (!body.userId && !body.name)
    || typeof body.message !== "string" || !body.message.trim()
    || (body.type !== undefined && !["message", "request_update", "rent_reminder"].includes(body.type))) {
    return NextResponse.json({ error: "Valid userId or name, message and optional type are required" }, { status: 400 });
  }
  // This legacy demo route is public, so it must not trigger a phone alert.
  await notify({ userId: body.userId, name: body.name }, body.message, { type: body.type as NotificationType | undefined, push: false });
  return NextResponse.json({ ok: true }, { status: 201 });
}
