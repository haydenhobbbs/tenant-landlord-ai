import { connection, NextResponse } from "next/server";
import { listNotifications } from "@/lib/outreach";
import { demoFrom, getCaller, unauthorized } from "@/lib/serverAuth";

// GET /api/notifications -> the signed-in user's notifications.
// (Notifications are created on the server by notify(); there is no public
// "send a notification" endpoint, so nobody can push messages to other people.)
export async function GET(request: Request) {
  await connection();
  const caller = await getCaller(request, demoFrom(request));
  if (!caller) return unauthorized();
  return NextResponse.json(await listNotifications(caller.id));
}
