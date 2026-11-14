import { NextResponse } from "next/server";
import { approveRequest, completeRequest, declineRequest } from "@/lib/pipeline";
import { getRequest } from "@/lib/store";

// PATCH /api/requests/:id
//   { action: "approve", offerIndex?: number }  landlord approves a contractor
//   { action: "decline" }                       landlord declines
//   { action: "complete" }                      job is done
export async function PATCH(req: Request, ctx: RouteContext<"/api/requests/[id]">) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { action?: string; offerIndex?: number };

  const request = await getRequest(id);
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  switch (body.action) {
    case "approve":
      if (request.status !== "contractor_suggested") {
        return NextResponse.json({ error: `Can't approve a request that is ${request.status}` }, { status: 409 });
      }
      return NextResponse.json(await approveRequest(request, body.offerIndex ?? 0));
    case "decline":
      return NextResponse.json(await declineRequest(request));
    case "complete":
      return NextResponse.json(await completeRequest(request));
    default:
      return NextResponse.json({ error: "action must be approve, decline or complete" }, { status: 400 });
  }
}
