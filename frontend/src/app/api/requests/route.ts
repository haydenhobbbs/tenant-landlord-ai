import { NextResponse, connection } from "next/server";
import { processNewRequest } from "@/lib/pipeline";
import { listRequests, saveRequest } from "@/lib/store";
import type { MaintenanceRequest, NewRequestInput } from "@/lib/types";

// GET /api/requests -> all requests (newest first)
export async function GET() {
  await connection();
  return NextResponse.json(await listRequests());
}

// POST /api/requests -> tenant submits; AI finds + contacts contractors
export async function POST(req: Request) {
  const input = (await req.json()) as NewRequestInput;

  if (!input.title?.trim() || !input.description?.trim()) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  const request = await saveRequest({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    tenantName: input.tenantName,
    unit: input.unit,
    property: input.property,
    title: input.title,
    description: input.description,
    photos: input.photos ?? [],
    urgency: input.urgency,
    suggestions: [],
    status: "submitted",
  } satisfies MaintenanceRequest);

  return NextResponse.json(await processNewRequest(request), { status: 201 });
}
