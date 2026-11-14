"use client";

// 🏠 PROPERTIES & INVITES: how a landlord gets their tenants into Tenly.
// Each property has a code (e.g. MAPLE-4821) and a link (/join/MAPLE-4821).
// Tenants who join show up here, and their repair requests come to this landlord.

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Plus, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, Input } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth";
import { authFetch } from "@/lib/authFetch";
import type { InviteProperty } from "@/lib/invites";

const EMPTY = { address: "", city: "", state: "", zip: "" };

export default function PropertiesPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<InviteProperty[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const landlordId = user?.role === "landlord" ? user.id : null;

  const load = useCallback(async () => {
    if (!landlordId) return;
    try {
      const res = await authFetch(`/api/properties?landlordId=${encodeURIComponent(landlordId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as InviteProperty[];
      setProperties(data);
      setShowForm((open) => open || data.length === 0);
    } catch {
      setLoadError("Couldn't load your properties. Refresh to try again.");
    }
  }, [landlordId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function addProperty(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !landlordId) return;
    setSaving(true);
    setFormError("");
    try {
      const res = await authFetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, landlordId }),
      });
      const data = (await res.json().catch(() => ({}))) as InviteProperty & { error?: string };
      if (!res.ok) throw new Error(data.error || "Couldn't save the property. Try again.");
      setProperties((list) => [...(list ?? []), data]);
      setForm(EMPTY);
      setShowForm(false);
    } catch (error) {
      setFormError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-3xl font-bold">Properties &amp; invites</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted">
          Give your tenants the code or link for their home. Once they join, their repair requests come straight to you.
        </p>
      </header>

      {loadError && <ErrorNote>{loadError}</ErrorNote>}
      {!properties && !loadError && <p role="status" className="text-muted">Loading your properties…</p>}

      {properties?.map((p) => <PropertyCard key={p.id} property={p} />)}

      {properties && !showForm && (
        <Button variant="secondary" size="md" icon={<Plus aria-hidden />} onClick={() => setShowForm(true)}>
          Add another property
        </Button>
      )}

      {properties && showForm && (
        <section aria-labelledby="add-property" className="rounded-xl border border-landlord-edge/40 bg-landlord-soft p-5 sm:p-6">
          <h2 id="add-property" className="text-xl font-bold">
            {properties.length === 0 ? "Add your first property" : "Add a property"}
          </h2>
          <p className="mt-1 text-muted">We&apos;ll make an invite code for it right away.</p>
          <form noValidate onSubmit={addProperty} className="mt-5 grid gap-4 sm:grid-cols-6">
            <Field label="Street address" className="sm:col-span-6">
              <Input value={form.address} onChange={set("address")} placeholder="418 Maple Street" autoComplete="street-address" required />
            </Field>
            <Field label="City" className="sm:col-span-3">
              <Input value={form.city} onChange={set("city")} placeholder="Austin" autoComplete="address-level2" required />
            </Field>
            <Field label="State" hint="2 letters" className="sm:col-span-1">
              <Input value={form.state} onChange={set("state")} placeholder="TX" maxLength={2} autoComplete="address-level1" className="uppercase" required />
            </Field>
            <Field label="ZIP" className="sm:col-span-2">
              <Input value={form.zip} onChange={set("zip")} placeholder="78704" inputMode="numeric" autoComplete="postal-code" required />
            </Field>
            <div className="space-y-3 sm:col-span-6">
              <ErrorNote>{formError}</ErrorNote>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" size="md" disabled={saving}>{saving ? "Saving…" : "Save and get invite code"}</Button>
                {properties.length > 0 && (
                  <Button variant="quiet" size="md" onClick={() => { setShowForm(false); setFormError(""); }}>Cancel</Button>
                )}
              </div>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function PropertyCard({ property: p }: { property: InviteProperty }) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const link = typeof window === "undefined" ? `/join/${p.inviteCode}` : `${window.location.origin}/join/${p.inviteCode}`;
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  async function copy(what: "link" | "code") {
    try {
      await navigator.clipboard.writeText(what === "link" ? link : p.inviteCode);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard blocked: the code and link are on screen to copy by hand.
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: "Join your home on Tenly",
        text: `Report repairs for ${p.address} on Tenly. Use code ${p.inviteCode} or open this link:`,
        url: link,
      });
    } catch {
      // Closed the share sheet: nothing to do.
    }
  }

  return (
    <article className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{p.address}</h2>
          <p className="text-lg text-muted">{p.city}, {p.state} {p.zip}</p>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full bg-sunken px-3 py-1 text-base font-semibold">
          <Users className="size-4" aria-hidden />
          {p.tenants.length === 1 ? "1 tenant" : `${p.tenants.length} tenants`}
        </p>
      </div>

      <div className="mt-5 grid gap-4 rounded-lg bg-landlord-soft p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-6">
        <div>
          <p className="text-sm font-semibold text-muted">Invite code</p>
          <p className="tabular font-mono text-3xl font-bold tracking-wider sm:text-4xl">{p.inviteCode}</p>
        </div>
        <div className="min-w-0 space-y-3">
          <p className="truncate text-base text-muted" title={link}>{link}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="md" icon={copied === "link" ? <Check aria-hidden /> : <Copy aria-hidden />} onClick={() => void copy("link")}>
              {copied === "link" ? "Link copied" : "Copy invite link"}
            </Button>
            <Button variant="secondary" size="md" onClick={() => void copy("code")}>
              {copied === "code" ? "Code copied" : "Copy code"}
            </Button>
            {canShare && (
              <Button variant="secondary" size="md" icon={<Share2 aria-hidden />} onClick={() => void share()}>
                Share
              </Button>
            )}
          </div>
        </div>
      </div>

      <h3 className="mt-5 text-lg font-bold">Tenants</h3>
      {p.tenants.length === 0 ? (
        <p className="mt-1 text-muted">No one has joined yet. Send them the link or code above.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {p.tenants.map((t) => (
            <li key={t.id} className="flex justify-between gap-3 py-2 text-lg">
              <span className="font-semibold">{t.name}</span>
              <span className="text-muted">{t.unit || "Unit not set"}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
