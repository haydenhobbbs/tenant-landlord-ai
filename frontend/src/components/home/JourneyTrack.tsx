"use client";

// Home page: one repair, scrolled sideways. Arrow buttons step through the
// four stops and the thin bar shows how far along you are.

import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function JourneyTrack({ children }: { children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  function go(dir: number) {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * (first.offsetWidth + 16), behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <>
      <div className="mx-auto flex max-w-6xl items-center justify-end gap-2 px-5 sm:px-8">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous step"
          className="grid size-12 cursor-pointer place-items-center rounded-lg text-white ring-1 ring-white/20 transition-colors hover:bg-white/10"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next step"
          className="grid size-12 cursor-pointer place-items-center rounded-lg text-white ring-1 ring-white/20 transition-colors hover:bg-white/10"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      <div className="mx-auto mt-6 max-w-6xl px-5 sm:px-8">
        <div className="h-0.5 bg-navy-line">
          <div className="h-0.5 bg-tenant-bright transition-[width] duration-500 ease-out" style={{ width: `${25 + progress * 75}%` }} />
        </div>
      </div>
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setProgress(el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth));
        }}
        className="snap-track mt-8 flex gap-4 overflow-x-auto px-5 pb-2 [scroll-padding-left:1.25rem] sm:px-8 lg:px-[max(2rem,calc((100vw-72rem)/2+2rem))]"
      >
        {children}
      </div>
    </>
  );
}
