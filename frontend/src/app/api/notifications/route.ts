import { connection, NextResponse } from "next/server";
import { listNotifications, notify } from "@/lib/outreach/notify";
import type { NotificationKind } from "@/lib/outreach/types";

export async function GET(request: Request) {
  await connection();
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId?.trim()) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  return NextResponse.json(await listNotifications(userId));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.userId !== "string" || !body.userId.trim()
    || typeof body.message !== "string" || !body.message.trim()
    || (body.kind !== undefined && !["status_change", "new_message", "rent_reminder", "booking"].includes(body.kind))
    || (body.requestId !== undefined && typeof body.requestId !== "string")) {
    return NextResponse.json({ error: "Valid userId, message, kind and requestId are required" }, { status: 400 });
  }
  return NextResponse.json(await notify(body.userId, body.message, {
    kind: body.kind as NotificationKind | undefined, requestId: body.requestId,
  }), { status: 201 });
}
