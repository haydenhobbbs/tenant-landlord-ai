"use client";

// 👤 TENANT: one repair, step by step.

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
  const [loaded, setRequest] = useState<MaintenanceRequest | null>(null);
  // Next.js keeps this page's state between visits; never show a different repair's data.
  const request = loaded?.id === id ? loaded : null;
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
      <div className="space-y-6" aria-label="Loading this repair">
        <div className="skeleton h-12 w-2/3" />
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="skeleton h-72" />
          <div className="skeleton h-72" />
        </div>
      </div>
    );
  }

  // "scheduled" / "landlord_approved" are planned statuses in TEAM_PLAN.md.
  const booked = ["approved", "landlord_approved", "scheduled"].includes(request.status);

  return (
    <div className="stagger space-y-8">
      <PageHeader title={request.title} back={back} />

      {justSent && (
        <p className="flex items-center gap-3 rounded-xl bg-accent-soft px-5 py-4 text-lg font-semibold text-accent-ink">
          <CheckCircle2 className="size-6 shrink-0 animate-pop [animation-delay:300ms]" aria-hidden />
          Sent! We&apos;ll notify you at every step.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <section aria-labelledby="progress" className="space-y-5">
          <h2 id="progress" className="text-xl font-bold">Progress</h2>
          <RequestTracker request={request} />
        </section>

        <div className="space-y-6">
          {/* Booked: the repair person the landlord picked */}
          {booked && request.selected && (
            <Card tone="contractor" as="section" aria-labelledby="pro" className="space-y-4">
              <h2 id="pro" className="text-sm font-bold tracking-wide text-contractor-ink uppercase">
                Your repair person
              </h2>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{request.selected.contractor.name}</p>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-muted">
                  {request.selected.contractor.rating && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-4 fill-current text-contractor-ink" aria-hidden />
                      {request.selected.contractor.rating} rating
                    </span>
                  )}
                  {request.selected.contractor.phone && (
                    <a
                      href={`tel:${request.selected.contractor.phone}`}
                      className="inline-flex items-center gap-1 font-semibold text-contractor-ink underline"
                    >
                      <Phone className="size-4" aria-hidden />
                      {request.selected.contractor.phone}
                    </a>
                  )}
                </p>
              </div>
              {(request.scheduledAt ?? request.selected.availableAt) && (
                <p className="flex items-center gap-2 text-lg">
                  <CalendarClock className="size-5 text-contractor-ink" aria-hidden />
                  Coming <strong>{formatDateTime((request.scheduledAt ?? request.selected.availableAt)!)}</strong>
                </p>
              )}
            </Card>
          )}

          {/* Waiting: the landlord is choosing between the options we found */}
          {request.status === "contractor_suggested" && request.suggestions.length > 0 && (
            <Card tone="contractor" as="section" aria-labelledby="options" className="space-y-3">
              <h2 id="options" className="text-sm font-bold tracking-wide text-contractor-ink uppercase">
                {request.suggestions.length === 1 ? "We found a repair person" : `We found ${request.suggestions.length} repair people`}
              </h2>
              <ul className="space-y-1">
                {request.suggestions.map((o) => (
                  <li key={o.contractor.id} className="flex items-center justify-between gap-3 text-lg font-semibold">
                    {o.contractor.name}
                    {o.contractor.rating && (
                      <span className="inline-flex items-center gap-1 text-base font-normal text-muted">
                        <Star className="size-4 fill-current text-contractor-ink" aria-hidden />
                        {o.contractor.rating}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-base text-muted">
                Your landlord is choosing one. You don&apos;t need to do anything; we&apos;ll tell you when it&apos;s booked.
              </p>
            </Card>
          )}

          <section aria-labelledby="sent" className="space-y-3">
            <h2 id="sent" className="text-xl font-bold">What you sent</h2>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={request.status} />
              <UrgencyBadge urgency={request.urgency} />
            </div>
            <p className="max-w-[65ch] text-lg whitespace-pre-line">{request.description}</p>
            <p className="text-base text-muted">Sent {formatDateTime(request.createdAt)} · {request.unit}</p>
            {request.photos && request.photos.length > 0 && (
              <ul className="flex flex-wrap gap-3 pt-1">
                {request.photos.map((src, i) => (
                  <li key={i}>
                    <a href={src} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element -- user photos (storage or data: URLs) */}
                      <img src={src} alt={`Photo ${i + 1} of the problem`} className="size-32 rounded-xl border border-line object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ButtonLink href="/tenant/messages" variant="secondary" size="md" icon={<MessageCircle aria-hidden />}>
            Message your landlord
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
