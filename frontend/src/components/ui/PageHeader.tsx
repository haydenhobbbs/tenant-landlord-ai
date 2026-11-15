import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

// Top of every screen: big plain-words title, one sentence under it,
// and an optional "back" link.
export function PageHeader({
  title,
  intro,
  back,
  action,
}: {
  title: string;
  intro?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 space-y-2 sm:mb-8 sm:space-y-3">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-2 rounded-lg py-1 text-base font-semibold text-accent-ink hover:underline"
        >
          <ArrowLeft className="size-5" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-[1.75rem] leading-tight font-semibold sm:text-[2.6rem]">{title}</h1>
          {intro && <p className="max-w-[60ch] text-lg text-muted">{intro}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
