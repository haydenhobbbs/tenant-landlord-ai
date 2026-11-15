import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { JourneyTrack } from "@/components/home/JourneyTrack";
import { SignedInRedirect } from "@/components/SignedInRedirect";

// Home page: proposal C ("Repairs that run themselves"), chosen by the team.
// Sections break out of the page's max width to run edge to edge.
const bleed = "relative left-1/2 -ml-[50vw] w-screen";
const heading = "font-[family-name:var(--font-heading)]";

function PrimaryCta() {
  return (
    <Link
      href="/login"
      className="group inline-flex min-h-[3.6rem] items-center gap-3 rounded-lg bg-tenant-bright px-7 text-lg font-semibold text-navy shadow-[0_10px_30px_-12px_rgba(91,211,143,.7)] transition-colors hover:bg-white"
    >
      Get started free
      <ArrowRight className="size-5 transition-transform duration-300 ease-(--ease-out) group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

const tick = (
  <span className="grid size-5 place-items-center rounded-full bg-[#1b6b44] text-white">
    <Check className="size-3" strokeWidth={3.5} aria-hidden />
  </span>
);

const FAQ = [
  ["Does anything get booked without me?", "No. Tenly collects quotes and suggests one, but nothing is booked until you tap Approve."],
  ["Do my tenants need to download an app?", "No. Tenants can sign in through a browser or add Tenly to their phone’s Home Screen and use it like an app."],
  ["How does Tenly reach contractors?", "By text or email: your trusted list first, then well-rated pros nearby. They reply with a price and a time."],
  ["Is the legal checklist legal advice?", "No. It’s general information about your state’s rules, with sources, to help you act on time."],
];

export default function Home() {
  return (
    <div className="-mt-10 -mb-10">
      <SignedInRedirect />

      {/* Hero */}
      <section className={`${bleed} overflow-hidden bg-navy text-white`}>
        <div aria-hidden="true" className="glow-blob absolute -top-40 -right-32 size-[34rem] bg-[#1b6b44] opacity-70 blur-3xl" />
        <div aria-hidden="true" className="glow-blob absolute -bottom-48 -left-24 size-[28rem] bg-[#0c3b5c] opacity-80 blur-3xl [animation-delay:-6s]" />
        <div aria-hidden="true" className="gridlines absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-24">
          <div className="stagger">
            <h1 className="text-[3.1rem] leading-[0.98] font-bold sm:text-[4.4rem]">Repairs that run themselves.</h1>
            <p className="mt-7 max-w-[34rem] text-xl leading-relaxed text-white/75">
              Your tenant reports the problem. Tenly emails/texts local repair pros, collects prices and times, and checks your
              state’s rules. You say go, pick a quote, and everyone gets the date.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <PrimaryCta />
              <a
                href="#journey"
                className="inline-flex min-h-[3.6rem] items-center rounded-lg px-6 text-lg font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/10"
              >
                See one repair
              </a>
            </div>
            <p className="mt-6 text-[0.95rem] text-white/55">Free for 3 months on your first property · Works from any phone · No app to install</p>
          </div>

          {/* Product composite: landlord approval + tenant phone */}
          <div className="relative mx-auto w-full max-w-[34rem] animate-rise [animation-delay:200ms] sm:h-[33rem]">
            <div className="w-full rounded-xl border border-white/10 bg-white text-[#0b1220] shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)] sm:absolute sm:top-0 sm:right-0 sm:w-[23rem]">
              <div className="flex items-center justify-between border-b border-black/5 px-5 py-3 text-[0.8rem] text-[#535d6b]">
                <span>Approvals · 418 Maple St</span>
                <span>10:02 AM</span>
              </div>
              <div className="px-5 pt-4 pb-5">
                <p className="text-[0.8rem] font-medium text-[#535d6b]">Apt 3B · Jordan Lee · Urgent</p>
                <p className={`${heading} text-[1.35rem] font-semibold`}>Kitchen sink leaking</p>
                <table className="mt-4 w-full text-[0.9rem]">
                  <thead>
                    <tr className="text-left text-[0.72rem] tracking-wider text-[#535d6b] uppercase">
                      <th className="pb-1.5 font-medium">Pro</th>
                      <th className="pb-1.5 font-medium">When</th>
                      <th className="pb-1.5 text-right font-medium">Quote</th>
                    </tr>
                  </thead>
                  <tbody className="tabular">
                    <tr className="border-t border-black/5">
                      <td className="py-2">
                        <span className="font-semibold">Rapid Rooter</span>
                        <br />
                        <span className="text-[0.75rem] text-[#1b6b44]">On your trusted list</span>
                      </td>
                      <td className="py-2">Tue 10:00</td>
                      <td className="py-2 text-right font-semibold">$180</td>
                    </tr>
                    <tr className="border-t border-black/5">
                      <td className="py-2">
                        <span className="font-semibold">AquaFix</span>
                        <br />
                        <span className="text-[0.75rem] text-[#535d6b]">4.5 · 2.1 mi</span>
                      </td>
                      <td className="py-2">Thu 14:00</td>
                      <td className="py-2 text-right font-semibold">$150</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-3 rounded-md bg-[#e6f4fc] px-3 py-2 text-[0.8rem] text-[#0c3b5c]">
                  OH law: keep plumbing in working order. Booking this covers it.
                </p>
                <div className="mt-4 flex gap-2">
                  <span className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-[#0b1220] text-[0.95rem] font-semibold text-white">
                    Approve Rapid Rooter
                  </span>
                  <span className="inline-flex min-h-11 items-center rounded-lg px-4 text-[0.95rem] font-semibold ring-1 ring-black/10">
                    Decline
                  </span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 hidden w-[14.5rem] rounded-[2rem] border-[6px] border-navy-2 bg-white p-4 text-[#0b1220] shadow-[0_30px_60px_-15px_rgba(0,0,0,.7)] sm:block lg:-left-10">
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-black/10" />
              <p className="text-[0.72rem] font-medium text-[#535d6b]">Your repair</p>
              <p className={`${heading} text-base leading-tight font-semibold`}>Kitchen sink leaking</p>
              <ol className="mt-3 space-y-2.5 text-[0.78rem]">
                <li className="flex items-center gap-2">{tick}Sent <span className="ml-auto text-[#535d6b]">9:14</span></li>
                <li className="flex items-center gap-2">{tick}2 quotes in <span className="ml-auto text-[#535d6b]">9:31</span></li>
                <li className="flex items-center gap-2">{tick}Approved <span className="ml-auto text-[#535d6b]">10:02</span></li>
                <li className="flex items-center gap-2 font-semibold">
                  <span className="size-5 rounded-full border-2 border-[#1b6b44] bg-[#e4f2ea]" />
                  Booked · Tue 10 AM
                </li>
              </ol>
              <div className="mt-3 rounded-lg bg-[#f6f7f4] px-3 py-2 text-[0.75rem] leading-snug">
                Rapid Rooter is coming <b>Tue 10 AM</b>. We’ll text you the day before.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Journey */}
      <section id="journey" className={`${bleed} bg-navy pb-20 text-white`}>
        <div className="mx-auto max-w-6xl border-t border-navy-line px-5 pt-16 sm:px-8">
          <h2 className="text-4xl">One leak, 48 minutes, zero phone calls.</h2>
          <p className="mt-3 text-lg text-white/60">What happened between the tenant’s message and the landlord’s tap.</p>
        </div>
        <div className="mt-6">
          <JourneyTrack>
            <article className="w-[85vw] max-w-[30rem] shrink-0 rounded-xl border-t-4 border-tenant-bright bg-navy-2 p-7">
              <p className={`${heading} flex justify-between text-[0.95rem] text-tenant-bright`}>
                <span>Tenant</span>
                <span className="tabular text-white/50">9:14 AM</span>
              </p>
              <p className={`${heading} mt-3 text-3xl font-semibold`}>Reports it</p>
              <p className="mt-5 rounded-lg bg-white/[.06] p-4 text-lg leading-relaxed">
                “Water is dripping under the kitchen sink. There’s a puddle in the cabinet.”
              </p>
              <p className="mt-3 text-[0.9rem] text-white/55">Jordan Lee · Apt 3B · 1 photo attached</p>
            </article>
            <article className="w-[85vw] max-w-[30rem] shrink-0 rounded-xl border-t-4 border-[#f3a4ae] bg-navy-2 p-7">
              <p className={`${heading} flex justify-between text-[0.95rem] text-[#f3a4ae]`}>
                <span>Repair pros</span>
                <span className="tabular text-white/50">9:16 – 9:31 AM</span>
              </p>
              <p className={`${heading} mt-3 text-3xl font-semibold`}>Send quotes</p>
              <dl className="tabular mt-5 divide-y divide-white/10 rounded-lg bg-white/[.06] px-4 text-lg">
                <div className="flex justify-between py-3"><dt>Rapid Rooter · Tue 10:00</dt><dd className="font-semibold">$180</dd></div>
                <div className="flex justify-between py-3"><dt>AquaFix · Thu 14:00</dt><dd className="font-semibold">$150</dd></div>
                <div className="flex justify-between py-3 text-white/45"><dt>Drain Bros</dt><dd>No reply</dd></div>
              </dl>
            </article>
            <article className="w-[85vw] max-w-[30rem] shrink-0 rounded-xl border-t-4 border-[#9ad8f7] bg-navy-2 p-7">
              <p className={`${heading} flex justify-between text-[0.95rem] text-[#9ad8f7]`}>
                <span>Landlord</span>
                <span className="tabular text-white/50">10:02 AM</span>
              </p>
              <p className={`${heading} mt-3 text-3xl font-semibold`}>Picks the pro</p>
              <p className="mt-5 text-lg leading-relaxed text-white/80">
                Picks Rapid Rooter: on the trusted list and there two days sooner. The legal checklist is already ticked.
              </p>
              <span className="mt-5 inline-flex min-h-12 items-center rounded-lg bg-[#9ad8f7] px-5 font-semibold text-[#0c3b5c]">
                Approved · $180
              </span>
            </article>
            <article className="w-[85vw] max-w-[30rem] shrink-0 rounded-xl border-t-4 border-white bg-navy-2 p-7">
              <p className={`${heading} flex justify-between text-[0.95rem]`}>
                <span>Everyone</span>
                <span className="tabular text-white/50">10:02 AM</span>
              </p>
              <p className={`${heading} mt-3 text-3xl font-semibold`}>Gets the date</p>
              <ul className="mt-5 space-y-2.5 text-lg text-white/80">
                <li>Text to Jordan with the time</li>
                <li>Confirmation + calendar invite to the plumber</li>
                <li>Job added to the landlord’s calendar</li>
              </ul>
            </article>
          </JourneyTrack>
        </div>
      </section>

      {/* Landlords */}
      <section id="landlords" className="py-24">
        <h2 className="max-w-2xl text-[2.6rem] leading-[1.05] sm:text-[2.8rem]">Built for landlords who’d rather not chase plumbers.</h2>
        <div className="mt-14 grid gap-12 lg:grid-cols-2">
          <div>
            <h3 className={`${heading} text-2xl font-semibold`}>Your trusted pros go first</h3>
            <p className="mt-2 max-w-md text-lg text-muted">Keep a short list of the contractors you like. Tenly asks them before anyone new.</p>
            <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface">
              {[
                ["RR", "Rapid Rooter Plumbing", "Plumbing · (555) 201-3344", "12 jobs"],
                ["BS", "Bright Spark Electric", "Electrical · (555) 482-1190", "5 jobs"],
                ["CA", "CoolAir HVAC", "Heating & AC · (555) 330-7781", "3 jobs"],
              ].map(([initials, name, detail, jobs]) => (
                <li key={name} className="flex items-center gap-4 px-5 py-4">
                  <span className={`${heading} grid size-10 place-items-center rounded-lg bg-contractor-soft font-semibold text-contractor-ink`}>
                    {initials}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{name}</p>
                    <p className="text-[0.9rem] text-muted">{detail}</p>
                  </div>
                  <span className="text-[0.85rem] font-medium text-tenant-ink">{jobs}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className={`${heading} text-2xl font-semibold`}>The rules, in plain words</h3>
            <p className="mt-2 max-w-md text-lg text-muted">Every request comes with what your state expects and by when.</p>
            <div className="mt-6 rounded-xl border border-line bg-surface p-6">
              <p className="text-[0.8rem] font-medium text-muted">Ohio · Kitchen sink leaking</p>
              <ul className="mt-3 space-y-3 text-lg">
                {["Keep plumbing in good working order", "Fix within a reasonable time after notice"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-1 grid size-5 shrink-0 place-items-center rounded bg-tenant text-white dark:text-navy">
                      <Check className="size-3" strokeWidth={3.5} aria-hidden />
                    </span>
                    {t}
                  </li>
                ))}
                <li className="flex gap-3">
                  <span className="mt-1 size-5 shrink-0 rounded border-2 border-line-strong" />
                  Give 24 hours’ notice before entering
                </li>
              </ul>
              <p className="mt-4 border-t border-line pt-3 text-[0.8rem] text-muted">
                General information, not legal advice. Source: Ohio Rev. Code 5321.04
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={`${bleed} border-t border-line bg-surface`}>
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_1.6fr]">
          <h2 className="text-[2.6rem] leading-[1.05] sm:text-[2.8rem]">Questions landlords ask</h2>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map(([q, a], i) => (
              <details key={q} className="group py-5" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-xl font-semibold">
                  {q}
                  <span className="text-2xl text-muted transition-transform duration-300 group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-lg text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA + footer */}
      <section className={`${bleed} bg-navy text-white`}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8 px-5 py-16 sm:px-8">
          <h2 className="max-w-xl text-4xl leading-tight">Set up your first property in about two minutes.</h2>
          <PrimaryCta />
        </div>
      </section>
      <footer className={`${bleed} border-t border-navy-line bg-navy text-[0.92rem] text-white/60`}>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          <div>
            <p className={`${heading} text-xl font-bold text-white`}>Tenly</p>
            <p className="mt-3 max-w-[16rem]">Repairs for rental homes, from report to booked.</p>
          </div>
          <div>
            <p className="font-semibold text-white">Product</p>
            <ul className="mt-3 space-y-2">
              <li><a href="#journey" className="hover:text-white">How it works</a></li>
              <li><a href="#landlords" className="hover:text-white">For landlords</a></li>
              <li><Link href="/login" className="hover:text-white">For tenants</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">Help</p>
            <ul className="mt-3 space-y-2">
              <li><a href="#faq" className="hover:text-white">Questions</a></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">Account</p>
            <ul className="mt-3 space-y-2">
              <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
              <li><Link href="/login" className="hover:text-white">Create an account</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-6xl border-t border-navy-line px-5 py-6 text-[0.85rem] sm:px-8">© 2026 Tenly</div>
      </footer>
    </div>
  );
}
