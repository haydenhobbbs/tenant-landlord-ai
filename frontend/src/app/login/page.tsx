"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, Input } from "@/components/ui/Field";
import { homeFor, useAuth, type Role } from "@/lib/auth";

const ROLES: { value: Role; label: string; blurb: string; icon: typeof KeyRound }[] = [
  { value: "tenant", label: "I rent a home", blurb: "Report repairs and message your landlord", icon: KeyRound },
  { value: "landlord", label: "I own or manage a property", blurb: "Approve repairs in one tap", icon: Building2 },
];

// After signing in, go back to where the person came from (e.g. an invite link
// at /join/MAPLE-4821) if the URL says so. Only same-site paths are allowed.
function destination(role: Role): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(role);
}

export default function LoginPage() {
  const { user, loading, mode, signIn, signUp, signInDemo } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role>("tenant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  // Already signed in → straight to your home screen.
  useEffect(() => {
    if (!loading && user) router.replace(destination(user.role));
  }, [user, loading, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result =
      tab === "signin" ? await signIn(email, password) : await signUp({ email, password, name, role, unit });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    if (result.needsEmailConfirm) return setCheckEmail(true);
    if (result.user) router.replace(destination(result.user.role));
  }

  async function demo(r: Role) {
    setError(null);
    const result = await signInDemo(r);
    if (!result.ok) return setError(result.error);
    if (result.user) router.replace(destination(result.user.role));
  }

  if (checkEmail) {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-8 text-center">
        <MailCheck className="mx-auto size-12 text-accent-ink" aria-hidden />
        <h1 className="text-3xl font-bold">Check your email</h1>
        <p className="text-lg text-muted">
          We sent a link to <strong className="text-fg">{email}</strong>. Click it to finish setting up your account, then
          come back here to sign in.
        </p>
        <Button variant="secondary" onClick={() => { setCheckEmail(false); setTab("signin"); }}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="stagger mx-auto max-w-lg" data-role={tab === "signup" ? role : undefined}>
      <h1 className="text-3xl font-bold sm:text-4xl">{tab === "signin" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-2 text-lg text-muted">
        {tab === "signin" ? "Sign in to see your repairs." : "It takes about a minute."}
      </p>

      <div role="tablist" aria-label="Sign in or create account" className="relative mt-8 grid grid-cols-2 gap-1 rounded-xl bg-sunken p-1">
        {/* sliding highlight behind the active tab */}
        <span
          aria-hidden
          className={`absolute inset-y-1 left-1 w-[calc(50%-0.375rem)] rounded-xl bg-surface shadow-card transition-transform duration-400 ease-(--ease-out) ${
            tab === "signup" ? "translate-x-[calc(100%+0.25rem)]" : ""
          }`}
        />
        {(["signin", "signup"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => { setTab(t); setError(null); }}
            className={`relative min-h-12 cursor-pointer rounded-xl text-base font-semibold transition-colors duration-300 ${
              tab === t ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {t === "signin" ? "Sign in" : "New here? Sign up"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-5">
        {tab === "signup" && (
          <fieldset className="animate-rise space-y-3">
            <legend className="mb-2 text-base font-semibold">Which describes you?</legend>
            {ROLES.map(({ value, label, blurb, icon: Icon }) => (
              <label
                key={value}
                data-role={value}
                className={`pressable flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-edge ${
                  role === value ? "border-accent-edge bg-accent-soft" : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                  className="sr-only"
                />
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-xl transition-[background-color,color,transform] duration-300 ease-(--ease-out) ${
                    role === value ? "scale-105 bg-accent text-on-accent" : "bg-sunken text-muted"
                  }`}
                >
                  <Icon className="size-6" aria-hidden />
                </span>
                <span>
                  <span className="block text-lg font-semibold">{label}</span>
                  <span className="block text-base text-muted">{blurb}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {tab === "signup" && (
          <div className={`animate-rise [animation-delay:80ms] ${role === "tenant" ? "grid gap-5 sm:grid-cols-[1.4fr_1fr]" : ""}`}>
            <Field label="Your name">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </Field>
            {role === "tenant" && (
              <Field label="Unit" hint="For example, Apt 3B">
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} required />
              </Field>
            )}
          </div>
        )}

        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        <Field label="Password" hint={tab === "signup" ? "At least 6 characters." : undefined}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={tab === "signin" ? "current-password" : "new-password"}
            minLength={6}
            required
          />
        </Field>

        <ErrorNote>{error}</ErrorNote>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "One moment…" : tab === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="text-lg font-semibold">Just looking around?</h2>
        <p className="mt-1 text-base text-muted">Try Tenly with a sample account. Nothing is sent to anyone.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            data-role="tenant"
            onClick={() => demo("tenant")}
            className="pressable min-h-12 cursor-pointer rounded-xl border border-line-strong bg-surface px-4 text-base font-semibold text-accent-ink hover:border-accent-edge hover:bg-accent-soft"
          >
            Try as a tenant
          </button>
          <button
            type="button"
            data-role="landlord"
            onClick={() => demo("landlord")}
            className="pressable min-h-12 cursor-pointer rounded-xl border border-line-strong bg-surface px-4 text-base font-semibold text-accent-ink hover:border-accent-edge hover:bg-accent-soft"
          >
            Try as a landlord
          </button>
        </div>
        {mode === "demo" && (
          <p className="mt-4 text-sm text-muted">
            Running without Supabase keys: accounts are saved in this browser only.
          </p>
        )}
      </section>
    </div>
  );
}
