import { NextResponse } from "next/server";
import { markThreadRead } from "@/lib/tenantData";
import { canUseThread, forbidden, getCaller, unauthorized } from "@/lib/serverAuth";

// POST /api/messages/read  body: { tenantId, reader: "tenant" | "landlord" }
// The reader opened the thread, so the other side's messages count as read.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { tenantId?: string; reader?: string } | null;
  if (!body?.tenantId || (body.reader !== "tenant" && body.reader !== "landlord")) {
    return NextResponse.json({ error: "tenantId and reader are required" }, { status: 400 });
  }
  const caller = await getCaller(req, { id: body.reader === "tenant" ? body.tenantId : "demo-landlord", role: body.reader });
  if (!caller) return unauthorized();
  if (!(await canUseThread(caller, body.tenantId))) return forbidden();
  await markThreadRead(body.tenantId, caller.role);
  return NextResponse.json({ ok: true });
}
