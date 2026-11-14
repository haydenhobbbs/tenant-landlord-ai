import { connection, NextResponse } from "next/server";
import { isTrade, searchContractorsOnline } from "@/lib/outreach";

export async function GET(request: Request) {
  await connection();
  const query = new URL(request.url).searchParams;
  const trade = query.get("trade");
  if (!isTrade(trade)) {
    return NextResponse.json({ error: "A valid trade is required" }, { status: 400 });
  }
  const location = {
    address: query.get("address")?.trim() ?? "", city: query.get("city")?.trim() ?? "",
    state: query.get("state")?.trim() ?? "", zip: query.get("zip")?.trim() ?? "",
  };
  return NextResponse.json(await searchContractorsOnline(trade, location));
}
