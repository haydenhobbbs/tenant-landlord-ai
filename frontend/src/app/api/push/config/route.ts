import { NextResponse } from "next/server";
import { pushPublicKey } from "@/lib/push";

export async function GET() {
  return NextResponse.json({ publicKey: pushPublicKey() }, {
    headers: { "Cache-Control": "no-store" },
  });
}
