import { NextResponse, connection, type NextRequest } from "next/server";
import { listUnread } from "@/lib/tenantData";

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
  return NextResponse.json(await listUnread(role, tenantId));
}
