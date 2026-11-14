import { NextResponse } from "next/server";
import { getRequest, saveRequest } from "@/lib/store";

// PATCH /api/requests/:id  body: { decision: "approve" | "decline" }
// Landlord approves or declines the AI's suggested contractor.
export async function PATCH(req: Request, ctx: RouteContext<"/api/requests/[id]">) {
  const { id } = await ctx.params;
  const { decision } = (await req.json()) as { decision: "approve" | "decline" };

  const request = getRequest(id);
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (decision !== "approve" && decision !== "decline") {
    return NextResponse.json({ error: "decision must be approve or decline" }, { status: 400 });
  }

  request.status = decision === "approve" ? "approved" : "declined";
  // TODO: on approve, notify the contractor + tenant (email/SMS)

  return NextResponse.json(saveRequest(request));
}
