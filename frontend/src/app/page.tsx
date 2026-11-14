import Link from "next/link";
import { ArrowRight, Building2, KeyRound } from "lucide-react";
import { RepairJourney } from "@/components/RepairJourney";
import { SignedInRedirect } from "@/components/SignedInRedirect";
import { ButtonLink } from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="space-y-20 pb-10">
      <SignedInRedirect />
      <section className="grid items-center gap-12 pt-4 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pt-10">
        <div className="stagger space-y-6">
          <h1 className="text-4xl leading-[1.08] font-semibold sm:text-6xl">
            Home repairs, sorted without the <span className="whitespace-nowrap">back-and-forth.</span>
          </h1>
          <p className="max-w-[46ch] text-xl text-muted">
            Tenants say what&apos;s broken. Tenly finds a repair person with a price and a time. The landlord just
            taps Approve.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <ButtonLink href="/login" icon={<ArrowRight aria-hidden />} className="flex-row-reverse hover:[&_svg]:translate-x-1">
              Get started
            </ButtonLink>
            <p className="text-base text-muted">Free to try. No app to download.</p>
          </div>
        </div>

        <div className="animate-rise [animation-delay:200ms]">
          <RepairJourney />
        </div>
      </section>

      <section aria-labelledby="who" className="space-y-6">
        <h2 id="who" className="text-2xl sm:text-3xl">Which one are you?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <RoleLink
            role="tenant"
            icon={<KeyRound className="size-7" aria-hidden />}
            title="I rent a home"
            body="Report a repair in a minute and follow every step."
          />
          <RoleLink
            role="landlord"
            icon={<Building2 className="size-7" aria-hidden />}
            title="I own or manage a property"
            body="Get one clear summary per repair. Approve with one tap."
          />
        </div>
      </section>
    </div>
  );
}

function RoleLink({ role, icon, title, body }: { role: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link
      href="/login"
      data-role={role}
      className="pressable group flex items-center gap-5 rounded-2xl border border-line bg-surface p-6 shadow-card hover:-translate-y-0.5 hover:border-accent-edge hover:shadow-raised"
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-accent-edge bg-accent text-on-accent transition-transform duration-300 ease-(--ease-out) group-hover:-rotate-6">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-xl font-bold">{title}</span>
        <span className="block text-base text-muted">{body}</span>
      </span>
      <ArrowRight
        className="size-6 text-accent-ink transition-transform duration-300 ease-(--ease-out) group-hover:translate-x-1.5"
        aria-hidden
      />
    </Link>
  );
}
