"use client";

// 👤 TENANT: one repair. Built for 45–60 year-old tenants: the first thing on
// screen is one plain sentence saying where things stand and what happens
// next, then big buttons (call the repair person, message the landlord).

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CalendarClock, CheckCircle2, MessageCircle, Phone, Star } from "lucide-react";
import { RequestTracker } from "@/components/RequestTracker";
import { StatusBadge, UrgencyBadge } from "@/components/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime } from "@/lib/format";
import type { MaintenanceRequest } from "@/lib/types";

// useSearchParams needs a Suspense boundary in Next 16.
export default function RequestDetailPage() {
  return (
    <Suspense fallback={<p className="text-lg text-muted">Loading…</p>}>
      <RequestDetail />
    </Suspense>
  );
}

function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const justSent = useSearchParams().get("new") === "1";
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [missing, setMissing] = useState(false);

  // Refresh every 5s so the tenant sees "Booked" appear without reloading.
  useEffect(() => {
    let active = true;
    const load = async () => {
      const res = await fetch(`/api/requests/${id}`, { cache: "no-store" }).catch(() => null);
      if (!active || !res) return;
      if (res.status === 404) return setMissing(true);
      if (res.ok) setRequest(await res.json());
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);

  const back = { href: "/tenant", label: "Back to home" };

  if (missing) {
    return (
      <div>
        <PageHeader title="We can't find that repair" intro="It may have been removed. Your other repairs are on your home screen." back={back} />
      </div>
    );
  }
  if (!request) {
    return (
      <div className="mx-auto max-w-3xl space-y-6" aria-label="Loading this repair">
        <div className="skeleton h-12 w-2/3" />
        <div className="skeleton h-40" />
        <div className="skeleton h-72" />
      </div>
    );
  }

  const when = request.scheduledAt ?? request.selected?.availableAt;
  const booked = ["approved", "landlord_approved", "scheduled"].includes(request.status) && !!request.selected;
  const declined = request.status === "declined";
  const summary = statusSummary(request, when);
  const pro = request.selected?.contractor;

  return (
    <div className="stagger mx-auto max-w-6xl space-y-8">
      <PageHeader title={request.title} intro={`Sent ${formatDateTime(request.createdAt)} · ${request.unit}`} back={back} />

      {justSent && (
        <p role="status" className="flex items-center gap-3 rounded-xl bg-accent-soft px-5 py-4 text-lg font-semibold text-accent-ink">
          <CheckCircle2 className="size-6 shrink-0 animate-pop [animation-delay:300ms]" aria-hidden />
          Sent! We&apos;ll text you at every step. You don&apos;t need to do anything else.
        </p>
      )}

      {/* Two columns on wider screens so less scrolling: status + who's coming on
          the left, progress + what you sent on the right. Stacked on phones. */}
      <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-8">
      {/* Where things stand, in one sentence */}
      <section
        aria-labelledby="now"
        className={`relative overflow-hidden rounded-xl px-6 py-7 ring-1 sm:px-8 ${
          declined ? "bg-danger-soft ring-danger/30" : "bg-navy text-white ring-white/10"
        }`}
      >
        {!declined && (
          <>
            <div aria-hidden="true" className="glow-blob absolute -top-24 -right-16 size-72 bg-[#1b6b44] opacity-60 blur-3xl" />
            <div aria-hidden="true" className="gridlines absolute inset-0" />
          </>
        )}
        <div className="relative space-y-2">
          <p className={`text-lg font-medium ${declined ? "text-danger-ink" : "text-tenant-bright"}`}>Right now</p>
          <h2 id="now" className="text-[1.9rem] leading-tight sm:text-[2.2rem]">
            {summary.headline}
          </h2>
          <p className={`max-w-xl text-lg ${declined ? "text-fg" : "text-white/75"}`}>{summary.next}</p>
        </div>
      </section>

      {/* Booked: who's coming, with big buttons */}
      {booked && pro && (
        <Card tone="contractor" as="section" aria-labelledby="pro" className="space-y-5">
          <div>
            <h2 id="pro" className="font-[family-name:var(--font-body)] text-lg font-medium tracking-normal text-contractor-ink">
              Your repair person
            </h2>
            <p className="font-[family-name:var(--font-heading)] text-[1.8rem] leading-tight font-semibold">{pro.name}</p>
            {pro.rating && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-lg text-muted">
                <Star className="size-5 fill-current text-contractor-ink" aria-hidden />
                Rated {pro.rating} out of 5
              </p>
            )}
          </div>
          {when && (
            <p className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3.5 text-xl">
              <CalendarClock className="size-6 shrink-0 text-contractor-ink" aria-hidden />
              <span>
                Coming <strong>{longDateTime(when)}</strong>
              </span>
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {pro.phone && (
              <a
                href={`tel:${pro.phone}`}
                className="inline-flex min-h-[3.6rem] items-center justify-center gap-2.5 rounded-lg bg-contractor px-5 text-lg font-semibold text-white transition-colors hover:bg-contractor-hover dark:text-navy"
              >
                <Phone className="size-5" aria-hidden />
                <span className="text-center leading-tight">Call {pro.name}</span>
              </a>
            )}
            <ButtonLink href="/tenant/messages" variant="secondary" icon={<MessageCircle aria-hidden />}>
              Message your landlord
            </ButtonLink>
          </div>
        </Card>
      )}

      {/* Waiting: the landlord is choosing between the options we found */}
      {request.status === "contractor_suggested" && request.suggestions.length > 0 && (
        <Card tone="contractor" as="section" aria-labelledby="options" className="space-y-4">
          <h2 id="options" className="text-[1.5rem] leading-tight">
            {request.suggestions.length === 1 ? "We found a repair person" : `We found ${request.suggestions.length} repair people`}
          </h2>
          <ul className="divide-y divide-contractor/15 rounded-lg bg-surface">
            {request.suggestions.map((o) => (
              <li key={o.contractor.id} className="flex items-center justify-between gap-3 px-4 py-3.5 text-lg font-semibold">
                {o.contractor.name}
                {o.contractor.rating && (
                  <span className="inline-flex items-center gap-1.5 text-lg font-normal text-muted">
                    <Star className="size-5 fill-current text-contractor-ink" aria-hidden />
                    {o.contractor.rating}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-lg text-muted">Your landlord picks one. We&apos;ll text you as soon as it&apos;s booked.</p>
        </Card>
      )}

      {!booked && (
        <ButtonLink href="/tenant/messages" variant="secondary" icon={<MessageCircle aria-hidden />} className="w-full sm:w-auto">
          Message your landlord
        </ButtonLink>
      )}
      </div>

      <div className="space-y-8">
      <section aria-labelledby="progress" className="rounded-xl border border-line bg-surface p-6 sm:p-8">
        <h2 id="progress" className="mb-6 text-[1.5rem] leading-tight">
          Step by step
        </h2>
        <RequestTracker request={request} />
      </section>

      <section aria-labelledby="sent" className="space-y-4">
        <h2 id="sent" className="text-[1.5rem] leading-tight">
          What you sent
        </h2>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={request.status} />
          <UrgencyBadge urgency={request.urgency} />
        </div>
        <p className="max-w-[65ch] text-lg whitespace-pre-line">{request.description}</p>
        {request.photos && request.photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {request.photos.map((src, i) => (
              <li key={i}>
                <a href={src} target="_blank" rel="noreferrer" className="block" aria-label={`Open photo ${i + 1} full size`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- user photos (storage or data: URLs) */}
                  <img src={src} alt={`Photo ${i + 1} of the problem`} className="aspect-square w-full rounded-xl border border-line object-cover" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
      </div>
    </div>
  );
}

// "Tuesday, November 15 at 10:00 AM": easier to read than short forms.
function longDateTime(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} at ${time}`;
}

// One plain sentence for where the repair is, and what happens next.
function statusSummary(r: MaintenanceRequest, when?: string): { headline: string; next: string } {
  switch (r.status) {
    case "submitted":
    case "finding_contractor":
      return {
        headline: "We’re contacting repair people",
        next: "We’re asking local pros for a price and a time. This usually takes under an hour.",
      };
    case "contractor_suggested":
      return {
        headline: "Your landlord is choosing a repair person",
        next: "We sent them the options. You’ll get a text as soon as one is booked.",
      };
    case "landlord_approved":
    case "scheduled":
      return {
        headline: when ? `Booked for ${longDateTime(when)}` : "Your repair is booked",
        next: "We’ll text you a reminder the day before. Make sure someone can let them in.",
      };
    case "completed":
      return { headline: "All fixed", next: "If something still isn’t right, message your landlord." };
    case "declined":
      return {
        headline: "Your landlord didn’t approve this one",
        next: "They may handle it another way. Message them if you have questions.",
      };
    default:
      return { headline: "We got your request", next: "We’ll keep you posted at every step." };
  }
}
