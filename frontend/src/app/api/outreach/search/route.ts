import { connection, NextResponse } from "next/server";
import { isTrade, searchContractorsOnline } from "@/lib/outreach";
import { demoFrom, getCaller, unauthorized } from "@/lib/serverAuth";

export async function GET(request: Request) {
  await connection();
  // Each search is billed by Google, so only signed-in users may run one.
  if (!(await getCaller(request, { ...demoFrom(request), id: demoFrom(request).id ?? "demo" }))) return unauthorized();
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
