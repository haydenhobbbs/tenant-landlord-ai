"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { formatPrice } from "@/lib/format";

type Lease = { id: string; tenantName: string; unit: string; address: string; city: string; state: string; rent: number; start?: string; end?: string };

export default function LeasePage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [selected, setSelected] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [localUrl, setLocalUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Leases come from the server (it checks you're the landlord); each PDF is
  // generated from the saved lease, so it always matches the rent and rules.
  useEffect(() => {
    let active = true;
    authFetch("/api/leases", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<Lease[]>) : Promise.reject()))
      .then((data) => {
        if (!active) return;
        setLeases(data);
        if (data.length === 1) setSelected(data[0].id); // one lease: open it right away
      })
      .catch(() => active && setError("Could not load leases. Refresh to try again."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    let objectUrl = "";
    authFetch(`/api/leases/${encodeURIComponent(selected)}/document`, { cache: "no-store" })
      .then((res) => (res.ok ? res.blob() : Promise.reject()))
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setDocumentUrl(objectUrl);
        setError("");
      })
      .catch(() => active && setError("Could not open this lease. Try again."));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [selected]);

  function previewLocal(file?: File) {
    if (localUrl) URL.revokeObjectURL(localUrl);
    if (!file) { setLocalUrl(""); return; }
    if (file.type !== "application/pdf") { setError("Choose a PDF lease to preview."); return; }
    setError(""); setSelected(""); setDocumentUrl("");
    setLocalUrl(URL.createObjectURL(file));
  }

  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);

  const url = localUrl || documentUrl;
  return <div className="space-y-6"><header><h1 className="text-3xl font-bold md:text-[2.6rem] md:leading-tight md:font-semibold">Leases</h1><p className="mt-2 text-muted md:max-w-3xl md:text-lg">Open a lease to check its terms while reviewing a repair.</p></header>
    {loading && <p role="status">Loading leases…</p>}{error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-danger-ink">{error}</p>}
    {leases.length > 0 && <label className="block max-w-lg font-semibold">Saved lease<select value={selected} onChange={(event) => { setSelected(event.target.value); setLocalUrl(""); setDocumentUrl(""); }} className="mt-2 w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-base text-fg"><option value="">Choose a lease</option>{leases.map((lease) => <option key={lease.id} value={lease.id}>{lease.tenantName} · {lease.address}{lease.unit ? `, ${lease.unit}` : ""}</option>)}</select></label>}
    {(() => { const l = leases.find((x) => x.id === selected); return l && !localUrl ? <dl className="grid max-w-3xl gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-4"><div><dt className="text-sm text-muted">Tenant</dt><dd className="font-bold">{l.tenantName}</dd></div><div><dt className="text-sm text-muted">Home</dt><dd className="font-bold">{l.address}{l.unit ? `, ${l.unit}` : ""}</dd></div><div><dt className="text-sm text-muted">Rent</dt><dd className="font-bold">{formatPrice(l.rent)}/month</dd></div><div><dt className="text-sm text-muted">Term</dt><dd className="font-bold">{l.start && l.end ? `${new Date(l.start + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })} – ${new Date(l.end + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}` : "Not set"}</dd></div></dl> : null; })()}
    <div className="rounded-xl border border-landlord-edge/40 bg-landlord-soft p-5"><h2 className="text-lg font-bold">Preview a PDF from this computer</h2><p className="mt-1 text-sm text-muted">This preview stays on your device and is not uploaded or shared.</p><label htmlFor="local-lease" className="mt-3 block font-semibold">Choose lease PDF</label><input id="local-lease" type="file" accept="application/pdf,.pdf" onChange={(event) => previewLocal(event.target.files?.[0])} className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-3 file:font-semibold file:text-on-accent" /></div>
    {url ? <div className="space-y-3"><a href={url} target="_blank" rel="noreferrer" className="font-semibold text-landlord-ink underline">Open lease in a new tab</a><iframe title="Lease preview" src={url} className="h-[38rem] w-full rounded-xl border border-line-strong bg-surface" /></div> : !loading && <p className="rounded-xl border border-dashed border-line-strong p-6 text-muted">No lease selected. Choose a saved lease or preview a PDF from your computer.</p>}
  </div>;
}
