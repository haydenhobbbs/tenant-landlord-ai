import { NextResponse, connection } from "next/server";
import { contactExtraContractor, listExtraContractors } from "@/lib/pipeline";
import { getRequest } from "@/lib/store";

export const maxDuration = 60;

// GET /api/requests/:id/contractors -> nearby contractors found online, with `contacted`
export async function GET(_req: Request, ctx: RouteContext<"/api/requests/[id]/contractors">) {
  await connection();
  const { id } = await ctx.params;
  const request = await getRequest(id);
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  return NextResponse.json(await listExtraContractors(request));
}

// POST /api/requests/:id/contractors { contractorId } -> the AI emails that contractor
export async function POST(req: Request, ctx: RouteContext<"/api/requests/[id]/contractors">) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { contractorId?: unknown };
  if (typeof body.contractorId !== "string") {
    return NextResponse.json({ error: "contractorId is required" }, { status: 400 });
  }
  const request = await getRequest(id);
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  const result = await contactExtraContractor(request, body.contractorId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, contractor: result.contractor.name });
}
