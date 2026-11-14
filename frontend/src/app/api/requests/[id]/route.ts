import { NextResponse } from "next/server";
import { getRequest, saveRequest } from "@/lib/store";
import { bookContractor, notify } from "@/lib/outreach";

// PATCH /api/requests/:id  body: { decision: "approve" | "decline" }
// Landlord approves or declines the AI's suggested contractor.
export async function PATCH(req: Request, ctx: RouteContext<"/api/requests/[id]">) {
  const { id } = await ctx.params;
  const { decision } = (await req.json()) as { decision: "approve" | "decline" };

  const request = await getRequest(id);
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (decision !== "approve" && decision !== "decline") {
    return NextResponse.json({ error: "decision must be approve or decline" }, { status: 400 });
  }

  request.status = decision === "approve" ? "approved" : "declined";
  const saved = await saveRequest(request);
  try {
    if (decision === "approve") {
      // Booking also saves the tenant's "Plumber booked ..." notification.
      await bookContractor(saved);
    } else {
      await notify(`tenant:${request.tenantName}`, "Your landlord declined this repair request", {
        kind: "status_change", requestId: id,
      });
    }
  } catch (error) {
    console.error("[outreach] Approval saved, but messaging failed", error);
  }

  return NextResponse.json(saved);
}
