"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useLandlordRequests } from "@/lib/useLandlordRequests";
import { formatDateTime } from "@/lib/format";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarContent() {
  const { requests, loading, error, reload } = useLandlordRequests();
  const [month, setMonth] = useState(() => { const today = new Date(); return new Date(today.getFullYear(), today.getMonth(), 1); });
  const [now] = useState(() => Date.now());
  const jobs = requests.flatMap((request) => {
    if (request.status !== "scheduled" && request.status !== "landlord_approved") return [];
    const date = request.scheduledAt ?? request.selected?.availableAt;
    return date ? [{ request, date, confirmed: request.status === "scheduled" }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date));
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => index - firstDay + 1);
  const sameDay = (date: string, day: number) => { const value = new Date(date); return value.getFullYear() === month.getFullYear() && value.getMonth() === month.getMonth() && value.getDate() === day; };
  const upcoming = jobs.filter((job) => new Date(job.date).getTime() >= now);

  return <div className="space-y-6"><header><h1 className="text-3xl font-bold">Jobs calendar</h1><p className="mt-2 text-slate-600 dark:text-slate-300">See approved visits and confirmed appointments in one place.</p></header>
    <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">Approved requests show the contractor’s proposed time. The appointment is confirmed only after the contractor accepts it.</p>
    {loading && <p role="status">Loading jobs…</p>}{error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-900"><p>{error}</p><button type="button" onClick={() => void reload()} className="mt-2 font-semibold underline">Try again</button></div>}
    <section aria-label="Month calendar" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6"><div className="flex items-center justify-between gap-3"><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="min-h-11 rounded-lg border border-slate-300 px-4 text-xl font-bold hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 dark:border-slate-600 dark:hover:bg-slate-800">‹</button><h2 className="text-xl font-bold">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="min-h-11 rounded-lg border border-slate-300 px-4 text-xl font-bold hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 dark:border-slate-600 dark:hover:bg-slate-800">›</button></div>
      <div role="grid" aria-label={month.toLocaleDateString(undefined, { month: "long", year: "numeric" })} className="mt-5 grid grid-cols-7 gap-1 sm:gap-2">{weekdays.map((day) => <div key={day} role="columnheader" className="py-2 text-center text-xs font-bold text-slate-500 sm:text-sm">{day}</div>)}{cells.map((day, index) => { const dayJobs = day > 0 && day <= daysInMonth ? jobs.filter((job) => sameDay(job.date, day)) : []; return <div key={index} role="gridcell" aria-label={day > 0 && day <= daysInMonth ? `${month.toLocaleDateString(undefined, { month: "long" })} ${day}, ${dayJobs.length} jobs` : "Outside current month"} className={`min-h-16 min-w-0 overflow-hidden rounded-lg border p-1 sm:min-h-24 sm:p-2 ${day > 0 && day <= daysInMonth ? "border-slate-200 dark:border-slate-700" : "border-transparent bg-slate-50 dark:bg-slate-800"}`}>{day > 0 && day <= daysInMonth && <><span className="text-sm font-semibold">{day}</span>{dayJobs.length > 0 && <span className="mt-1 block rounded bg-sky-100 px-1 py-0.5 text-xs font-bold text-sky-900 dark:bg-sky-900 dark:text-white"><span className="sm:hidden">{dayJobs.length}</span><span className="hidden sm:inline">{dayJobs.length} {dayJobs.length === 1 ? "job" : "jobs"}</span></span>}</>}</div>; })}</div>
    </section>
    <section aria-labelledby="job-list"><h2 id="job-list" className="text-xl font-bold">Upcoming jobs</h2>{upcoming.length === 0 ? <p className="mt-3 rounded-xl border border-dashed p-5 text-slate-600 dark:text-slate-300">No upcoming jobs yet. Approved requests will appear here.</p> : <ul className="mt-3 space-y-3">{upcoming.map(({ request, date, confirmed }) => <li key={request.id}><Link href={`/landlord/requests/${encodeURIComponent(request.id)}`} className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-sky-400 focus-visible:outline focus-visible:outline-2 dark:border-slate-700 dark:bg-slate-900"><p className="text-lg font-bold">{request.title} · {request.unit}</p><p className="mt-1 text-slate-600 dark:text-slate-300">{formatDateTime(date)} · {request.selected?.contractor.name ?? "Contractor pending"}</p><p className="mt-1 text-sm font-semibold text-sky-800 dark:text-sky-200">{confirmed ? "Confirmed" : "Approved · waiting for confirmation"}</p></Link></li>)}</ul>}</section>
  </div>;
}

export default function CalendarPage() { return <Suspense fallback={<p role="status">Loading calendar…</p>}><CalendarContent /></Suspense>; }
