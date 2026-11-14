import { NextResponse } from "next/server";
import { markThreadRead } from "@/lib/tenantData";

// POST /api/messages/read  body: { tenantId, reader: "tenant" | "landlord" }
// The reader opened the thread, so the other side's messages count as read.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { tenantId?: string; reader?: string } | null;
  if (!body?.tenantId || (body.reader !== "tenant" && body.reader !== "landlord")) {
    return NextResponse.json({ error: "tenantId and reader are required" }, { status: 400 });
  }
  await markThreadRead(body.tenantId, body.reader);
  return NextResponse.json({ ok: true });
}
