import Link from "next/link";

const STEPS = [
  { emoji: "📝", title: "Tenant reports it", body: "Describe the problem in plain words: a leaky sink, a dead outlet, no heat." },
  { emoji: "🤖", title: "AI finds a contractor", body: "We figure out the trade and urgency, then line up an available contractor with a quote." },
  { emoji: "✅", title: "Landlord taps approve", body: "One summary, one button. The job gets booked and the tenant is kept in the loop." },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="space-y-6 pt-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Maintenance requests, handled.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600">
          Tenants report issues, AI finds an available contractor, and the landlord only has to hit approve.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/tenant"
            className="rounded-lg bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-700"
          >
            I&apos;m a tenant
          </Link>
          <Link
            href="/landlord"
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-900 hover:bg-slate-100"
          >
            I&apos;m a landlord
          </Link>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="text-3xl">{s.emoji}</div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Step {i + 1}</p>
            <h2 className="mt-1 font-semibold">{s.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{s.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
