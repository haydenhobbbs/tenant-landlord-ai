import type { RequestStatus, Urgency } from "@/lib/types";

const STATUS_STYLES: Record<RequestStatus, { label: string; className: string }> = {
  submitted: { label: "Sent", className: "bg-slate-100 text-slate-700" },
  finding_contractor: { label: "Finding a contractor…", className: "bg-sky-100 text-sky-800" },
  contractor_suggested: { label: "Waiting on landlord", className: "bg-amber-100 text-amber-800" },
  landlord_approved: { label: "Approved · confirming", className: "bg-emerald-50 text-emerald-700" },
  scheduled: { label: "Scheduled", className: "bg-emerald-100 text-emerald-800" },
  completed: { label: "Done", className: "bg-slate-200 text-slate-700" },
  declined: { label: "Declined", className: "bg-rose-100 text-rose-800" },
};

const URGENCY_STYLES: Record<Urgency, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-sky-100 text-sky-800",
  high: "bg-orange-100 text-orange-800",
  emergency: "bg-red-600 text-white",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const s = STATUS_STYLES[status] ?? { label: status, className: "bg-slate-100 text-slate-700" };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${URGENCY_STYLES[urgency]}`}>
      {urgency}
    </span>
  );
}
