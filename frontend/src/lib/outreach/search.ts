import type { Category, OutreachContractor } from "./types";

const searchTerms: Record<Category, string> = {
  plumbing: "plumber", electrical: "electrician", hvac: "HVAC repair",
  appliance: "appliance repair", pest: "pest control", other: "handyman",
};

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && Object.hasOwn(searchTerms, value);
}

interface Place {
  id?: string;
  displayName?: { text?: string };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  formattedAddress?: string;
}

export async function searchContractorsOnline(
  trade: Category, location: string, limit = 5,
): Promise<OutreachContractor[]> {
  if (!isCategory(trade)) return [];
  const count = Number.isFinite(limit) ? Math.max(0, Math.min(20, Math.floor(limit))) : 5;
  if (!count) return [];
  const term = searchTerms[trade];
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.log("[outreach dry run] Google Places search", { trade, location });
    const label = term.charAt(0).toUpperCase() + term.slice(1);
    return ["Lone Star", "Neighborhood", "Reliable Home"].slice(0, count).map((name, i) => ({
      id: `demo_${trade}_${i + 1}`, name: `${name} ${label}`, trade,
      phone: `+1512555010${i + 1}`, rating: [4.8, 4.7, 4.6][i], reviewCount: [126, 84, 63][i],
      address: location, source: "online",
    }));
  }
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.userRatingCount,places.websiteUri,places.formattedAddress",
      },
      body: JSON.stringify({ textQuery: `${term} near ${location}`, pageSize: count }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Google Places returned ${response.status}`);
    const data = await response.json() as { places?: Place[] };
    return (data.places ?? []).filter((p) => p.id && (p.internationalPhoneNumber || p.nationalPhoneNumber))
      .slice(0, count).map((p) => ({
        id: `gp_${p.id}`, placeId: p.id, name: p.displayName?.text ?? `${labelFor(trade)} contractor`,
        trade, phone: (p.internationalPhoneNumber || p.nationalPhoneNumber)!, rating: p.rating ?? 0,
        reviewCount: p.userRatingCount, website: p.websiteUri, address: p.formattedAddress, source: "online",
      }));
  } catch (error) {
    console.error("[outreach] Contractor search failed", error);
    return [];
  }
}

function labelFor(trade: Category) { return searchTerms[trade]; }
