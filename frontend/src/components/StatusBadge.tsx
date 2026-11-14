import type { RequestStatus, Urgency } from "@/lib/types";

// Plain-words labels. Keys also cover the statuses planned in docs/TEAM_PLAN.md
// (finding_contractor, contractor_suggested, ...) so nothing breaks when
// types.ts is updated.
const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  submitted: { label: "Sent", className: "bg-sunken text-fg" },
  finding_contractor: { label: "Finding a repair person", className: "bg-sunken text-fg" },
  awaiting_approval: { label: "Waiting on landlord", className: "bg-warn-soft text-warn-ink" },
  contractor_suggested: { label: "Waiting on landlord", className: "bg-warn-soft text-warn-ink" },
  approved: { label: "Approved", className: "bg-ok-soft text-ok-ink" },
  landlord_approved: { label: "Approved", className: "bg-ok-soft text-ok-ink" },
  scheduled: { label: "Booked", className: "bg-ok-soft text-ok-ink" },
  completed: { label: "Fixed", className: "bg-ok-soft text-ok-ink" },
  declined: { label: "Declined", className: "bg-danger-soft text-danger-ink" },
};

const URGENCY_STYLES: Record<Urgency, { label: string; className: string }> = {
  low: { label: "Not urgent", className: "bg-sunken text-muted" },
  medium: { label: "Soon", className: "bg-sunken text-fg" },
  high: { label: "Urgent", className: "bg-warn-soft text-warn-ink" },
  emergency: { label: "Emergency", className: "bg-danger text-white dark:text-[#1a0806]" },
};

const pill = "inline-flex items-center rounded-full px-3 py-1 text-base font-semibold whitespace-nowrap";

export function StatusBadge({ status }: { status: RequestStatus | string }) {
  const s = STATUS_STYLES[status] ?? { label: status, className: "bg-sunken text-fg" };
  return <span className={`${pill} ${s.className}`}>{s.label}</span>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const u = URGENCY_STYLES[urgency];
  return <span className={`${pill} ${u.className}`}>{u.label}</span>;
}
