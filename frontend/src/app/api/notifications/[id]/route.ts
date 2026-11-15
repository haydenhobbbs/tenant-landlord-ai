import { NextResponse } from "next/server";
import { listNotifications, markNotificationRead } from "@/lib/outreach";
import { getCaller, unauthorized } from "@/lib/serverAuth";

// PATCH /api/notifications/:id -> mark one of YOUR notifications as read.
export async function PATCH(request: Request, ctx: RouteContext<"/api/notifications/[id]">) {
  const { id } = await ctx.params;
  const userId = new URL(request.url).searchParams.get("userId") ?? undefined;
  const caller = await getCaller(request, { id: userId, role: "tenant" });
  if (!caller) return unauthorized();
  const mine = await listNotifications(caller.id);
  if (!mine.some((n) => n.id === id)) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  const notification = await markNotificationRead(id);
  return notification ? NextResponse.json(notification)
    : NextResponse.json({ error: "Notification not found" }, { status: 404 });
}
