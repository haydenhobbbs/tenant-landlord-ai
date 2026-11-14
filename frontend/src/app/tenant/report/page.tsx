"use client";

// 👤 TENANT: report a problem, one question per screen.
//   1. What's wrong   2. Photo (optional)   3. How soon   4. Check and send
// Built for 45–60 year-old tenants: big type and buttons, tap-to-fill
// examples instead of typing, plain words, and a draft that survives leaving
// the page.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, Check, ImagePlus, Pencil, Send, X } from "lucide-react";
import { SendingSteps } from "@/components/SendingSteps";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, Input, Textarea } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth";
import { shrinkImage } from "@/lib/shrinkImage";
import type { Lease, NewRequestInput, Urgency } from "@/lib/types";

const STEPS = ["What's wrong", "Photo", "How soon", "Check and send"] as const;

const COMMON = [
  "Leaking pipe or faucet",
  "Toilet won't stop running",
  "No hot water",
  "Heat isn't working",
  "AC isn't working",
  "Power outlet not working",
  "Appliance broken",
  "Bugs or mice",
];

const URGENCY: { value: Urgency; label: string; hint: string }[] = [
  { value: "low", label: "It can wait", hint: "A week or two is fine" },
  { value: "medium", label: "In the next few days", hint: "Annoying, but I can live with it" },
  { value: "high", label: "Today if possible", hint: "It's getting worse" },
  { value: "emergency", label: "Emergency", hint: "Flooding, gas smell, sparks, or no heat in winter" },
];

const MAX_PHOTOS = 4;
const DRAFT_KEY = "tenly:report-draft";

interface Draft {
  title: string;
  description: string;
  urgency: Urgency;
}

