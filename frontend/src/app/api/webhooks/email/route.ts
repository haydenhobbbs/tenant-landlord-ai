import { NextResponse } from "next/server";
import { findThreadByAddress, onContractorReply } from "@/lib/outreach";

const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;

export async function POST(request: Request) {
  const payload = object(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Invalid email payload" }, { status: 400 });
  if (payload.type && payload.type !== "email.received") return NextResponse.json({ ok: true, ignored: true });
  const data = payload.type === "email.received" ? object(payload.data) : payload;
  const rawFrom = Array.isArray(data?.from) ? data.from[0] : data?.from;
  const fromValue = typeof rawFrom === "string" ? rawFrom : object(rawFrom)?.email;
  if (typeof fromValue !== "string" || typeof data?.text !== "string") {
    return NextResponse.json({ error: "from and text are required" }, { status: 400 });
  }
  const from = (fromValue.match(/<([^<>]+)>/)?.[1] ?? fromValue).trim().toLowerCase();
  const lines: string[] = [];
  for (const line of data.text.split(/\r?\n/)) {
    if (/^\s*On\s+.*wrote:\s*$/i.test(line)) break;
    if (!/^\s*>/.test(line)) lines.push(line);
  }
  const text = lines.join("\n").trim();
  const thread = await findThreadByAddress(from);
  if (!thread || !text) return NextResponse.json({ ok: true, ignored: true });
  await onContractorReply(thread.requestId, thread.contractor, text, "email");
  return NextResponse.json({ ok: true });
}
