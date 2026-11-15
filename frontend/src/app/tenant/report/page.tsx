"use client";

// 👤 TENANT: report a problem (message + photos).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import { SendingSteps } from "@/components/SendingSteps";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, Input, Textarea } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth";
import { shrinkImage } from "@/lib/shrinkImage";
import type { Lease, NewRequestInput, Urgency } from "@/lib/types";

const URGENCY: { value: Urgency; label: string; hint: string }[] = [
  { value: "low", label: "It can wait", hint: "A week or two is fine" },
  { value: "medium", label: "In the next few days", hint: "Annoying, but livable" },
  { value: "high", label: "Today if possible", hint: "It's getting worse" },
  { value: "emergency", label: "Emergency", hint: "Flooding, gas smell, no heat in winter, sparks" },
];

const MAX_PHOTOS = 4;

export default function ReportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lease, setLease] = useState<Lease | null>(null);

  // The tenant's address (from their lease) goes with the request, so the AI
  // can search nearby and give the landlord local legal guidance.
  useEffect(() => {
    if (!user) return;
    const qs = new URLSearchParams({ tenantId: user.id, name: user.name, unit: user.unit ?? "" });
    fetch(`/api/lease?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setLease)
      .catch(() => {});
  }, [user]);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const room = MAX_PHOTOS - photos.length;
      const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, room);
      const shrunk = await Promise.all(picked.map((f) => shrinkImage(f)));
      setPhotos((p) => [...p, ...shrunk].slice(0, MAX_PHOTOS));
      if (files.length > room) setError(`You can add up to ${MAX_PHOTOS} photos.`);
    } catch {
      setError("We couldn't read that photo. Try a different one (JPG or PNG work best).");
    } finally {
      setPhotoBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    const body: NewRequestInput = {
      tenantId: user.id,
      tenantName: user.name,
      unit: user.unit || "Unit not set",
      title: title.trim(),
      description: description.trim(),
      property: lease
        ? { address: lease.propertyAddress, city: lease.city, state: lease.state, zip: lease.zip }
        : undefined,
      urgency,
      photos,
    };
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      // Next.js keeps this page's state when you leave it, so clear the form now.
      // Otherwise the next "Report a problem" would show this request again.
      setTitle("");
      setDescription("");
      setUrgency("medium");
      setPhotos([]);
      setSubmitting(false);
      router.push(`/tenant/requests/${data.id}?new=1`);
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof Error && err.message !== "Failed to fetch"
          ? err.message
          : "We couldn't send your request. Check your internet connection and try again.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Report a problem"
        intro="Tell us what's wrong in your own words. We'll find someone to fix it and keep you posted."
        back={{ href: "/tenant", label: "Back to home" }}
      />

      <form onSubmit={submit} className="stagger space-y-10">
        <div className="space-y-6">
          <Field label="In a few words, what's wrong?" hint="For example: Kitchen sink is leaking">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required />
          </Field>
          <Field
            label="Tell us more"
            hint="Where is it? When did it start? Is it getting worse? Anything you've already tried?"
          >
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} required />
          </Field>
        </div>

        <section aria-labelledby="photos-label" className="space-y-3">
          <div>
            <h2 id="photos-label" className="text-lg font-bold">
              Photos <span className="font-normal text-muted">(optional)</span>
            </h2>
            <p className="text-base text-muted">A photo helps the repair person bring the right parts.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {photos.map((src, i) => (
              <div key={src.slice(-24)} className="relative animate-pop">
                {/* eslint-disable-next-line @next/next/no-img-element -- data: URL preview */}
                <img src={src} alt={`Photo ${i + 1}`} className="size-28 rounded-xl border border-line object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  className="absolute -top-2 -right-2 grid size-9 place-items-center rounded-full border border-line bg-surface text-fg shadow-card hover:bg-sunken"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={photoBusy}
                className="pressable flex size-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line-strong text-base font-semibold text-accent-ink hover:border-accent hover:bg-accent-soft disabled:opacity-60 [&:hover_svg]:-rotate-6"
              >
                <Camera className="size-7 transition-transform duration-300" aria-hidden />
                {photoBusy ? "Adding…" : "Add photo"}
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => addPhotos(e.target.files)}
          />
        </section>

        <fieldset>
          <legend className="mb-3 text-lg font-bold">How soon does it need fixing?</legend>
          <div className="space-y-2">
            {URGENCY.map(({ value, label, hint }) => {
              const on = urgency === value;
              const emergency = value === "emergency";
              return (
                <label
                  key={value}
                  className={`pressable flex cursor-pointer items-center gap-4 rounded-xl border-2 px-5 py-4 ${
                    on
                      ? emergency
                        ? "border-danger bg-danger-soft"
                        : "border-accent bg-accent-soft"
                      : "border-line bg-surface hover:border-line-strong"
                  }`}
                >
                  <input
                    type="radio"
                    name="urgency"
                    value={value}
                    checked={on}
                    onChange={() => setUrgency(value)}
                    className={`size-5 shrink-0 ${emergency ? "accent-danger" : "accent-accent"}`}
                  />
                  <span>
                    <span className="block text-lg font-semibold">{label}</span>
                    <span className="block text-base text-muted">{hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {urgency === "emergency" && (
            <p className="mt-3 animate-rise rounded-xl bg-danger-soft px-4 py-3 text-base font-semibold text-danger-ink">
              If anyone is in danger, or you smell gas, leave and call 911 first.
            </p>
          )}
        </fieldset>

        <ErrorNote>{error}</ErrorNote>

        {submitting ? (
          <SendingSteps />
        ) : (
          <Button type="submit" disabled={photoBusy} className="w-full">
            Send request
          </Button>
        )}
      </form>
    </div>
  );
}
