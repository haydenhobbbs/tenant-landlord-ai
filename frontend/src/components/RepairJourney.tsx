"use client";

// Home page centerpiece: one real repair, played out step by step.
// Plays on its own (pauses while the pointer or keyboard focus is on it) and
// each step is a big button people can tap to jump to. With "reduce motion"
// turned on it doesn't auto-play at all.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CalendarCheck, Check, Droplets, MessageSquareText, Star } from "lucide-react";

const STAGES = [
  { role: "tenant", step: "You report it", who: "Tenant" },
  { role: "contractor", step: "We find a repair person", who: "FixFlow" },
  { role: "landlord", step: "Landlord taps Approve", who: "Landlord" },
  { role: "tenant", step: "It's booked", who: "Everyone" },
] as const;

const STAGE_MS = 3600;

function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

export function RepairJourney() {
  const [stage, setStage] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [userPicked, setUserPicked] = useState(false);
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);

  const playing = !reduced && !hovering && !userPicked;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setStage((s) => (s + 1) % STAGES.length), STAGE_MS);
    return () => clearTimeout(t);
  }, [playing, stage]);

  const current = STAGES[stage];

  return (
    <div
      ref={root}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={(e) => !root.current?.contains(e.relatedTarget as Node) && setHovering(false)}
      className="space-y-5"
    >
      {/* The "phone screen" */}
      <div
        data-role={current.role}
        className="relative overflow-hidden rounded-[1.75rem] border border-line bg-surface p-6 shadow-raised transition-colors duration-500 sm:p-8"
        aria-live="polite"
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1.5 bg-accent transition-colors duration-500"
        />
        <p className="flex items-center justify-between text-sm font-semibold text-muted">
          <span>Kitchen sink · Apt 3B</span>
          <span key={stage} className="animate-fade rounded-full bg-accent-soft px-3 py-1 text-accent-ink">
            {current.who}
          </span>
        </p>

        <div key={stage} className="stagger mt-6 min-h-60 space-y-4">
          {stage === 0 && <TenantStage />}
          {stage === 1 && <ContractorStage />}
          {stage === 2 && <LandlordStage />}
          {stage === 3 && <BookedStage />}
        </div>
      </div>

      {/* Step buttons double as the progress indicator */}
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STAGES.map((s, i) => {
          const on = i === stage;
          return (
            <li key={s.step} data-role={s.role}>
              <button
                type="button"
                onClick={() => {
                  setStage(i);
                  setUserPicked(true);
                }}
                aria-current={on ? "step" : undefined}
                className={`pressable relative flex h-full min-h-16 w-full cursor-pointer flex-col items-start gap-0.5 overflow-hidden rounded-xl border px-3 py-2.5 text-left ${
                  on ? "border-accent-edge bg-accent-soft" : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <span className={`tabular text-sm font-bold ${on ? "text-accent-ink" : "text-muted"}`}>Step {i + 1}</span>
                <span className="text-base leading-tight font-semibold">{s.step}</span>
                {on && playing && (
                  <span
                    key={`bar-${stage}`}
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1 origin-left bg-accent"
                    style={{ animation: `grow-x ${STAGE_MS}ms linear both` }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>
      {userPicked && !reduced && (
        <button
          type="button"
          onClick={() => setUserPicked(false)}
          className="cursor-pointer text-base font-semibold text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          Play it automatically
        </button>
      )}
    </div>
  );
}

function Bubble({ children, from = "left" }: { children: React.ReactNode; from?: "left" | "right" }) {
  return (
    <p
      className={`max-w-[85%] rounded-2xl px-4 py-3 text-lg leading-snug ${
        from === "right" ? "ml-auto rounded-br-md bg-accent text-on-accent" : "rounded-bl-md bg-sunken"
      }`}
    >
      {children}
    </p>
  );
}

function TenantStage() {
  return (
    <>
      <Bubble from="right">Water is dripping under the kitchen sink. There&apos;s a puddle in the cabinet.</Bubble>
      <div className="ml-auto flex w-fit items-center gap-3 rounded-xl border border-line bg-bg px-3 py-2">
        <span className="grid size-12 place-items-center rounded-lg bg-accent-soft text-accent-ink">
          <Droplets className="size-6" aria-hidden />
        </span>
        <span className="text-base text-muted">1 photo attached</span>
      </div>
      <p className="flex items-center gap-2 text-base font-semibold text-accent-ink">
        <Check className="size-5" strokeWidth={3} aria-hidden /> Sent. That&apos;s all the tenant has to do.
      </p>
    </>
  );
}

function ContractorStage() {
  return (
    <>
      <p className="flex items-center gap-2 text-base text-muted">
        <MessageSquareText className="size-5" aria-hidden /> Texted 3 local plumbers…
      </p>
      <Bubble>Yes, I can come Tuesday at 10am. About $180.</Bubble>
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-contractor-soft p-4">
        <div>
          <p className="text-xl font-bold">Rapid Rooter Plumbing</p>
          <p className="flex items-center gap-1 text-base text-muted">
            <Star className="size-4 fill-current text-contractor-ink" aria-hidden /> 4.8 · licensed · 2 miles away
          </p>
        </div>
        <p className="tabular text-2xl font-bold text-contractor-ink">$180</p>
      </div>
    </>
  );
}

function LandlordStage() {
  return (
    <>
      <p className="text-lg">
        <strong>Rapid Rooter Plumbing</strong> can fix the kitchen sink leak on <strong>Tuesday at 10am</strong> for{" "}
        <strong>$180</strong>.
      </p>
      <p className="text-base text-muted">Legal check: Ohio requires landlords to keep plumbing in good working order. Booking this covers it.</p>
      <div className="flex gap-3 pt-2">
        <span className="inline-flex min-h-14 flex-1 animate-[press_1.6s_var(--ease-out)_900ms_both] items-center justify-center gap-2 rounded-xl border border-accent-edge bg-accent text-lg font-semibold text-on-accent shadow-card">
          <Check className="size-5" strokeWidth={3} aria-hidden /> Approve
        </span>
        <span className="inline-flex min-h-14 items-center justify-center rounded-xl border border-line-strong px-5 text-lg font-semibold">
          Decline
        </span>
      </div>
    </>
  );
}

function BookedStage() {
  return (
    <>
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 animate-pop place-items-center rounded-full bg-accent text-on-accent">
          <CalendarCheck className="size-7" aria-hidden />
        </span>
        <p className="text-2xl font-bold">Plumber booked for Tuesday, 10am</p>
      </div>
      <Bubble>FixFlow: Rapid Rooter Plumbing is coming Tue at 10am to fix your sink. Reply here with any questions.</Bubble>
      <p className="text-base text-muted">The tenant, landlord and plumber all got a text and a calendar invite.</p>
    </>
  );
}
