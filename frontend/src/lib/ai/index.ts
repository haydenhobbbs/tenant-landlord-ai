// 🤖 AI BRAIN (owner: Hayden)
//
// Five functions the rest of the app calls. Each one asks Claude for
// structured JSON, and falls back to simple rules (./fallback.ts) when there's
// no ANTHROPIC_API_KEY or a call fails.

import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { askClaude, withFallback } from "./claude";
import {
  DISCLAIMER,
  fakeLegalGuidance,
  fakeOutreach,
  fakeRank,
  fakeReadReply,
  fakeReason,
  fakeTriage,
} from "./fallback";
import type {
  ContactChannel,
  Contractor,
  ContractorOffer,
  LegalGuidance,
  MaintenanceRequest,
  Trade,
  Urgency,
} from "../types";

const TRADES = ["plumbing", "electrical", "hvac", "appliance", "pest", "general"] as const;
const URGENCIES = ["low", "medium", "high", "emergency"] as const;

// ---------------------------------------------------------------------------
// 1. Understand the tenant's message (+ photos) -> trade + urgency
// ---------------------------------------------------------------------------

const TriageSchema = z.object({
  trade: z.enum(TRADES),
  urgency: z.enum(URGENCIES),
});

const TRIAGE_SYSTEM = `You sort rental-property maintenance requests for a property-management app.

Pick the ONE trade that should handle the job:
- plumbing: leaks, clogs, toilets, faucets, water heaters, pipes, and any gas smell or gas line issue (gas lines need a licensed plumber)
- electrical: outlets, switches, breakers, wiring, light fixtures
- hvac: heating, air conditioning, furnaces, thermostats, ventilation
- appliance: fridge, oven/stove, dishwasher, washer/dryer, microwave, garbage disposal
- pest: insects, rodents, termites, bed bugs
- general: anything else (doors, locks, windows, drywall, flooring, etc.)

Set urgency from what is actually described, not just what the tenant picked:
- emergency: immediate danger or major damage (gas smell, flooding, sparking/burning smell, no heat in freezing weather, sewage backup, no working toilet in the unit, broken exterior lock)
- high: affects health or habitability but not immediately dangerous (active leak, no hot water, AC out in extreme heat, fridge not cooling)
- medium: a working feature is broken but the unit is livable
- low: cosmetic or minor
You may raise or lower the tenant's chosen urgency if the description clearly supports it.`;

