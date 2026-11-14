import { NextResponse } from "next/server";
import { z } from "zod";
import { deletePushSubscription, savePushSubscription } from "@/lib/push/db";
import { isUuid, supabase } from "@/lib/store";

const endpoint = z.url().max(4096).refine((value) => /^https:\/\//i.test(value));
const inputSchema = z.object({
  userId: z.string().trim().min(1).max(200),
  subscription: z.object({
    endpoint,
    keys: z.object({
      p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}={0,1}$/),
      auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
    }),
  }),
});

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "A userId and valid push subscription are required" }, { status: 400 });
  // Real accounts must prove ownership before attaching a device that will
  // receive their message previews. Demo IDs remain usable without Supabase.
  if (isUuid(input.data.userId)) {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const session = token && supabase ? await supabase.auth.getUser(token) : null;
    if (!session || session.error || session.data.user?.id !== input.data.userId) {
      return NextResponse.json({ error: "Sign in to turn on phone notifications" }, { status: 401 });
    }
  }
  await savePushSubscription(input.data.userId, input.data.subscription, request.headers.get("user-agent"));
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const input = z.object({ endpoint }).safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "A valid endpoint is required" }, { status: 400 });
  await deletePushSubscription(input.data.endpoint);
  return NextResponse.json({ ok: true });
}
