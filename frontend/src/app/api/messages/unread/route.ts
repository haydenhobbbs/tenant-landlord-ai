import { NextResponse, connection, type NextRequest } from "next/server";
import { landlordTenantIds } from "@/lib/invites";
import { listUnread } from "@/lib/tenantData";
import { getCaller, unauthorized } from "@/lib/serverAuth";

// GET /api/messages/unread?role=landlord             -> every tenant thread with unread tenant messages
// GET /api/messages/unread?role=tenant&tenantId=abc  -> that tenant's unread landlord messages
// Powers the red count on "Messages" and the new-message pop-up.
export async function GET(req: NextRequest) {
  await connection();
  const p = req.nextUrl.searchParams;
  const role = p.get("role");
  const tenantId = p.get("tenantId") ?? undefined;
  if (role !== "landlord" && role !== "tenant") {
    return NextResponse.json({ error: "role must be landlord or tenant" }, { status: 400 });
  }
  if (role === "tenant" && !tenantId) return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  const caller = await getCaller(req, { id: tenantId ?? "demo-landlord", role });
  if (!caller) return unauthorized();
  if (caller.role === "tenant") return NextResponse.json(await listUnread("tenant", caller.id));
  // A landlord only hears about their own tenants' threads.
  const threads = await listUnread("landlord");
  const mine = await landlordTenantIds(caller.id);
  return NextResponse.json(threads.filter((t) => mine.has(t.tenantId)));
}
