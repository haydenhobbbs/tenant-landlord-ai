import { NextResponse, connection } from "next/server";
import { previewInvite } from "@/lib/invites";

// GET /api/invites/MAPLE-4821 -> which property this code is for (shown before joining)
export async function GET(_req: Request, ctx: RouteContext<"/api/invites/[code]">) {
  await connection();
  const { code } = await ctx.params;
  const preview = await previewInvite(decodeURIComponent(code));
  if (!preview) return NextResponse.json({ error: "We couldn't find that code. Check it with your landlord." }, { status: 404 });
  return NextResponse.json(preview);
}
