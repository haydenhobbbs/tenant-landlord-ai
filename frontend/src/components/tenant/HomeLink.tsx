"use client";

// On the tenant home screen: which home + landlord you're connected to, or a
// box to type the invite code your landlord gave you.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Home, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth";
import { authFetch } from "@/lib/authFetch";
import type { TenantLink } from "@/lib/invites";

type LinkState = ({ linked: true } & TenantLink) | { linked: false };

export function HomeLink() {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<LinkState | null>(null);
  const [code, setCode] = useState("");
  const tenantId = user?.role === "tenant" ? user.id : null;

  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    authFetch(`/api/link?tenantId=${encodeURIComponent(tenantId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<LinkState>) : null))
      .then((data) => active && data && setState(data))
      .catch(() => {});
    return () => { active = false; };
  }, [tenantId]);

  if (!state) return null;

  if (state.linked) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-base text-muted">
        <Home className="size-4 text-accent-ink" aria-hidden />
        <span>
          <strong className="text-fg">{state.address}</strong>
          {state.unit ? `, ${state.unit}` : ""} · Landlord: <strong className="text-fg">{state.landlordName}</strong>
        </span>
      </p>
    );
  }

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (clean) router.push(`/join/${encodeURIComponent(clean)}`);
  };

  return (
    <section aria-labelledby="connect" className="rounded-xl border-2 border-accent-edge/50 bg-accent-soft p-5 sm:p-6">
      <h2 id="connect" className="flex items-center gap-2 text-xl font-bold">
        <Link2 className="size-5" aria-hidden />
        Connect to your landlord
      </h2>
      <p className="mt-1 text-lg text-muted">
        Enter the code your landlord gave you so your repair requests reach them.
      </p>
      <form onSubmit={go} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Invite code" className="flex-1">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MAPLE-4821" autoCapitalize="characters" className="font-mono uppercase" />
        </Field>
        <Button type="submit" size="md" icon={<ArrowRight aria-hidden />} className="flex-row-reverse" disabled={!code.trim()}>
          Continue
        </Button>
      </form>
    </section>
  );
}
