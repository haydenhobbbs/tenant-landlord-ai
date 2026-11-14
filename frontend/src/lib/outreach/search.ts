import type { Contractor, MaintenanceRequest, Trade } from "../types";
import { normalizePhone } from "./send";

const searchTerms: Record<Trade, string> = {
  plumbing: "plumber", electrical: "electrician", hvac: "HVAC repair",
  appliance: "appliance repair", pest: "pest control", general: "handyman",
};

export function isTrade(value: unknown): value is Trade {
  return typeof value === "string" && Object.hasOwn(searchTerms, value);
}

interface Place {
  id?: string;
  displayName?: { text?: string };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  websiteUri?: string;
}

/** null means the provider is unavailable; the public API supplies demo results. */
export async function searchPlaces(
  trade: Trade, location: MaintenanceRequest["property"],
): Promise<Contractor[] | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const cityState = [location?.city, location?.state].filter(Boolean).join(", ");
  const where = location?.address
    ? [location.address, [cityState, location.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")
    : cityState;
  const textQuery = `${searchTerms[trade]}${where ? ` near ${where}` : ""}`;
  if (!apiKey) {
    console.log("[outreach dry run] Google Places search", { textQuery });
    return null;
  }
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.websiteUri",
      },
      body: JSON.stringify({ textQuery, pageSize: 5 }), signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Google Places returned ${response.status}`);
    const data = await response.json() as { places?: Place[] };
    return (data.places ?? []).flatMap((p): Contractor[] => {
      const phone = normalizePhone(p.internationalPhoneNumber || p.nationalPhoneNumber || "");
      if (!p.id || !/^\+[1-9]\d{7,14}$/.test(phone)) return [];
      return [{
        id: `gp_${p.id}`, name: p.displayName?.text ?? `${searchTerms[trade]} contractor`,
        trade, phone, rating: p.rating, website: p.websiteUri, source: "online",
      }];
    });
  } catch (error) {
    console.error("[outreach] Contractor search failed", error);
    return null;
  }
}
