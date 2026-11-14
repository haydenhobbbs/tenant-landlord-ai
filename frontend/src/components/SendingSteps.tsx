"use client";

// Shown in place of the Send button while a request is being sent, so the
// wait feels like progress instead of a frozen button. Steps tick over on a
// timer; the last one keeps spinning until the page moves on.

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

const STEPS = ["Saving your request", "Looking for a repair person", "Getting a price and a time"];

export function SendingSteps() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = STEPS.slice(1).map((_, i) => setTimeout(() => setStep(i + 1), (i + 1) * 900));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div role="status" aria-live="polite" className="animate-rise rounded-2xl border border-line bg-surface p-6 shadow-card">
      <ol className="space-y-4">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label} className={`flex items-center gap-4 text-lg transition-opacity duration-300 ${i > step ? "opacity-40" : ""}`}>
              <span className="relative grid size-8 shrink-0 place-items-center">
                {done ? (
                  <span className="grid size-8 animate-pop place-items-center rounded-full bg-accent text-on-accent">
                    <Check className="size-5" strokeWidth={3} aria-hidden />
                  </span>
                ) : active ? (
                  <span className="size-8 animate-spin rounded-full border-3 border-accent-soft border-t-accent" aria-hidden />
                ) : (
                  <span className="size-3 rounded-full bg-line-strong" aria-hidden />
                )}
              </span>
              <span className={active ? "font-bold" : done ? "font-semibold" : ""}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
