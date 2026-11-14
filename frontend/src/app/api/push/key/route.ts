import { connection, NextResponse } from "next/server";
import { vapidPublicKey } from "@/lib/push/send";

// GET /api/push/key -> the VAPID public key the browser needs to subscribe.
// Served at runtime so the env var doesn't need a NEXT_PUBLIC_ name.
// The public key is safe to share; the private key never leaves the server.
export async function GET() {
  await connection();
  return NextResponse.json({ publicKey: vapidPublicKey() ?? null });
}
