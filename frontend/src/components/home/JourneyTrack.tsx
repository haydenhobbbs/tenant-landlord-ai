"use client";

// Home page: one repair, scrolled sideways. Arrow buttons step through the
// stops and the thin green bar shows which one you're on.
//
// The arrows don't rely on a smooth-scroll animation finishing: some browsers
// cancel it inside a snapping scroller (the arrows used to do nothing at
// laptop widths). We scroll to the exact card, and if the smooth slide
// hasn't arrived shortly after, jump the rest of the way. The bar follows the
// current card, so it moves with the arrows and with swiping.

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function JourneyTrack({ children }: { children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = Children.count(children);
  const [index, setIndex] = useState(0);

  useEffect(() => () => {
    if (settle.current) clearTimeout(settle.current);
  }, []);

  // Where the track must be scrolled to so card `i` sits at the start.
  function offsetOf(el: HTMLDivElement, i: number) {
    const card = el.children[i] as HTMLElement | undefined;
    if (!card) return 0;
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const left = el.scrollLeft + card.getBoundingClientRect().left - el.getBoundingClientRect().left - pad;
    return Math.max(0, Math.min(left, el.scrollWidth - el.clientWidth));
  }

  function goTo(i: number) {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(count - 1, i));
    const target = offsetOf(el, next);
    setIndex(next);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: target, behavior: reduce ? "auto" : "smooth" });
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      if (Math.abs(el.scrollLeft - target) > 4) el.scrollTo({ left: target, behavior: "auto" });
    }, 650);
  }

  // Swiping or scrolling by hand: the bar follows the card nearest the start.
  function onScroll() {
    const el = track.current;
    if (!el) return;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < count; i++) {
      const d = Math.abs(offsetOf(el, i) - el.scrollLeft);
      if (d < best) [best, nearest] = [d, i];
    }
    // At the far right edge the last card counts as reached.
    if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 4) nearest = count - 1;
    setIndex(nearest);
  }

  const progress = count > 1 ? index / (count - 1) : 1;
  const arrow =
    "grid size-12 cursor-pointer place-items-center rounded-lg text-white ring-1 ring-white/20 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <>
      <div className="mx-auto flex max-w-6xl items-center justify-end gap-2 px-5 sm:px-8">
        <p className="mr-auto text-[0.95rem] text-white/55 tabular" aria-live="polite">
          Step {index + 1} of {count}
        </p>
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous step" className={arrow}>
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <button type="button" onClick={() => goTo(index + 1)} disabled={index === count - 1} aria-label="Next step" className={arrow}>
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      <div className="mx-auto mt-6 max-w-6xl px-5 sm:px-8">
        <div className="h-0.5 bg-navy-line">
          <div
            className="h-0.5 bg-tenant-bright transition-[width] duration-500 ease-out"
            style={{ width: `${(1 / count) * 100 + progress * (1 - 1 / count) * 100}%` }}
          />
        </div>
      </div>
      <div
        ref={track}
        onScroll={onScroll}
        className="snap-track mt-8 flex gap-4 overflow-x-auto px-5 pb-2 [scroll-padding-left:1.25rem] sm:px-8 lg:px-[max(2rem,calc((100vw-72rem)/2+2rem))]"
      >
        {children}
      </div>
    </>
  );
}
