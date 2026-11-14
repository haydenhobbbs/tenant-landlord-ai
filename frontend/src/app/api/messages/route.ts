import { NextResponse, connection, type NextRequest } from "next/server";
import { addMessage, listMessages } from "@/lib/tenantData";
import type { ChatMessage } from "@/lib/types";

// GET  /api/messages?tenantId=abc -> the tenant ↔ landlord conversation
// POST /api/messages body: { tenantId, senderId, senderRole, senderName, body }
// Used by both the tenant and landlord chat screens (components/ChatThread.tsx).

export async function GET(req: NextRequest) {
  await connection();
  const tenantId = req.nextUrl.searchParams.get("tenantId");
  if (!tenantId) return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  return NextResponse.json(await listMessages(tenantId));
}

export async function POST(req: Request) {
  const input = (await req.json()) as Partial<ChatMessage>;
  const body = input.body?.trim();
  if (!input.tenantId || !input.senderId || !body || (input.senderRole !== "tenant" && input.senderRole !== "landlord")) {
    return NextResponse.json({ error: "tenantId, senderId, senderRole and body are required" }, { status: 400 });
  }
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    senderId: input.senderId,
    senderRole: input.senderRole,
    senderName: input.senderName?.trim() || (input.senderRole === "landlord" ? "Landlord" : "Tenant"),
    body: body.slice(0, 2000),
    createdAt: new Date().toISOString(),
  };
  return NextResponse.json(await addMessage(message), { status: 201 });
}
