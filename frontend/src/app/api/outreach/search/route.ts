import { connection, NextResponse } from "next/server";
import { isCategory, searchContractorsOnline } from "@/lib/outreach/search";

export async function GET(request: Request) {
  await connection();
  const query = new URL(request.url).searchParams;
  const trade = query.get("trade");
  const location = query.get("location")?.trim();
  if (!isCategory(trade) || !location) {
    return NextResponse.json({ error: "A valid trade and location are required" }, { status: 400 });
  }
  return NextResponse.json(await searchContractorsOnline(trade, location));
}
