"use client";

import { useEffect, useState } from "react";
import { landlordSession, landlordSupabase } from "@/lib/landlord";

type Lease = { id: string; name: string; unit: string; storagePath: string };

export default function LeasePage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [selected, setSelected] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [localUrl, setLocalUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void landlordSession().then(async (user) => {
      if (!user || !active) { if (active) setLoading(false); return; }
      const { data, error: loadError } = await landlordSupabase()!.from("leases").select("id,unit,file_url,properties!inner(address,landlord_id)").eq("properties.landlord_id", user.id).order("unit");
      if (!active) return;
      if (loadError) setError("Could not load leases. Check lease access and your sign-in.");
      else setLeases((data ?? []).filter((row) => row.file_url).map((row) => ({ id: row.id, unit: row.unit ?? "Unit", name: (row.properties as unknown as { address: string }).address, storagePath: row.file_url as string })));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    const lease = leases.find((item) => item.id === selected);
    if (!lease) return;
    void landlordSupabase()!.storage.from("leases").createSignedUrl(lease.storagePath, 3600).then(({ data, error: signedError }) => {
      if (!active) return;
      if (signedError || !data) setError("Could not open this lease. Check storage access.");
      else { setDocumentUrl(data.signedUrl); setError(""); }
    });
    return () => { active = false; };
  }, [selected, leases]);

  function previewLocal(file?: File) {
    if (localUrl) URL.revokeObjectURL(localUrl);
    if (!file) { setLocalUrl(""); return; }
    if (file.type !== "application/pdf") { setError("Choose a PDF lease to preview."); return; }
    setError(""); setSelected(""); setDocumentUrl("");
    setLocalUrl(URL.createObjectURL(file));
  }

  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);

  const url = localUrl || documentUrl;
  return <div className="space-y-6"><header><h1 className="text-3xl font-bold">Leases</h1><p className="mt-2 text-muted">Open a lease to check its terms while reviewing a repair.</p></header>
    {loading && <p role="status">Loading leases…</p>}{error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-danger-ink">{error}</p>}
    {leases.length > 0 && <label className="block max-w-lg font-semibold">Saved lease<select value={selected} onChange={(event) => { setSelected(event.target.value); setLocalUrl(""); setDocumentUrl(""); }} className="mt-2 w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-base text-fg"><option value="">Choose a lease</option>{leases.map((lease) => <option key={lease.id} value={lease.id}>{lease.unit} · {lease.name}</option>)}</select></label>}
    <div className="rounded-xl border border-landlord-edge/40 bg-landlord-soft p-5"><h2 className="text-lg font-bold">Preview a PDF from this computer</h2><p className="mt-1 text-sm text-muted">This preview stays on your device and is not uploaded or shared.</p><label htmlFor="local-lease" className="mt-3 block font-semibold">Choose lease PDF</label><input id="local-lease" type="file" accept="application/pdf,.pdf" onChange={(event) => previewLocal(event.target.files?.[0])} className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-3 file:font-semibold file:text-on-accent" /></div>
    {url ? <div className="space-y-3"><a href={url} target="_blank" rel="noreferrer" className="font-semibold text-landlord-ink underline">Open lease in a new tab</a><iframe title="Lease preview" src={url} className="h-[38rem] w-full rounded-xl border border-line-strong bg-surface" /></div> : !loading && <p className="rounded-xl border border-dashed border-line-strong p-6 text-muted">No lease selected. Choose a saved lease or preview a PDF from your computer.</p>}
  </div>;
}
