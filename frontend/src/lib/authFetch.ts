"use client";

import { getBrowserSupabase } from "./supabaseBrowser";

/** fetch() that also sends the signed-in user's Supabase token, for routes that use getCaller(). */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const supabase = getBrowserSupabase();
  const send = async () => {
    const headers = new Headers(init.headers);
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
    return { res: await fetch(input, { ...init, headers }), hadSession: !!data.session };
  };

  const first = await send();
  if (first.res.status !== 401 || !first.hadSession || !supabase) return first.res;

  // The server didn't accept our sign-in. Usually the token just needs renewing;
  // if the session was ended elsewhere, renewing fails, so send them to sign in
  // again instead of leaving the page stuck on "Could not load".
  const { error } = await supabase.auth.refreshSession();
  if (!error) {
    const retry = await send();
    if (retry.res.status !== 401) return retry.res;
  }
  await supabase.auth.signOut({ scope: "local" });
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    // A full reload on purpose: it clears every page's stale signed-in state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  return first.res;
}
