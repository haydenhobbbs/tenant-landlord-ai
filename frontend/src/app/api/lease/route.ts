import { NextResponse, connection, type NextRequest } from "next/server";
import { getLease } from "@/lib/tenantData";

// GET /api/lease?tenantId=abc&name=Jordan%20Lee&unit=Apt%203B
// name/unit only fill in the sample lease until real leases are uploaded.
export async function GET(req: NextRequest) {
  await connection();
  const p = req.nextUrl.searchParams;
  const tenantId = p.get("tenantId");
  if (!tenantId) return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  return NextResponse.json(
    await getLease(tenantId, { tenantName: p.get("name") ?? "Tenant", unit: p.get("unit") ?? "" }),
  );
}
