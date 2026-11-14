import { NextResponse, connection } from "next/server";
import { joinProperty, tenantLink } from "@/lib/invites";
import { getCaller } from "@/lib/serverAuth";

// GET /api/link -> the signed-in tenant's property + landlord, or { linked: false }
export async function GET(req: Request) {
  await connection();
  const demoId = new URL(req.url).searchParams.get("tenantId") ?? undefined;
  const caller = await getCaller(req, { id: demoId, role: "tenant" });
  if (caller?.role !== "tenant") return NextResponse.json({ error: "Sign in as a tenant" }, { status: 401 });
  const link = await tenantLink(caller.id);
  return NextResponse.json(link ? { linked: true, ...link } : { linked: false });
}

// POST /api/link { code, unit } -> join that property
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const caller = await getCaller(req, { id: str("tenantId") || undefined, name: str("tenantName"), role: "tenant" });
  if (!caller) return NextResponse.json({ error: "Sign in to join your home." }, { status: 401 });
  if (caller.role !== "tenant") return NextResponse.json({ error: "Only tenant accounts can join a property." }, { status: 403 });
  if (!str("code")) return NextResponse.json({ error: "Enter the code from your landlord." }, { status: 400 });
  if (!str("unit")) return NextResponse.json({ error: "Enter your unit, like Apt 3B. Write \"Whole house\" if there isn't one." }, { status: 400 });

  const link = await joinProperty({ id: caller.id, name: caller.name }, str("code"), str("unit"));
  if (!link) return NextResponse.json({ error: "We couldn't find that code. Check it with your landlord." }, { status: 404 });
  return NextResponse.json({ linked: true, ...link });
}
