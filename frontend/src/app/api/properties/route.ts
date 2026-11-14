import { connection, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createProperty, listProperties } from "@/lib/properties";
import { propertyInput } from "@/lib/property-input";

const createInput = propertyInput.extend({ landlordId: z.string().trim().min(1).max(100) });

export async function GET(req: NextRequest) {
  await connection();
  const landlordId = req.nextUrl.searchParams.get("landlordId")?.trim();
  if (!landlordId) return NextResponse.json({ error: "landlordId is required" }, { status: 400 });
  try { return NextResponse.json(await listProperties(landlordId)); }
  catch { return NextResponse.json({ error: "Could not load properties. Try again." }, { status: 500 }); }
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Send a valid property." }, { status: 400 }); }
  const parsed = createInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the property details.", fields: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  const { landlordId, ...input } = parsed.data;
  try { return NextResponse.json(await createProperty(landlordId, input), { status: 201 }); }
  catch { return NextResponse.json({ error: "Your property was not saved. Try again." }, { status: 500 }); }
}
