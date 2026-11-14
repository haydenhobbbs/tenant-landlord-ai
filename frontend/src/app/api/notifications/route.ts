import { NextResponse, connection, type NextRequest } from "next/server";
import { listNotifications, markAllRead } from "@/lib/tenantData";

// GET   /api/notifications?userId=abc -> newest first
// PATCH /api/notifications body: { userId } -> mark all as read

export async function GET(req: NextRequest) {
  await connection();
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  return NextResponse.json(await listNotifications(userId));
}

export async function PATCH(req: Request) {
  const { userId } = (await req.json()) as { userId?: string };
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  await markAllRead(userId);
  return NextResponse.json({ ok: true });
}