export async function triageRequest(
  request: Pick<MaintenanceRequest, "title" | "description" | "urgency" | "photos">,
): Promise<{ trade: Trade; urgency: Urgency }> {
  return withFallback(
    "triageRequest",
    async () => {
      const photos: Anthropic.Beta.BetaContentBlockParam[] = (request.photos ?? [])
        .filter((url) => /^https?:\/\//.test(url))
        .slice(0, 4)
        .map((url) => ({ type: "image", source: { type: "url", url } }));
      return askClaude({
        system: TRIAGE_SYSTEM,
        schema: TriageSchema,
        content: [
          ...photos,
          {
            type: "text",
            text: `Tenant's request:\nTitle: ${request.title}\nDetails: ${request.description}\nUrgency the tenant picked: ${request.urgency}`,
          },
        ],
      });
    },
    () => fakeTriage(request),
  );
}

// ---------------------------------------------------------------------------
// 2. What the AI says when it texts / emails / calls a contractor
// ---------------------------------------------------------------------------

const OutreachSchema = z.object({ message: z.string() });

const OUTREACH_SYSTEM = `You write messages to local contractors on behalf of a property manager, to book a repair.

Rules:
- Be brief, friendly and professional. Sound like a real person, not a bot.
- Say what the job is in plain words, the trade, how urgent it is, and the city (never the street address or the tenant's name).
- Ask three things: are they available, their earliest date and time, and a rough price.
- Make replying easy: ask them to reply with YES plus a time and price, or NO.
- sms: under 320 characters, no greeting fluff, no emojis.
- email: start with "Subject: ..." on the first line, then a short email (under 120 words), signed "Property Management Team".
- call: a short phone script (under 80 words) the caller reads aloud, ending with the three questions.`;

export async function writeOutreachMessage(
  request: MaintenanceRequest,
  contractor: Contractor,
  channel: ContactChannel,
): Promise<string> {
  return withFallback(
    "writeOutreachMessage",
    async () => {
      const where = request.property?.city ? `${request.property.city}, ${request.property.state}` : "unknown city";
      const { message } = await askClaude({
        system: OUTREACH_SYSTEM,
        schema: OutreachSchema,
        content: `Channel: ${channel}\nContractor: ${contractor.name} (${contractor.trade})\nJob: ${request.title}\nDetails: ${request.description}\nTrade: ${request.trade ?? "general"}\nUrgency: ${request.urgency}\nLocation: ${where}`,
      });
      return message;
    },
    () => fakeOutreach(request, contractor.name, channel),
  );
}

// ---------------------------------------------------------------------------
// 3. Read a contractor's reply ("Yes, Tue 10am, $180") -> structured answer
// ---------------------------------------------------------------------------

const ReplySchema = z.object({
  available: z.boolean(),
  availableAt: z.string().nullable(), // ISO 8601 with offset, or null
  price: z.number().nullable(), // USD, or null
});

export async function readContractorReply(
  reply: string,
  opts: { now?: Date; timeZone?: string } = {},
): Promise<Pick<ContractorOffer, "available" | "availableAt" | "price">> {
  const now = opts.now ?? new Date();
  const timeZone = opts.timeZone ?? "America/Chicago";
  return withFallback(
    "readContractorReply",
    async () => {
      const r = await askClaude({
        system: `You read a contractor's reply to a job request and extract structured data.
- available: true only if they clearly say they can take the job.
- availableAt: the earliest date/time they offered, as an ISO 8601 timestamp with the correct UTC offset for the ${timeZone} time zone. Resolve relative dates ("tomorrow", "Tue") against the current time given. null if they gave no time.
- price: their quoted price in US dollars as a number. If they gave a range, use the higher end. null if no price.`,
        schema: ReplySchema,
        content: `Current time: ${now.toLocaleString("en-US", { timeZone, dateStyle: "full", timeStyle: "short" })} (${timeZone})\n\nContractor's reply:\n${reply}`,
      });
      const at = r.availableAt && !Number.isNaN(Date.parse(r.availableAt)) ? new Date(r.availableAt).toISOString() : undefined;
      return { available: r.available, availableAt: at, price: r.price ?? undefined };
    },
    () => fakeReadReply(reply),
  );
}

// ---------------------------------------------------------------------------
// 4. Rank the offers (best first) and explain each to the landlord
// ---------------------------------------------------------------------------

const RankSchema = z.object({
  ranking: z.array(z.object({ index: z.number().int(), reason: z.string() })),
});

const RANK_SYSTEM = `You help a landlord choose a contractor for a repair. Many landlords are older and not technical, so write plainly.

Rank the available contractors best-first. Weigh, roughly in this order:
1. Whether they're on the landlord's trusted (pre-approved) list
2. How soon they can come, especially for high or emergency urgency
3. Price
4. Rating

For each, write one short reason (under 15 words) a landlord would understand, e.g. "On your trusted list and can come tomorrow morning." Don't use jargon or mention "AI".
Return every contractor index exactly once.`;

export async function rankOffers(
  request: MaintenanceRequest,
  offers: Omit<ContractorOffer, "aiReason">[],
): Promise<ContractorOffer[]> {
  const available = offers.filter((o) => o.available);
  if (available.length === 0) return [];
  return withFallback(
    "rankOffers",
    async () => {
      const list = available
        .map(
          (o, i) =>
            `[${i}] ${o.contractor.name} | ${o.contractor.source === "preapproved" ? "TRUSTED LIST" : "found online"} | rating: ${o.contractor.rating ?? "unknown"} | price: ${o.price != null ? `$${o.price}` : "not given"} | earliest: ${o.availableAt ?? "not given"}`,
        )
        .join("\n");
      const { ranking } = await askClaude({
        system: RANK_SYSTEM,
        schema: RankSchema,
        effort: "medium",
        content: `Repair: ${request.title} (${request.trade ?? "general"}, urgency: ${request.urgency})\nCurrent time: ${new Date().toISOString()}\n\nContractors:\n${list}`,
      });
      // Map back to offers; ignore bad indices and append any Claude skipped.
      const seen = new Set<number>();
      const ranked: ContractorOffer[] = [];
      for (const { index, reason } of ranking) {
        if (index >= 0 && index < available.length && !seen.has(index)) {
          seen.add(index);
          ranked.push({ ...available[index], aiReason: reason });
        }
      }
      available.forEach((o, i) => {
        if (!seen.has(i)) ranked.push({ ...o, aiReason: fakeReason(o) });
      });
      return ranked;
    },
    () => fakeRank(available),
  );
}

// ---------------------------------------------------------------------------
// 5. Legal guidance for the landlord (location + issue), with real sources
// ---------------------------------------------------------------------------

const LegalSchema = z.object({
  summary: z.string(),
  mustDo: z.array(z.object({ action: z.string(), deadline: z.string().nullable() })),
  sources: z.array(z.object({ title: z.string(), url: z.string().nullable() })),
});

const LEGAL_SYSTEM = `You help small landlords handle tenant repair requests lawfully. Your reader is often 40-60 years old and not a lawyer, so write in short, plain sentences with no legal jargon.

Use web search to check the landlord-tenant rules that actually apply to this property: federal (e.g. Fair Housing, lead/habitability basics where relevant), the state's landlord-tenant statute, and city or county rules if the city has its own (e.g. a housing code or required notice period). Prefer official sources (state legislature, .gov sites, city code) over blogs.

Return:
- summary: at most 2 short sentences (under 45 words total) on what kind of issue this is legally (e.g. health/safety vs routine) and the main obligation.
- mustDo: 3-5 concrete steps in order. Keep each action under 15 words. deadline: a short phrase like "Today", "Within 24 hours", or "Within 7 days (Texas presumes this is reasonable)" - under 12 words; use null when there is no deadline (never write "None"). Always include giving the tenant notice before entering, with the actual notice period for this state/city if one exists, or "per your lease" if the law sets none.
- sources: the specific statutes or official pages you relied on, with URLs.

Never invent a statute number or deadline. If the law doesn't set a specific deadline, say "Within a reasonable time" and say so in the summary. Do not give advice beyond the repair and entry obligations.`;

export async function getLegalGuidance(request: MaintenanceRequest): Promise<LegalGuidance> {
  return withFallback(
    "getLegalGuidance",
    async () => {
      const p = request.property;
      const location = p?.state ? `${p.city ? `${p.city}, ` : ""}${p.state}${p.zip ? ` ${p.zip}` : ""}, USA` : "USA (state unknown)";
      const r = await askClaude({
        system: LEGAL_SYSTEM,
        schema: LegalSchema,
        effort: "medium",
        webSearch: true,
        content: `Property location: ${location}\nRepair request: ${request.title}\nDetails: ${request.description}\nTrade: ${request.trade ?? "general"}\nUrgency: ${request.urgency}`,
      });
      return {
        summary: r.summary,
        mustDo: r.mustDo.map((m) => ({ action: m.action, deadline: m.deadline ?? undefined })),
        sources: r.sources.map((s) => ({ title: s.title, url: s.url ?? undefined })),
        disclaimer: DISCLAIMER,
      };
    },
    () => fakeLegalGuidance(request),
  );
}
