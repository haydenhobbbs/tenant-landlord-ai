import { NextResponse, connection, type NextRequest } from "next/server";
import { notify } from "@/lib/outreach";
import { savePhotos } from "@/lib/photos";
import { addMessage } from "@/lib/tenantData";
import { processNewRequest } from "@/lib/pipeline";
import { listRequests, saveRequest } from "@/lib/store";
import type { MaintenanceRequest, NewRequestInput } from "@/lib/types";

// Real AI calls (contractor outreach + legal research) take ~30-60s.
export const maxDuration = 120;

// GET /api/requests              -> all requests (newest first), for the landlord
// GET /api/requests?tenantId=abc -> just that tenant's requests
export async function GET(req: NextRequest) {
  await connection();
  const tenantId = req.nextUrl.searchParams.get("tenantId") ?? undefined;
  return NextResponse.json(await listRequests({ tenantId }));
}

// POST /api/requests -> tenant submits; AI finds + contacts contractors
export async function POST(req: Request) {
  const input = (await req.json()) as NewRequestInput;

  if (!input.title?.trim() || !input.description?.trim()) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const request = await saveRequest({
    id,
    tenantId: input.tenantId,
    createdAt: new Date().toISOString(),
    tenantName: input.tenantName,
    unit: input.unit,
    property: input.property,
    title: input.title,
    description: input.description,
    photos: await savePhotos(id, input.photos), // uploads data: URLs to Supabase Storage
    urgency: input.urgency,
    suggestions: [],
    status: "submitted",
  } satisfies MaintenanceRequest);

  // Team decision: one chat thread per tenant, and each new request shows up in it.
  if (request.tenantId) {
    await addMessage({
      id: crypto.randomUUID(),
      tenantId: request.tenantId,
      senderId: request.tenantId,
      senderRole: "tenant",
      senderName: request.tenantName,
      body: `New repair request: ${request.title}
${request.description}`,
      createdAt: new Date().toISOString(),
    }).catch((err) => console.error("new-request chat message failed", err));
  }
  await notify(
    { userId: request.landlordId, name: "Landlord" },
    `${request.tenantName} (${request.unit}) sent a new repair request: ${request.title}`,
    { type: "message", link: "/landlord/messages", requestId: id },
  );
  await notify(
    { userId: request.tenantId, name: request.tenantName },
    `Got it. We're contacting repair people about "${request.title}".`,
    { link: `/tenant/requests/${id}`, requestId: id },
  );
  return NextResponse.json(await processNewRequest(request), { status: 201 });
}
