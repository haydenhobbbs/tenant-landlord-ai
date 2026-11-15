import { NextResponse, after, connection, type NextRequest } from "next/server";
import { notify } from "@/lib/outreach";
import { savePhotos } from "@/lib/photos";
import { tenantLink } from "@/lib/invites";
import { addMessage } from "@/lib/tenantData";
import { processNewRequest } from "@/lib/pipeline";
import { listRequests, saveRequest } from "@/lib/store";
import type { MaintenanceRequest, NewRequestInput } from "@/lib/types";

// Real AI calls (contractor outreach + legal research) take ~30-60s.
export const maxDuration = 120;

// GET /api/requests                -> all requests (newest first)
// GET /api/requests?tenantId=abc   -> just that tenant's requests
// GET /api/requests?landlordId=xyz -> requests from that landlord's tenants
export async function GET(req: NextRequest) {
  await connection();
  const tenantId = req.nextUrl.searchParams.get("tenantId") ?? undefined;
  const landlordId = req.nextUrl.searchParams.get("landlordId") ?? undefined;
  return NextResponse.json(await listRequests({ tenantId, landlordId }));
}

// POST /api/requests -> tenant submits; AI finds + contacts contractors
export async function POST(req: Request) {
  const input = (await req.json()) as NewRequestInput;

  if (!input.title?.trim() || !input.description?.trim()) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  // A tenant who joined with an invite code belongs to that property's landlord.
  // Use the real address from the property (it drives contractor search and legal guidance).
  const link = await tenantLink(input.tenantId).catch((err) => {
    console.error("tenant link lookup failed", err);
    return undefined;
  });

  const id = crypto.randomUUID();
  const request = await saveRequest({
    id,
    tenantId: input.tenantId,
    landlordId: link?.landlordId,
    createdAt: new Date().toISOString(),
    tenantName: input.tenantName,
    unit: link?.unit || input.unit,
    property: link ? { address: link.address, city: link.city, state: link.state, zip: link.zip } : input.property,
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
  // The AI work (triage, contacting contractors, legal research) takes up to a
  // minute. Answer right away so the tenant lands on their request's page (it
  // refreshes itself), and keep working after the response is sent.
  after(async () => {
    try {
      await processNewRequest(request);
    } catch (err) {
      console.error("[requests] Processing a new request failed", id, err);
    }
  });
  return NextResponse.json(request, { status: 201 });
}
