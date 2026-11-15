import { NextResponse, connection } from "next/server";
import { contactHistory } from "@/lib/pipeline";
import { getRequest } from "@/lib/store";
import { demoFrom, getCaller, isRequestLandlord, unauthorized } from "@/lib/serverAuth";

// GET /api/requests/:id/outreach -> every email/text the AI sent to contractors
// for this request, and their replies. The request's landlord only.
export async function GET(req: Request, ctx: RouteContext<"/api/requests/[id]/outreach">) {
  await connection();
  const caller = await getCaller(req, { ...demoFrom(req), role: "landlord" });
  if (!caller) return unauthorized();
  const { id } = await ctx.params;
  const request = await getRequest(id);
  if (!request || !isRequestLandlord(caller, request)) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  return NextResponse.json(await contactHistory(id));
}
