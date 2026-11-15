import { Check, X } from "lucide-react";
import type { MaintenanceRequest } from "@/lib/types";

// Step-by-step progress of one repair, in plain words.
// Works with today's statuses and the ones planned in docs/TEAM_PLAN.md.
//
// Motion: finished steps fill in one after another, the line between them
// draws downward, and the current step breathes slowly so it's obvious where
// things stand. When the status changes (the page polls every 5s), the steps
// that changed replay their animation because their key changes.

// The landlord decides first (fix it themselves, or have the AI contact
// contractors), then quotes come in and they pick one.
const STEPS = ["Sent", "Landlord reviewing", "Getting a price and a time", "Booked", "Fixed"];

const STEP_FOR_STATUS: Record<string, number> = {
  submitted: 1,
  finding_contractor: 2,
  awaiting_approval: 2,
  contractor_suggested: 2,
  approved: 3,
  landlord_approved: 3,
  scheduled: 3,
  completed: 5, // all done
};

export function currentStep(status: string) {
  return STEP_FOR_STATUS[status] ?? 0;
}

const HINTS = [
  "We got your request.",
  "Your landlord is deciding how to fix it: themselves, or with a repair person.",
  "We're contacting repair people for a price and a time. Your landlord picks one.",
  "You'll get a reminder before they arrive.",
  "All done.",
];

export function RequestTracker({ request }: { request: MaintenanceRequest }) {
  const declined = request.status === "declined";
  const step = declined ? 1 : currentStep(request.status); // declined = stopped at the landlord step

  return (
    <ol>
      {STEPS.map((label, i) => {
        const done = i < step;
        const here = i === step && !declined;
        const stopped = declined && i === step;
        const last = i === STEPS.length - 1;
        const state = stopped ? "stopped" : done ? "done" : here ? "here" : "todo";
        const delay = { animationDelay: `${i * 110}ms` };

        return (
          <li key={`${label}-${state}`} className="relative flex gap-4 pb-7 last:pb-0">
            {!last && (
              <span aria-hidden className="absolute top-11 bottom-1 left-[19px] w-0.5 overflow-hidden rounded-full bg-line">
                {done && (
                  <span
                    className="block h-full w-full origin-top animate-draw-y bg-accent"
                    style={{ animationDelay: `${i * 110 + 160}ms` }}
                  />
                )}
              </span>
            )}

            <span
              style={delay}
              className={`relative grid size-10 shrink-0 animate-pop place-items-center rounded-full border-2 text-base font-bold ${
                stopped
                  ? "border-danger bg-danger-soft text-danger-ink"
                  : done
                    ? "border-accent bg-accent text-on-accent"
                    : here
                      ? "border-accent bg-accent-soft text-accent-ink"
                      : "border-line bg-surface text-muted"
              }`}
            >
              {here && <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full" />}
              {stopped ? <X className="size-5" aria-hidden /> : done ? <Check className="size-5" strokeWidth={3} aria-hidden /> : i + 1}
            </span>

            <div className="animate-fade pt-1.5" style={delay}>
              <p className={`text-lg ${here || stopped ? "font-bold" : done ? "font-semibold" : "text-muted"}`}>
                {stopped ? "Landlord declined" : label}
              </p>
              {here && <p className="text-base text-muted">{HINTS[i]}</p>}
              {stopped && <p className="text-base text-muted">Your landlord will message you about next steps.</p>}
              <span className="sr-only">{done ? "(done)" : here ? "(current step)" : ""}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
