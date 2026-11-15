import { NextResponse, after, connection } from "next/server";
import { approveRequest, completeRequest, declineRequest, findContractors, handleItMyself, startFindingContractors } from "@/lib/pipeline";
import { getRequest } from "@/lib/store";
import { canSeeRequest, demoFrom, forbidden, getCaller, isRequestLandlord, unauthorized } from "@/lib/serverAuth";

// Contacting contractors (AI writes each email) runs after the response.
export const maxDuration = 120;

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
//   { action: "find" }                          landlord: have the AI contact contractors
//   { action: "self", when?, note? }            landlord will fix it personally
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
    case "find": {
      // Nothing is emailed until the landlord says so. Answer right away;
      // the emails go out in the background (about 20 seconds).
      if (request.status !== "submitted") {
        return NextResponse.json({ error: `This request is already ${request.status}.` }, { status: 409 });
      }
      const started = await startFindingContractors(request);
      after(async () => {
        try {
          await findContractors(started);
        } catch (err) {
          console.error("[requests] Contacting contractors failed", id, err);
        }
      });
      return NextResponse.json(started);
    }
    case "self": {
      // { action: "self", when?, note? } landlord will do the repair personally
      const result = await handleItMyself(request, { id: caller.id, name: caller.name }, { when: body.when, note: body.note });
      return "error" in result ? NextResponse.json({ error: result.error }, { status: 409 }) : NextResponse.json(result);
    }
    case "complete":
      return NextResponse.json(await completeRequest(request));
    default:
      return NextResponse.json({ error: "action must be find, self, approve, decline or complete" }, { status: 400 });
  }
}
