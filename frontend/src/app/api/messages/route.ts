import { NextResponse, connection, type NextRequest } from "next/server";
import { addMessage, listMessages } from "@/lib/tenantData";
import type { ChatMessage } from "@/lib/types";
import { landlordIdForTenant } from "@/lib/landlord-server";
import { notify } from "@/lib/outreach/notify";

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
  const saved = await addMessage(message);
  try {
    const userId = saved.senderRole === "landlord"
      ? saved.tenantId : await landlordIdForTenant(saved.tenantId);
    if (userId) {
      const preview = saved.body.length > 80 ? `${saved.body.slice(0, 80)}…` : saved.body;
      await notify({ userId }, `New message from ${saved.senderName}: ${preview}`, {
        type: "message",
        link: saved.senderRole === "tenant" ? "/landlord/messages" : "/tenant/messages",
      });
    }
  } catch (error) {
    // Delivery is best effort; the saved chat message must still succeed.
    console.error("[chat] Notification failed", error);
  }
  return NextResponse.json(saved, { status: 201 });
}
