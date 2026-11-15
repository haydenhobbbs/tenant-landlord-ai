import { timeZoneFor } from "./timezone";

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatPrice(usd: number) {
  return `$${usd.toLocaleString()}`;
}

// An absent state preserves the existing viewer-local behavior.
export function formatInZone(iso: string, state?: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(iso).toLocaleString(state ? "en-US" : undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    ...opts,
    ...(state ? { timeZone: timeZoneFor(state), timeZoneName: "short" } : {}),
  });
}

export function zoneLabel(state: string) {
  const label = new Intl.DateTimeFormat("en-US", { timeZone: timeZoneFor(state), timeZoneName: "longGeneric" })
    .formatToParts(new Date()).find((part) => part.type === "timeZoneName")?.value ?? "Local time";
  return label.replace(/Time$/, "time");
}

// Calendar dates are calculated in the property's zone, including midnight crossings.
export function dateInZone(iso: string, state?: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
    ...(state ? { timeZone: timeZoneFor(state) } : {}),
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find((value) => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
