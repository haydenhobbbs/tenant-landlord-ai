import { NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/outreach";

export async function PATCH(_request: Request, ctx: RouteContext<"/api/notifications/[id]">) {
  const { id } = await ctx.params;
  const notification = await markNotificationRead(id);
  return notification ? NextResponse.json(notification)
    : NextResponse.json({ error: "Notification not found" }, { status: 404 });
}
