import { NextResponse, connection } from "next/server";
import { approveRequest, completeRequest, declineRequest, handleItMyself } from "@/lib/pipeline";
import { getRequest } from "@/lib/store";
import { canSeeRequest, demoFrom, forbidden, getCaller, isRequestLandlord, unauthorized } from "@/lib/serverAuth";

// GET /api/requests/:id -> one request (the tenant's repair page)
export async function GET(req: Request, ctx: RouteContext<"/api/requests/[id]">) {
  await connection();
  const caller = await getCaller(req, demoFrom(req));
  if (!caller) return unauthorized();
  const { id } = await ctx.params;
  const request = await getRequest(id);
  // Same answer for "missing" and "not yours", so ids can't be probed.
  if (!request || !canSeeRequest(caller, request)) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  return NextResponse.json(request);
}

// PATCH /api/requests/:id
//   { action: "approve", offerIndex?: number }  landlord approves a contractor
//   { action: "decline" }                       landlord declines
//   { action: "complete" }                      job is done
export async function PATCH(req: Request, ctx: RouteContext<"/api/requests/[id]">) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { action?: string; offerIndex?: number; when?: string; note?: string };

  const caller = await getCaller(req, { ...demoFrom(req), role: "landlord" });
  if (!caller) return unauthorized();
  const request = await getRequest(id);
  if (!request || !canSeeRequest(caller, request)) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (!isRequestLandlord(caller, request)) return forbidden("Only this home's landlord can do that.");

  switch (body.action) {
    case "approve":
      if (request.status !== "contractor_suggested") {
        return NextResponse.json({ error: `Can't approve a request that is ${request.status}` }, { status: 409 });
      }
      return NextResponse.json(await approveRequest(request, body.offerIndex ?? 0));
    case "decline":
      return NextResponse.json(await declineRequest(request));
    case "self": {
      // { action: "self", when?, note? } landlord will do the repair personally
      const result = await handleItMyself(request, { id: caller.id, name: caller.name }, { when: body.when, note: body.note });
      return "error" in result ? NextResponse.json({ error: result.error }, { status: 409 }) : NextResponse.json(result);
    }
    case "complete":
      return NextResponse.json(await completeRequest(request));
    default:
      return NextResponse.json({ error: "action must be approve, decline, self or complete" }, { status: 400 });
  }
}
