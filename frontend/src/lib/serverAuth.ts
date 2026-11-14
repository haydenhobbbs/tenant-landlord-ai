// Who is calling this API route? (server-side only)
//
// The browser sends its Supabase access token (see lib/authFetch.ts). We ask
// Supabase who it belongs to, so a page can't just claim to be another user.
// Without Supabase keys (local demo mode) there are no tokens, so we accept the
// id the page sends instead.

import { supabase } from "./store";

export interface Caller {
  id: string;
  name: string;
  role: "tenant" | "landlord";
}

export async function getCaller(req: Request, demoFallback?: Partial<Caller>): Promise<Caller | undefined> {
  if (!supabase) {
    return demoFallback?.id && demoFallback.role
      ? { id: demoFallback.id, name: demoFallback.name ?? "", role: demoFallback.role }
      : undefined;
  }
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return undefined;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return undefined;
  const meta = data.user.user_metadata ?? {};
  return {
    id: data.user.id,
    name: meta.name ?? data.user.email?.split("@")[0] ?? "",
    role: meta.role === "landlord" ? "landlord" : "tenant",
  };
}
