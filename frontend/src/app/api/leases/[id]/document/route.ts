import { connection } from "next/server";
import { buildLeasePdf, getLeaseRecord } from "@/lib/leasePdf";
import { getCaller, unauthorized } from "@/lib/serverAuth";

// GET /api/leases/:id/document -> the lease as a PDF, built from the saved lease.
// Only that lease's landlord and tenant can open it.
export async function GET(req: Request, ctx: RouteContext<"/api/leases/[id]/document">) {
  await connection();
  const caller = await getCaller(req);
  if (!caller) return unauthorized();
  const { id } = await ctx.params;
  const lease = await getLeaseRecord(id);
  if (!lease || (caller.id !== lease.landlordId && caller.id !== lease.tenantId)) {
    return Response.json({ error: "Lease not found" }, { status: 404 });
  }
  const bytes = await buildLeasePdf(lease);
  const name = `Lease - ${lease.address}${lease.unit ? ` ${lease.unit}` : ""}.pdf`.replace(/[^\w .,-]/g, "");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
