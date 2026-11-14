import { connection, NextResponse, type NextRequest } from "next/server";
import { getProperty } from "@/lib/properties";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await connection();
  const landlordId = req.nextUrl.searchParams.get("landlordId")?.trim();
  if (!landlordId) return NextResponse.json({ error: "landlordId is required" }, { status: 400 });
  const { id } = await context.params;
  try {
    const property = await getProperty(landlordId, id);
    return property ? NextResponse.json(property) : NextResponse.json({ error: "Property not found." }, { status: 404 });
  } catch { return NextResponse.json({ error: "Could not load this property. Try again." }, { status: 500 }); }
}
