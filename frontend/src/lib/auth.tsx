"use client";

// 🔐 LOGIN (two roles: tenant and landlord)
//
// With Supabase keys set (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY)
// this uses real Supabase Auth: email + password, and the role is saved in the
// user's metadata at sign-up. Without keys it runs in DEMO mode: accounts live in
// this browser only, so anyone can run the app locally.
//
// Use it anywhere in a client component:
//   const { user, signOut } = useAuth();
//   user?.role === "landlord"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { authMode, getBrowserSupabase } from "./supabaseBrowser";

export type Role = "tenant" | "landlord";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  unit?: string; // tenants only, e.g. "Apt 3B"
}

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  role: Role;
  unit?: string;
}

type Result = { ok: true; user: AppUser | null; needsEmailConfirm?: boolean } | { ok: false; error: string };

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  mode: "supabase" | "demo";
  signIn(email: string, password: string): Promise<Result>;
  signUp(input: SignUpInput): Promise<Result>;
  signInDemo(role: Role): Promise<Result>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function homeFor(role: Role) {
  return role === "landlord" ? "/landlord" : "/tenant";
}

// ---------- Demo mode (no keys) ----------

const DEMO_SESSION = "fixflow-demo-session";
const DEMO_ACCOUNTS = "fixflow-demo-accounts";

// Built-in demo people. demo-jordan owns the sample request in store.ts.
const DEMO_PEOPLE: Record<Role, AppUser> = {
  tenant: { id: "demo-jordan", email: "jordan@demo.fixflow", name: "Jordan Lee", role: "tenant", unit: "Apt 3B" },
  landlord: { id: "demo-landlord", email: "pat@demo.fixflow", name: "Pat Morgan", role: "landlord" },
};

type DemoAccount = AppUser & { password: string };

// Shared password for the public demo accounts. Not secret on purpose: anyone
// can press "Try as a tenant". Never reuse it for a real account.
const DEMO_PASSWORD = "fixflow-demo-2026";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ---------- Supabase helpers ----------

function fromSupabase(u: SupabaseUser): AppUser {
  const m = u.user_metadata ?? {};
  return {
    id: u.id,
    email: u.email ?? "",
    name: m.name ?? u.email?.split("@")[0] ?? "Friend",
    role: m.role === "landlord" ? "landlord" : "tenant",
    unit: m.unit ?? undefined,
  };
}

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Check them and try again.";
  if (m.includes("already registered")) return "There's already an account with that email. Try signing in instead.";
  if (m.includes("password")) return "Your password needs at least 6 characters.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox for our link.";
  return message;
}

// ---------- Provider ----------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage once on mount
      setUser(readJSON<AppUser | null>(DEMO_SESSION, null));
      setLoading(false);
      return;
    }
    // The "Try the demo" buttons still work with keys set, so fall back to a demo session.
    const demo = () => readJSON<AppUser | null>(DEMO_SESSION, null);
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session ? fromSupabase(data.session.user) : demo());
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? fromSupabase(session.user) : demo());
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<Result> => {
    const supabase = getBrowserSupabase();
    email = email.trim().toLowerCase();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: friendlyError(error.message) };
      const u = fromSupabase(data.user);
      setUser(u);
      return { ok: true, user: u };
    }
    const account = readJSON<DemoAccount[]>(DEMO_ACCOUNTS, []).find((a) => a.email === email);
    if (!account || account.password !== password) {
      return { ok: false, error: "That email and password don't match. Check them and try again." };
    }
    const { password: _pw, ...u } = account;
    void _pw;
    writeJSON(DEMO_SESSION, u);
    setUser(u);
    return { ok: true, user: u };
  }, []);

  const signUp = useCallback(async (input: SignUpInput): Promise<Result> => {
    const supabase = getBrowserSupabase();
    const email = input.email.trim().toLowerCase();
    const meta = { name: input.name.trim(), role: input.role, unit: input.role === "tenant" ? input.unit?.trim() : undefined };
    if (input.password.length < 6) return { ok: false, error: "Your password needs at least 6 characters." };

    if (supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password: input.password, options: { data: meta } });
      if (error) return { ok: false, error: friendlyError(error.message) };
      if (!data.session) return { ok: true, user: null, needsEmailConfirm: true };
      const u = fromSupabase(data.session.user);
      setUser(u);
      return { ok: true, user: u };
    }

    const accounts = readJSON<DemoAccount[]>(DEMO_ACCOUNTS, []);
    if (accounts.some((a) => a.email === email)) {
      return { ok: false, error: "There's already an account with that email. Try signing in instead." };
    }
    const u: AppUser = { id: `demo-${crypto.randomUUID().slice(0, 8)}`, email, ...meta };
    writeJSON(DEMO_ACCOUNTS, [...accounts, { ...u, password: input.password }]);
    writeJSON(DEMO_SESSION, u);
    setUser(u);
    return { ok: true, user: u };
  }, []);

  const signInDemo = useCallback(async (role: Role): Promise<Result> => {
    const supabase = getBrowserSupabase();
    if (supabase) {
      // With Supabase on, the demo people are real accounts (created on first
      // use), so their requests, chat and notifications save like anyone's.
      const p = DEMO_PEOPLE[role];
      const email = `demo-${role}@example.com`;
      let { data, error } = await supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
      if (error && /invalid login/i.test(error.message)) {
        const meta = { name: p.name, role, unit: p.unit };
        const signUp = await supabase.auth.signUp({ email, password: DEMO_PASSWORD, options: { data: meta } });
        if (signUp.error) return { ok: false, error: friendlyError(signUp.error.message) };
        if (!signUp.data.session) {
          return {
            ok: false,
            error: "The demo account needs email confirmation turned off in Supabase (Authentication → Email).",
          };
        }
        ({ data, error } = { data: { user: signUp.data.session.user, session: signUp.data.session }, error: null });
      }
      if (error || !data.user) return { ok: false, error: friendlyError(error?.message ?? "Couldn't start the demo.") };
      const u = fromSupabase(data.user);
      setUser(u);
      return { ok: true, user: u };
    }
    const u = DEMO_PEOPLE[role];
    writeJSON(DEMO_SESSION, u);
    setUser(u);
    return { ok: true, user: u };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getBrowserSupabase();
    // "local" = sign out this device only. The default ("global") ends the
    // account's sessions on EVERY device, and the team shares the demo accounts.
    if (supabase) await supabase.auth.signOut({ scope: "local" });
    writeJSON(DEMO_SESSION, null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, mode: authMode, signIn, signUp, signInDemo, signOut }),
    [user, loading, signIn, signUp, signInDemo, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const noopSubscribe = () => () => {};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  // While a component is hydrating it must match the server HTML (signed out).
  // Parts inside <Suspense> can hydrate after login is already known, so report
  // "still loading" until this component has hydrated.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return hydrated ? ctx : { ...ctx, user: null, loading: true };
}
