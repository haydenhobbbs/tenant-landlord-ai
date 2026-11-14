import { NextResponse, connection } from "next/server";
import { createProperty, listLandlordProperties } from "@/lib/invites";
import { getCaller } from "@/lib/serverAuth";

// GET /api/properties -> the signed-in landlord's properties, invite codes and tenants
export async function GET(req: Request) {
  await connection();
  const demoId = new URL(req.url).searchParams.get("landlordId") ?? undefined;
  const caller = await getCaller(req, { id: demoId, role: "landlord" });
  if (caller?.role !== "landlord") return NextResponse.json({ error: "Sign in as a landlord" }, { status: 401 });
  return NextResponse.json(await listLandlordProperties(caller.id));
}

// POST /api/properties { address, city, state, zip } -> new property with its invite code
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const caller = await getCaller(req, { id: typeof body.landlordId === "string" ? body.landlordId : undefined, role: "landlord" });
  if (caller?.role !== "landlord") return NextResponse.json({ error: "Sign in as a landlord" }, { status: 401 });

  const field = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const input = { address: field("address"), city: field("city"), state: field("state"), zip: field("zip") };
  if (!input.address || !input.city || !/^[A-Za-z]{2}$/.test(input.state) || !input.zip) {
    return NextResponse.json({ error: "Enter the street address, city, 2-letter state and ZIP." }, { status: 400 });
  }
  return NextResponse.json(await createProperty(caller.id, input), { status: 201 });
}
