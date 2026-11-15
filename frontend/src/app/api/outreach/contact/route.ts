import { NextResponse } from "next/server";
import { contactContractor, isTrade } from "@/lib/outreach";
import { getCaller, isRequestLandlord, unauthorized } from "@/lib/serverAuth";
import { getRequest } from "@/lib/store";
import type { ContactChannel, Contractor } from "@/lib/types";

// Sends a real email/text, so only a signed-in landlord may use it, and only
// for one of their own requests. (The app itself contacts contractors through
// /api/requests/[id]/contractors; this is kept for testing.)
export async function POST(request: Request) {
  const caller = await getCaller(request, { id: "demo-landlord", role: "landlord" });
  if (!caller || caller.role !== "landlord") return unauthorized("Sign in as a landlord.");
  const body = await request.json().catch(() => null);
  const owned = typeof body?.requestId === "string" ? await getRequest(body.requestId) : undefined;
  if (!owned || !isRequestLandlord(caller, owned)) {
    return NextResponse.json({ error: "A requestId for one of your own requests is required" }, { status: 403 });
  }
  const contractor = body?.contractor;
  if (!contractor || typeof contractor.id !== "string" || !contractor.id.trim()
    || typeof contractor.name !== "string" || !contractor.name.trim()
    || !isTrade(contractor.trade)
    || (contractor.phone !== undefined && typeof contractor.phone !== "string")
    || (contractor.email !== undefined && typeof contractor.email !== "string")
    || (contractor.website !== undefined && typeof contractor.website !== "string")
    || (contractor.rating !== undefined && (typeof contractor.rating !== "number" || !Number.isFinite(contractor.rating)))
    || !["preapproved", "online"].includes(contractor.source)
    || typeof body.message !== "string" || !body.message.trim()
    || (body.requestId !== undefined && (typeof body.requestId !== "string" || !body.requestId.trim()))
    || !["sms", "call", "email"].includes(body.channel)) {
    return NextResponse.json({ error: "Valid contractor, message, channel and optional requestId are required" }, { status: 400 });
  }
  const result = await contactContractor(contractor as Contractor, body.message, body.channel as ContactChannel, {
    requestId: body.requestId,
  });
  return NextResponse.json(result, { status: result.sent ? 200 : 502 });
}
