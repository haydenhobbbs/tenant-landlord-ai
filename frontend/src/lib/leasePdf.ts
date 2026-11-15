// Builds a lease PDF from the lease saved in the database (server-side only).
// No file upload needed: the document always matches the saved rent, dates and
// rules. Used by GET /api/leases/:id/document.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { supabase } from "./store";

export interface LeaseRecord {
  id: string;
  tenantId: string | null;
  landlordId: string;
  tenantName: string;
  landlordName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  unit: string;
  rent: number;
  dueDay: number;
  deposit: number;
  start?: string;
  end?: string;
  terms: { title: string; body: string }[];
}

type LeaseRow = {
  id: string; tenant_id: string | null; unit: string | null; rent_amount: number | null; rent_due_day: number | null;
  security_deposit: number | null; start_date: string | null; end_date: string | null;
  terms: { title: string; body: string }[] | null;
  tenant: { name: string } | { name: string }[] | null;
  properties: { address: string; city: string; state: string; zip: string; landlord_id: string; landlord: { name: string } | { name: string }[] | null } | null;
};

const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);

const SELECT = "id, tenant_id, unit, rent_amount, rent_due_day, security_deposit, start_date, end_date, terms, tenant:profiles(name), properties(address, city, state, zip, landlord_id, landlord:profiles(name))";

function toRecord(r: LeaseRow): LeaseRecord | undefined {
  const p = r.properties;
  if (!p) return undefined;
  return {
    id: r.id, tenantId: r.tenant_id, landlordId: p.landlord_id,
    tenantName: one(r.tenant)?.name || "Tenant", landlordName: one(p.landlord)?.name || "Landlord",
    address: p.address, city: p.city, state: p.state, zip: p.zip, unit: r.unit ?? "",
    rent: Number(r.rent_amount ?? 0), dueDay: r.rent_due_day ?? 1, deposit: Number(r.security_deposit ?? 0),
    start: r.start_date ?? undefined, end: r.end_date ?? undefined, terms: r.terms ?? [],
  };
}

export async function getLeaseRecord(id: string): Promise<LeaseRecord | undefined> {
  if (!supabase) return undefined;
  const { data, error } = await supabase.from("leases").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toRecord(data as unknown as LeaseRow) : undefined;
}

/** Every lease on the landlord's properties. */
export async function listLandlordLeases(landlordId: string): Promise<LeaseRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("leases").select(SELECT.replace("properties(", "properties!inner(")).eq("properties.landlord_id", landlordId);
  if (error) throw error;
  return ((data ?? []) as unknown as LeaseRow[]).map(toRecord).filter((x): x is LeaseRecord => !!x);
}

// ---------- PDF ----------

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const longDate = (iso?: string) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "________________";
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
// The built-in PDF fonts only cover basic Latin, so swap fancy punctuation.
const clean = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "");

export async function buildLeasePdf(l: LeaseRecord): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Residential Lease - ${l.address}${l.unit ? `, ${l.unit}` : ""}`);
  pdf.setAuthor(clean(l.landlordName));
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 612, H = 792, M = 64, maxW = W - M * 2;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;
  const ink = rgb(0.1, 0.12, 0.16), muted = rgb(0.38, 0.4, 0.45), green = rgb(0.13, 0.38, 0.25);

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < M) { page = pdf.addPage([W, H]); y = H - M; }
  };
  const wrap = (text: string, font: PDFFont, size: number, width = maxW) => {
    const words = clean(text).split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = w; } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  const para = (text: string, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gap?: number; indent?: number } = {}) => {
    const font = opts.font ?? regular, size = opts.size ?? 10.5, lh = size * 1.45, indent = opts.indent ?? 0;
    for (const line of wrap(text, font, size, maxW - indent)) {
      newPageIfNeeded(lh);
      page.drawText(line, { x: M + indent, y, size, font, color: opts.color ?? ink });
      y -= lh;
    }
    y -= opts.gap ?? 6;
  };
  const heading = (text: string) => { y -= 6; newPageIfNeeded(30); para(text.toUpperCase(), { font: bold, size: 10.5, color: green, gap: 4 }); };

  // Title
  para("RESIDENTIAL LEASE AGREEMENT", { font: bold, size: 18, gap: 2 });
  para(`${l.address}${l.unit ? `, ${l.unit}` : ""}, ${l.city}, ${l.state} ${l.zip}`, { size: 11, color: muted, gap: 10 });
  page.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 1, color: green });
  y -= 14;

  heading("1. Parties");
  para(`This Residential Lease Agreement ("Lease") is made between ${l.landlordName} ("Landlord") and ${l.tenantName} ("Tenant").`);

  heading("2. Premises");
  para(`Landlord rents to Tenant the residence at ${l.address}${l.unit ? `, ${l.unit}` : ""}, ${l.city}, ${l.state} ${l.zip} (the "Premises"), for use as a private residence only.`);

  heading("3. Term");
  para(`The Lease begins on ${longDate(l.start)} and ends on ${longDate(l.end)}. After that date it continues month-to-month unless either party gives written notice as described below.`);

  heading("4. Rent");
  para(`Monthly rent is ${money(l.rent)}, due on the ${ordinal(l.dueDay)} day of each month. Rent may be paid by bank transfer or another method the Landlord approves in writing.`);

  heading("5. Security Deposit");
  para(`Tenant pays a security deposit of ${money(l.deposit)} before move-in. Landlord returns the deposit, less any itemized deductions for unpaid rent or damage beyond normal wear and tear, within the time required by ${l.state} law.`);

  heading("6. Maintenance and Repairs");
  para("Tenant keeps the Premises clean and promptly reports any needed repairs through the Tenly app. Landlord keeps the Premises in habitable condition and arranges repairs not caused by Tenant, Tenant's guests, or pets. Urgent problems that threaten health or safety are handled as emergencies.");

  if (l.terms.length) {
    heading("7. Key Rules");
    for (const t of l.terms) {
      newPageIfNeeded(30);
      para(t.title, { font: bold, size: 10.5, gap: 0 });
      para(t.body, { indent: 0, gap: 6 });
    }
  }

  heading(`${l.terms.length ? 8 : 7}. Entire Agreement`);
  para(`This Lease is the entire agreement between the parties. Changes must be in writing and signed by both parties. This Lease is governed by the laws of the State of ${l.state}.`);

  // Signatures
  y -= 14;
  newPageIfNeeded(110);
  const signedOn = longDate(l.start ? new Date(new Date(`${l.start}T12:00:00Z`).getTime() - 14 * 864e5).toISOString().slice(0, 10) : undefined);
  const col = (x: number, role: string, name: string) => {
    page.drawText(clean(name), { x, y: y - 2, size: 15, font: regular, color: rgb(0.1, 0.2, 0.45) });
    page.drawLine({ start: { x, y: y - 8 }, end: { x: x + 210, y: y - 8 }, thickness: 0.8, color: muted });
    page.drawText(`${role}: ${clean(name)}`, { x, y: y - 22, size: 9.5, font: bold, color: ink });
    page.drawText(`Signed electronically on ${signedOn}`, { x, y: y - 35, size: 8.5, font: regular, color: muted });
  };
  col(M, "Landlord", l.landlordName);
  col(M + 250, "Tenant", l.tenantName);
  y -= 50;

  // Footer on every page
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Lease ${l.id.slice(0, 8).toUpperCase()}  |  Page ${i + 1} of ${pages.length}`, { x: M, y: 36, size: 8, font: regular, color: muted });
  });

  return pdf.save();
}
