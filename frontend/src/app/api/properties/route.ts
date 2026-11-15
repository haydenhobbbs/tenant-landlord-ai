import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { createProperty, listProperties } from "@/lib/properties";
import { propertyInput } from "@/lib/property-input";
import { getCaller } from "@/lib/serverAuth";

export async function GET(req: Request) {
  await connection();
  const demoId = new URL(req.url).searchParams.get("landlordId") ?? undefined;
  const caller = await getCaller(req, { id: demoId, role: "landlord" });
  if (caller?.role !== "landlord") return NextResponse.json({ error: "Sign in as a landlord" }, { status: 401 });
  try { return NextResponse.json(await listProperties(caller.id)); }
  catch { return NextResponse.json({ error: "Could not load properties. Try again." }, { status: 500 }); }
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Send valid property details." }, { status: 400 }); }
  const demoId = body && typeof body === "object" && "landlordId" in body && typeof body.landlordId === "string" ? body.landlordId : undefined;
  const caller = await getCaller(req, { id: demoId, role: "landlord" });
  if (caller?.role !== "landlord") return NextResponse.json({ error: "Sign in as a landlord" }, { status: 401 });
  const parsed = propertyInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a street address, city, supported two-letter US state, and five-digit ZIP code.", fields: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  try { return NextResponse.json(await createProperty(caller.id, parsed.data), { status: 201 }); }
  catch { return NextResponse.json({ error: "Your property was not saved. Try again." }, { status: 500 }); }
}
