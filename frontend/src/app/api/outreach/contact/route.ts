import { NextResponse } from "next/server";
import { contactContractor } from "@/lib/outreach/contact";
import { isCategory } from "@/lib/outreach/search";
import type { Channel, OutreachContractor } from "@/lib/outreach/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const contractor = body?.contractor;
  if (!contractor || typeof contractor.id !== "string" || !contractor.id.trim()
    || typeof contractor.name !== "string" || !contractor.name.trim()
    || !isCategory(contractor.trade) || typeof contractor.phone !== "string"
    || typeof contractor.rating !== "number" || !Number.isFinite(contractor.rating)
    || (contractor.email !== undefined && typeof contractor.email !== "string")
    || !["preapproved", "online"].includes(contractor.source)
    || typeof body.message !== "string" || !body.message.trim()
    || typeof body.requestId !== "string" || !body.requestId.trim()
    || !["sms", "call", "email"].includes(body.channel)) {
    return NextResponse.json({ error: "contractor, message, channel and requestId are required and must be valid" }, { status: 400 });
  }
  const result = await contactContractor(contractor as OutreachContractor, body.message, body.channel as Channel, {
    requestId: body.requestId,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
