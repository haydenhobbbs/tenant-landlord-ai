import { NextResponse } from "next/server";
import { contactContractor, isTrade } from "@/lib/outreach";
import type { ContactChannel, Contractor } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
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
