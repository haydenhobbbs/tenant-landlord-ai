import { connection, NextResponse, type NextRequest } from "next/server";
import { getProperty } from "@/lib/properties";
import { getCaller } from "@/lib/serverAuth";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  await connection();
  const demoId = req.nextUrl.searchParams.get("landlordId") ?? undefined;
  const caller = await getCaller(req, { id: demoId, role: "landlord" });
  if (caller?.role !== "landlord") return NextResponse.json({ error: "Sign in as a landlord" }, { status: 401 });
  const { id } = await context.params;
  try {
    const property = await getProperty(caller.id, id);
    return property ? NextResponse.json(property) : NextResponse.json({ error: "Property not found." }, { status: 404 });
  } catch { return NextResponse.json({ error: "Could not load this property. Try again." }, { status: 500 }); }
}
