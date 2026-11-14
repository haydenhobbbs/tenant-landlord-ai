"use client";

// 📄 Lease summary. Shared: the tenant's Lease screen uses it, and Teammate B
// can reuse it on the landlord side: <LeaseView lease={lease} />

import { useState } from "react";
import { Download } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { formatPrice } from "@/lib/format";
import type { Lease } from "@/lib/types";

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function LeaseView({ lease }: { lease: Lease }) {
  const [now] = useState(() => Date.now());
  const daysLeft = Math.ceil((new Date(`${lease.endDate}T12:00:00`).getTime() - now) / 86_400_000);

  const facts = [
    { label: "Monthly rent", value: formatPrice(lease.monthlyRent), note: `Due on the ${ordinal(lease.rentDueDay)}` },
    { label: "Lease ends", value: longDate(lease.endDate), note: daysLeft > 0 ? `${daysLeft} days from today` : "Ended" },
    { label: "Security deposit", value: formatPrice(lease.securityDeposit), note: "Held by your landlord" },
  ];

  return (
    <div className="stagger space-y-10">
      <section className="rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <p className="text-xl font-bold">
          {lease.propertyAddress}
          {lease.unit && `, ${lease.unit}`}
        </p>
        <p className="text-lg text-muted">
          {lease.city}, {lease.state} · {longDate(lease.startDate)} to {longDate(lease.endDate)}
        </p>
        <dl className="mt-6 grid gap-6 border-t border-line pt-6 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="text-base text-muted">{f.label}</dt>
              <dd className="tabular text-2xl font-bold">{f.value}</dd>
              <dd className="text-base text-muted">{f.note}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-base text-muted">
          Between <strong className="text-fg">{lease.tenantName}</strong> (tenant) and{" "}
          <strong className="text-fg">{lease.landlordName}</strong> (landlord).
        </p>
      </section>

      <section aria-labelledby="rules" className="space-y-4">
        <h2 id="rules" className="text-2xl font-bold">The key rules, in plain words</h2>
        <dl className="divide-y divide-line">
          {lease.terms.map((t) => (
            <div key={t.title} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="text-lg font-bold">{t.title}</dt>
              <dd className="max-w-[65ch] text-lg">{t.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      {lease.documentUrl ? (
        <ButtonLink href={lease.documentUrl} target="_blank" variant="secondary" icon={<Download aria-hidden />}>
          Download the signed lease (PDF)
        </ButtonLink>
      ) : (
        <p className="text-base text-muted">
          This is a summary. Ask your landlord for the full signed copy if you need it.
        </p>
      )}
    </div>
  );
}