function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export default function ReportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ title?: string; description?: string }>({});
  const [lease, setLease] = useState<Lease | null>(null);
  const [restored, setRestored] = useState(false);

  // Bring back an unfinished report (text only; photos are too big to keep).
  useEffect(() => {
    const d = readDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from sessionStorage
    setRestored(true);
    if (!d) return;
    setTitle(d.title ?? "");
    setDescription(d.description ?? "");
    setUrgency(d.urgency ?? "medium");
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, description, urgency } satisfies Draft));
    } catch {}
  }, [title, description, urgency, restored]);

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

  // Each new step: start at the top and move keyboard/screen-reader focus to its question.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  function goTo(next: number) {
    setError(null);
    setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
  }

  function nextFromProblem() {
    const errs: typeof fieldError = {};
    if (!title.trim()) errs.title = "Please tell us in a few words what's wrong, or tap one of the examples.";
    if (description.trim().length < 10) errs.description = "Please add a little more detail, like where it is and when it started.";
    setFieldError(errs);
    if (!errs.title && !errs.description) goTo(1);
  }

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

  async function submit() {
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
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
      router.push(`/tenant/requests/${data.id}?new=1`);
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof Error && err.message !== "Failed to fetch"
          ? err.message
          : "We couldn't send your request. Check your internet connection and try again. Your answers are saved.",
      );
    }
  }

  const urgencyInfo = URGENCY.find((u) => u.value === urgency)!;
  const questionClass = "text-[2rem] leading-tight font-semibold outline-none sm:text-[2.4rem]";

  return (
    <div className="mx-auto max-w-2xl pb-28 sm:pb-0">
      {/* Top: leave, and where you are */}
      <div className="mb-8 space-y-5">
        <Link
          href="/tenant"
          className="inline-flex min-h-11 items-center gap-2 text-lg font-semibold text-accent-ink hover:underline"
        >
          <X className="size-5" aria-hidden />
          Cancel
        </Link>
        <div>
          <p className="text-lg font-semibold">
            Step {step + 1} of {STEPS.length} <span className="font-normal text-muted">· {STEPS[step]}</span>
          </p>
          <ol className="mt-3 grid grid-cols-4 gap-2" aria-hidden>
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={`h-2 rounded-full transition-colors duration-300 ${i <= step ? "bg-accent" : "bg-line"}`}
              />
            ))}
          </ol>
        </div>
      </div>

      <div key={step} className="animate-rise space-y-8">
        {/* 1. What's wrong */}
        {step === 0 && (
          <>
            <h1 ref={heading} tabIndex={-1} className={questionClass}>
              What’s wrong?
            </h1>
            <div className="space-y-3">
              <p className="text-lg text-muted">Tap one to fill it in, or type your own below.</p>
              <div className="flex flex-wrap gap-2.5">
                {COMMON.map((c) => {
                  const on = title === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setTitle(c);
                        setFieldError((e) => ({ ...e, title: undefined }));
                      }}
                      aria-pressed={on}
                      className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-lg px-4 text-lg font-medium transition-colors ${
                        on ? "bg-accent text-on-accent" : "bg-surface ring-1 ring-line-strong hover:bg-accent-soft"
                      }`}
                    >
                      {on && <Check className="size-5" strokeWidth={3} aria-hidden />}
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="In a few words" error={fieldError.title}>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setFieldError((er) => ({ ...er, title: undefined }));
                }}
                maxLength={100}
                placeholder="For example: Kitchen sink is leaking"
                aria-invalid={!!fieldError.title}
              />
            </Field>
            <Field
              label="Tell us more"
              hint="Where is it? When did it start? Is it getting worse?"
              error={fieldError.description}
            >
              <Textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setFieldError((er) => ({ ...er, description: undefined }));
                }}
                maxLength={2000}
                className="min-h-44"
                aria-invalid={!!fieldError.description}
              />
            </Field>
          </>
        )}

        {/* 2. Photo */}
        {step === 1 && (
          <>
            <div className="space-y-3">
              <h1 ref={heading} tabIndex={-1} className={questionClass}>
                Can you add a photo?
              </h1>
              <p className="text-lg text-muted">
                It helps the repair person bring the right parts. You can skip this if you can’t take one.
              </p>
            </div>

            {photos.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map((src, i) => (
                  <li key={src.slice(-24)} className="relative animate-pop">
                    {/* eslint-disable-next-line @next/next/no-img-element -- data: URL preview */}
                    <img src={src} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-xl border border-line object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      className="absolute top-2 right-2 inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-lg bg-surface/95 px-2.5 text-base font-semibold text-fg shadow-card hover:bg-sunken"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <X className="size-4" aria-hidden />
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={photoBusy}
                className="flex min-h-40 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-accent-edge bg-accent-soft text-xl font-semibold text-accent-ink transition-colors hover:bg-accent-soft/70 disabled:opacity-60"
              >
                {photos.length ? <ImagePlus className="size-10" aria-hidden /> : <Camera className="size-10" aria-hidden />}
                {photoBusy ? "Adding your photo…" : photos.length ? "Add another photo" : "Take or choose a photo"}
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => addPhotos(e.target.files)}
            />
            <ErrorNote>{error}</ErrorNote>
          </>
        )}

        {/* 3. How soon */}
        {step === 2 && (
          <>
            <h1 ref={heading} tabIndex={-1} className={questionClass}>
              How soon does it need fixing?
            </h1>
            <fieldset>
              <legend className="sr-only">How soon does it need fixing?</legend>
              <div className="space-y-3">
                {URGENCY.map(({ value, label, hint }) => {
                  const on = urgency === value;
                  const emergency = value === "emergency";
                  return (
                    <label
                      key={value}
                      className={`pressable flex min-h-20 cursor-pointer items-center gap-4 rounded-xl border-2 px-5 py-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-edge ${
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
                        className={`size-6 shrink-0 ${emergency ? "accent-danger" : "accent-accent"}`}
                      />
                      <span>
                        <span className="block text-xl font-semibold">{label}</span>
                        <span className="block text-lg text-muted">{hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {urgency === "emergency" && (
              <p role="alert" className="animate-rise rounded-xl bg-danger-soft px-5 py-4 text-lg font-semibold text-danger-ink">
                If anyone is in danger, or you smell gas, leave the home and call 911 first.
              </p>
            )}
          </>
        )}

        {/* 4. Check and send */}
        {step === 3 && (
          <>
            <div className="space-y-3">
              <h1 ref={heading} tabIndex={-1} className={questionClass}>
                Check and send
              </h1>
              <p className="text-lg text-muted">Make sure this looks right. You can change anything.</p>
            </div>
            <dl className="divide-y divide-line rounded-xl border border-line bg-surface">
              <ReviewRow label="What’s wrong" onChange={() => goTo(0)}>
                <span className="block font-semibold">{title}</span>
                <span className="mt-1 block whitespace-pre-line text-muted">{description}</span>
              </ReviewRow>
              <ReviewRow label="Photos" onChange={() => goTo(1)}>
                {photos.length ? (
                  <span className="mt-1 flex gap-2">
                    {photos.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element -- data: URL preview
                      <img key={i} src={src} alt={`Photo ${i + 1}`} className="size-16 rounded-lg border border-line object-cover" />
                    ))}
                  </span>
                ) : (
                  <span className="text-muted">No photo</span>
                )}
              </ReviewRow>
              <ReviewRow label="How soon" onChange={() => goTo(2)}>
                <span className={`font-semibold ${urgency === "emergency" ? "text-danger-ink" : ""}`}>{urgencyInfo.label}</span>
              </ReviewRow>
              <ReviewRow label="Where">
                <span>
                  {user?.unit || "Your unit"}
                  {lease ? ` · ${lease.propertyAddress}, ${lease.city}` : ""}
                </span>
              </ReviewRow>
            </dl>
            <ErrorNote>{error}</ErrorNote>
            {submitting && <SendingSteps />}
          </>
        )}
      </div>

      {/* Back / Next: pinned to the bottom on phones so they're always in reach */}
      {!submitting && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-5 py-4 backdrop-blur sm:static sm:mt-10 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="mx-auto flex max-w-2xl gap-3">
            {step > 0 && (
              <Button variant="secondary" onClick={() => goTo(step - 1)} icon={<ArrowLeft aria-hidden />} className="shrink-0">
                Back
              </Button>
            )}
            {step === 0 && (
              <Button onClick={nextFromProblem} className="flex-1 flex-row-reverse" icon={<ArrowRight aria-hidden />}>
                Next
              </Button>
            )}
            {step === 1 && (
              <Button onClick={() => goTo(2)} className="flex-1 flex-row-reverse" icon={<ArrowRight aria-hidden />} disabled={photoBusy}>
                {photos.length ? "Next" : "Skip, no photo"}
              </Button>
            )}
            {step === 2 && (
              <Button onClick={() => goTo(3)} className="flex-1 flex-row-reverse" icon={<ArrowRight aria-hidden />}>
                Next
              </Button>
            )}
            {step === 3 && (
              <Button onClick={submit} className="flex-1" icon={<Send aria-hidden />}>
                Send to my landlord
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 3 && !submitting && (
        <p className="mt-4 hidden text-center text-base text-muted sm:block">
          We’ll find a repair person and send your landlord the options.
        </p>
      )}
    </div>
  );
}

function ReviewRow({
  label,
  children,
  onChange,
}: {
  label: string;
  children: React.ReactNode;
  onChange?: () => void;
}) {
  return (
    <div className="flex gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <dt className="text-base text-muted">{label}</dt>
        <dd className="mt-1 text-lg">{children}</dd>
      </div>
      {onChange && (
        <button
          type="button"
          onClick={onChange}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-lg px-3 text-base font-semibold text-accent-ink hover:bg-accent-soft"
          aria-label={`Change ${label.toLowerCase()}`}
        >
          <Pencil className="size-4" aria-hidden />
          Change
        </button>
      )}
    </div>
  );
}
