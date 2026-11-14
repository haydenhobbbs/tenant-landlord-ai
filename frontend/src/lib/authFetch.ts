"use client";

import { getBrowserSupabase } from "./supabaseBrowser";

/** fetch() that also sends the signed-in user's Supabase token, for routes that use getCaller(). */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const { data } = (await getBrowserSupabase()?.auth.getSession()) ?? { data: { session: null } };
  if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(input, { ...init, headers });
}
