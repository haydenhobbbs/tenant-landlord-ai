import { NextResponse, connection } from "next/server";
import { listLandlordLeases } from "@/lib/leasePdf";
import { getCaller, unauthorized } from "@/lib/serverAuth";

// GET /api/leases -> leases on the signed-in landlord's properties.
export async function GET(req: Request) {
  await connection();
  const caller = await getCaller(req, { id: "demo-landlord", role: "landlord" });
  if (!caller || caller.role !== "landlord") return unauthorized("Sign in as a landlord.");
  const leases = await listLandlordLeases(caller.id);
  return NextResponse.json(leases.map((l) => ({
    id: l.id, tenantName: l.tenantName, unit: l.unit, address: l.address, city: l.city, state: l.state,
    rent: l.rent, start: l.start, end: l.end,
  })));
}
