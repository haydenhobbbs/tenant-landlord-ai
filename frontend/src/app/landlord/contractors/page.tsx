"use client";

import { useEffect, useRef, useState } from "react";
import { landlordSession, landlordSupabase, localPreferredContractors, saveLocalPreferredContractors, type PreferredContractor } from "@/lib/landlord";
import type { Trade } from "@/lib/types";

const trades: Trade[] = ["plumbing", "electrical", "hvac", "appliance", "pest", "general"];
const emptyForm: PreferredContractor = { id: "", name: "", trade: "plumbing", phone: "", email: "", notes: "" };
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

export default function ContractorsPage() {
  const [items, setItems] = useState<PreferredContractor[]>([]);
  const [form, setForm] = useState<PreferredContractor>(emptyForm);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [removeId, setRemoveId] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const user = await landlordSession();
      if (!active) return;
      if (!user) { setItems(localPreferredContractors()); setLoading(false); return; }
      setOwnerId(user.id);
      const { data, error: loadError } = await landlordSupabase()!.from("contractors").select("id,name,trade,phone,email,notes").eq("landlord_id", user.id).order("name");
      if (!active) return;
      if (loadError) setError("Could not load trusted contractors. Check that the landlord tables are set up.");
      else setItems((data ?? []).map((row) => ({ id: row.id, name: row.name, trade: row.trade as Trade, phone: row.phone ?? "", email: row.email ?? "", notes: row.notes ?? "" })));
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  function update<K extends keyof PreferredContractor>(key: K, value: PreferredContractor[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    if (key === "name" || key === "phone" || key === "email") setFieldErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setNotice("");
    const validation = {
      name: form.name.trim() ? undefined : "Enter the contractor's name.",
      phone: form.phone.trim() ? undefined : "Enter a phone number.",
      email: form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? "Enter a valid email address or leave this blank." : undefined,
    };
    setFieldErrors(validation);
    if (validation.name || validation.phone || validation.email) { setError("Check the highlighted fields."); (validation.name ? nameRef : validation.phone ? phoneRef : emailRef).current?.focus(); return; }
    setBusy(true);
    const value = { ...form, id: form.id || crypto.randomUUID(), name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), notes: form.notes.trim() };
    if (ownerId) {
      const { error: saveError } = await landlordSupabase()!.from("contractors").upsert({ ...value, landlord_id: ownerId });
      if (saveError) { setError("Could not save this contractor. Please try again."); setBusy(false); return; }
    }
    const next = [...items.filter((item) => item.id !== value.id), value].sort((a, b) => a.name.localeCompare(b.name));
    setItems(next);
    if (!ownerId) saveLocalPreferredContractors(next);
    setForm(emptyForm);
    setFieldErrors({});
    setNotice("Trusted contractor saved.");
    setBusy(false);
    nameRef.current?.focus();
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    if (ownerId) {
      const { error: removeError } = await landlordSupabase()!.from("contractors").delete().eq("id", id).eq("landlord_id", ownerId);
      if (removeError) { setError("Could not remove this contractor. Please try again."); setBusy(false); return; }
    }
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    if (!ownerId) saveLocalPreferredContractors(next);
    if (form.id === id) setForm(emptyForm);
    setRemoveId(null);
    setNotice("Trusted contractor removed.");
    setBusy(false);
  }

  return <div className="space-y-7"><header><h1 className="text-3xl font-bold">Trusted contractors</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Keep your preferred contacts here. The matching service can try them first once the team connects this list.</p></header>
    {!ownerId && !loading && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">Local preview: these contacts are saved only in this browser until landlord sign-in is connected.</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-900 dark:bg-rose-950 dark:text-rose-100">{error}</p>}{notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">{notice}</p>}
    <div className="grid gap-7 lg:grid-cols-[1.1fr_1fr]"><section aria-labelledby="trusted-list"><h2 id="trusted-list" className="text-xl font-bold">Your list</h2>{loading ? <p role="status" className="mt-4">Loading contractors…</p> : items.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-slate-600 dark:text-slate-300">No trusted contractors yet. Add one using the form.</p> : <ul className="mt-4 space-y-3">{items.map((item) => <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-bold">{item.name}</h3><p className="capitalize text-slate-600 dark:text-slate-300">{item.trade} · {item.phone}</p>{item.email && <p className="text-sm">{item.email}</p>}{item.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.notes}</p>}</div><div className="flex gap-2 self-start"><button type="button" onClick={() => { setForm(item); nameRef.current?.focus(); }} className="min-h-11 rounded-lg border border-slate-300 px-3 font-semibold hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 dark:border-slate-600 dark:hover:bg-slate-800">Edit</button><button type="button" onClick={() => setRemoveId(item.id)} className="min-h-11 rounded-lg border border-rose-300 px-3 font-semibold text-rose-800 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 dark:text-rose-200 dark:hover:bg-rose-950">Remove</button></div></div>{removeId === item.id && <div className="mt-4 rounded-lg bg-rose-50 p-4 dark:bg-rose-950"><p className="font-semibold">Remove {item.name} from your trusted list?</p><div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => void remove(item.id)} className="rounded-lg bg-rose-800 px-4 py-2 font-semibold text-white disabled:opacity-60">Remove contractor</button><button type="button" onClick={() => setRemoveId(null)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">Cancel</button></div></div>}</li>)}</ul>}</section>
      <section aria-labelledby="contractor-form" className="rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-800 dark:bg-sky-950"><h2 id="contractor-form" className="text-xl font-bold">{form.id ? "Edit contractor" : "Add a contractor"}</h2><form noValidate onSubmit={(event) => void save(event)} className="mt-4 space-y-4"><label className="block font-semibold">Name<input ref={nameRef} value={form.name} onChange={(event) => update("name", event.target.value)} className={`mt-1 ${field}`} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? "contractor-name-error" : undefined} /></label>{fieldErrors.name && <p id="contractor-name-error" className="text-sm text-rose-800 dark:text-rose-200">{fieldErrors.name}</p>}<label className="block font-semibold">Trade<select value={form.trade} onChange={(event) => update("trade", event.target.value as Trade)} className={`mt-1 ${field}`}>{trades.map((trade) => <option key={trade} value={trade}>{trade}</option>)}</select></label><label className="block font-semibold">Phone<input ref={phoneRef} type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} className={`mt-1 ${field}`} aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? "contractor-phone-error" : undefined} /></label>{fieldErrors.phone && <p id="contractor-phone-error" className="text-sm text-rose-800 dark:text-rose-200">{fieldErrors.phone}</p>}<label className="block font-semibold">Email (optional)<input ref={emailRef} type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className={`mt-1 ${field}`} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "contractor-email-error" : undefined} /></label>{fieldErrors.email && <p id="contractor-email-error" className="text-sm text-rose-800 dark:text-rose-200">{fieldErrors.email}</p>}<label className="block font-semibold">Notes (optional)<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className={`mt-1 min-h-28 resize-none ${field}`} placeholder="Preferred hours, service area, or other details" /></label><div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className="min-h-12 rounded-xl bg-sky-900 px-5 font-bold text-white hover:bg-sky-800 disabled:opacity-60">{busy ? "Saving…" : "Save contractor"}</button>{form.id && <button type="button" onClick={() => { setForm(emptyForm); setFieldErrors({}); }} className="rounded-xl border border-slate-300 px-5 font-semibold">Cancel edit</button>}</div></form></section></div>
  </div>;
}
