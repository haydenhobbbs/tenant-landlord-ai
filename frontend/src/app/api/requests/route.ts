import { NextResponse, connection } from "next/server";
import { findBestContractor } from "@/lib/ai";
import { listRequests, saveRequest } from "@/lib/store";
import type { MaintenanceRequest, NewRequestInput } from "@/lib/types";

// GET /api/requests -> all requests (newest first)
export async function GET() {
  await connection();
  return NextResponse.json(listRequests());
}

// POST /api/requests -> tenant submits a new request, AI matches a contractor
export async function POST(req: Request) {
  const input = (await req.json()) as NewRequestInput;

  if (!input.title?.trim() || !input.description?.trim()) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  const request: MaintenanceRequest = {
    ...input,
    id: crypto.randomUUID(),
    status: "submitted",
    createdAt: new Date().toISOString(),
  };

  request.quote = await findBestContractor(request);
  request.status = "awaiting_approval";

  return NextResponse.json(saveRequest(request), { status: 201 });
}
