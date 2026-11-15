import { NextResponse, connection } from "next/server";
import { isTrade } from "@/lib/outreach";
import { getCaller, unauthorized } from "@/lib/serverAuth";
import { isUuid, supabase } from "@/lib/store";

// The signed-in landlord's trusted (pre-approved) contractors. The AI emails
// these first when a matching repair comes in (lib/outreach getPreapprovedContractors).
//   GET    /api/contractors              -> your list
//   POST   /api/contractors { id?, name, trade, phone, email, notes } -> add or edit
//   DELETE /api/contractors?id=...       -> remove
// Runs on the server with the service key, scoped to the caller's own rows.

const COLUMNS = "id,name,trade,phone,email,notes";

type Row = { id: string; name: string; trade: string; phone: string | null; email: string | null; notes: string | null };
const toItem = (r: Row) => ({ id: r.id, name: r.name, trade: r.trade, phone: r.phone ?? "", email: r.email ?? "", notes: r.notes ?? "" });

async function landlord(req: Request) {
  const caller = await getCaller(req, { id: "demo-landlord", role: "landlord" });
  return caller?.role === "landlord" && isUuid(caller.id) ? caller : undefined;
}

export async function GET(req: Request) {
  await connection();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const caller = await landlord(req);
  if (!caller) return unauthorized("Sign in as a landlord.");
  const { data, error } = await supabase.from("contractors").select(COLUMNS).eq("landlord_id", caller.id).order("name");
  if (error) {
    console.error("[contractors] load failed", error);
    return NextResponse.json({ error: "Could not load trusted contractors." }, { status: 500 });
  }
  return NextResponse.json((data as Row[]).map(toItem));
}

export async function POST(req: Request) {
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const caller = await landlord(req);
  if (!caller) return unauthorized("Sign in as a landlord.");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (k: string, max: number) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "");
  const item = {
    name: str("name", 120),
    trade: str("trade", 20),
    phone: str("phone", 40),
    email: str("email", 200),
    notes: str("notes", 1000),
  };
  if (!item.name) return NextResponse.json({ error: "Enter the contractor's name." }, { status: 400 });
  if (!isTrade(item.trade)) return NextResponse.json({ error: "Pick a trade." }, { status: 400 });
  if (!item.phone && !item.email) return NextResponse.json({ error: "Enter a phone number or an email." }, { status: 400 });
  if (item.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
    return NextResponse.json({ error: "Enter a valid email address or leave it blank." }, { status: 400 });
  }

  const row = { ...item, phone: item.phone || null, email: item.email || null, notes: item.notes || null, landlord_id: caller.id };
  const id = typeof body.id === "string" && isUuid(body.id) ? body.id : undefined;
  // Editing only ever touches the caller's own row (landlord_id in the filter).
  const { data, error } = id
    ? await supabase.from("contractors").update(row).eq("id", id).eq("landlord_id", caller.id).select(COLUMNS).maybeSingle()
    : await supabase.from("contractors").insert(row).select(COLUMNS).single();
  if (error) {
    console.error("[contractors] save failed", error);
    return NextResponse.json({ error: "Could not save this contractor. Please try again." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Contractor not found." }, { status: 404 });
  return NextResponse.json(toItem(data as Row), { status: id ? 200 : 201 });
}

export async function DELETE(req: Request) {
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const caller = await landlord(req);
  if (!caller) return unauthorized("Sign in as a landlord.");
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !isUuid(id)) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { error } = await supabase.from("contractors").delete().eq("id", id).eq("landlord_id", caller.id);
  if (error) {
    console.error("[contractors] delete failed", error);
    return NextResponse.json({ error: "Could not remove this contractor. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
