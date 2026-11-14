"use client";

// 🔗 INVITE LINK: /join/MAPLE-4821
// A landlord shares this link (or just the code). The tenant signs in or signs
// up, says which unit they live in, and from then on their repair requests go
// to that landlord with the right address.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Home, MapPin } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorNote, Field, Input } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth";
import { authFetch } from "@/lib/authFetch";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import type { InvitePreview } from "@/lib/invites";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [unit, setUnit] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/invites/${encodeURIComponent(code)}`, { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as InvitePreview & { error?: string };
        if (!active) return;
        if (res.ok) setInvite(data);
        else setLookupError(data.error || "We couldn't find that code.");
      })
      .catch(() => active && setLookupError("Couldn't check that code. Check your connection and try again."));
    return () => { active = false; };
  }, [code]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!user || joining) return;
    setJoining(true);
    setJoinError("");
    try {
      const res = await authFetch("/api/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, unit: unit ?? user.unit ?? "", tenantId: user.id, tenantName: user.name }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Couldn't join. Try again.");
      // Pick up the unit we just saved on the account.
      await getBrowserSupabase()?.auth.refreshSession();
      router.replace("/tenant");
    } catch (error) {
      setJoinError((error as Error).message);
      setJoining(false);
    }
  }

  const next = encodeURIComponent(`/join/${code}`);

  return (
    <div data-role="tenant" className="mx-auto max-w-lg space-y-6 pt-4">
      {!invite && !lookupError && <p role="status" className="text-lg text-muted">Checking your invite…</p>}

      {lookupError && (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Hmm, that code didn&apos;t work</h1>
          <ErrorNote>{lookupError}</ErrorNote>
          <p className="text-lg text-muted">
            Codes look like <strong className="font-mono text-fg">MAPLE-4821</strong>. Ask your landlord to send it again.
          </p>
          <ButtonLink href={user?.role === "tenant" ? "/tenant" : "/"} variant="secondary" size="md">Go back</ButtonLink>
        </div>
      )}

      {invite && (
        <>
          <header className="space-y-3">
            <p className="text-base font-semibold text-accent-ink">You&apos;re invited by {invite.landlordName}</p>
            <h1 className="text-3xl font-bold sm:text-4xl">Join your home on Tenly</h1>
          </header>

          <div className="flex items-start gap-4 rounded-xl border border-line bg-surface p-5 shadow-card">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent text-on-accent">
              <Home className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-xl font-bold">{invite.address}</p>
              <p className="flex items-center gap-1.5 text-lg text-muted">
                <MapPin className="size-4" aria-hidden />
                {invite.city}, {invite.state}
              </p>
              <p className="mt-1 font-mono text-sm text-muted">Code {invite.code}</p>
            </div>
          </div>

          {loading && <p role="status" className="text-muted">One moment…</p>}

          {!loading && !user && (
            <div className="space-y-3">
              <p className="text-lg">Sign in or create a free account to join. It takes a minute.</p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={`/login?next=${next}`}>Continue</ButtonLink>
              </div>
              <p className="text-base text-muted">New to Tenly? Choose &ldquo;New here? Sign up&rdquo; on the next screen and pick &ldquo;I rent a home&rdquo;.</p>
            </div>
          )}

          {!loading && user?.role === "landlord" && (
            <div className="space-y-3">
              <ErrorNote>You&apos;re signed in as a landlord. This invite is for a tenant account.</ErrorNote>
              <Link href="/landlord/properties" className="font-semibold text-accent-ink underline">Go to your properties</Link>
            </div>
          )}

          {!loading && user?.role === "tenant" && (
            <form noValidate onSubmit={join} className="space-y-4">
              <Field label="Which unit do you live in?" hint={'For example "Apt 3B". Write "Whole house" if there isn\'t one.'}>
                <Input value={unit ?? user.unit ?? ""} onChange={(e) => setUnit(e.target.value)} placeholder="Apt 3B" required />
              </Field>
              <ErrorNote>{joinError}</ErrorNote>
              <Button type="submit" disabled={joining} className="w-full">
                {joining ? "Joining…" : `Join ${invite.address}`}
              </Button>
              <p className="text-base text-muted">Signed in as {user.name}. Your repair requests will go to {invite.landlordName}.</p>
            </form>
          )}
        </>
      )}
    </div>
  );
}
