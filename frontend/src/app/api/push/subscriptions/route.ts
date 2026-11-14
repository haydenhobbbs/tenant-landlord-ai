import { NextResponse } from "next/server";
import {
  authenticatedUser, pushConfigured, removePushSubscription,
  savePushSubscription, validSubscription,
} from "@/lib/push";

export async function POST(request: Request) {
  if (!pushConfigured()) return NextResponse.json({ error: "Push notifications are not configured yet." }, { status: 503 });
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to turn on notifications." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!validSubscription(body)) return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  try {
    await savePushSubscription(user.id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[push] Subscription save failed", error);
    const conflict = error instanceof Error && error.message.startsWith("This device is subscribed");
    return NextResponse.json({ error: conflict ? error.message : "Could not save this device." }, { status: conflict ? 409 : 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to turn off notifications." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.endpoint !== "string" || body.endpoint.length > 2048) {
    return NextResponse.json({ error: "A subscription endpoint is required." }, { status: 400 });
  }
  try {
    await removePushSubscription(user.id, body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[push] Subscription removal failed", error);
    return NextResponse.json({ error: "Could not remove this device." }, { status: 500 });
  }
}
