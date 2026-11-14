import { timingSafeEqual } from "node:crypto";
import { connection, NextResponse } from "next/server";
import { FAKE_TENANTS, sendRentReminders } from "@/lib/outreach/rent";

export async function GET(request: Request) {
  await connection();
  if (process.env.CRON_SECRET) {
    const actual = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const notifications = await sendRentReminders(FAKE_TENANTS);
  return NextResponse.json({ ok: true, count: notifications.length, notifications });
}
