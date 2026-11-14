// The property's local time zone, so "tomorrow at 10am" and "booked Tue 10am"
// mean the property's time, not the server's (Vercel runs in UTC).
// Approximate: uses the state's main zone.

const ZONES: Record<string, string> = {
  // Eastern
  CT: "America/New_York", DE: "America/New_York", DC: "America/New_York", FL: "America/New_York",
  GA: "America/New_York", ME: "America/New_York", MD: "America/New_York", MA: "America/New_York",
  MI: "America/Detroit", NH: "America/New_York", NJ: "America/New_York", NY: "America/New_York",
  NC: "America/New_York", OH: "America/New_York", PA: "America/New_York", RI: "America/New_York",
  SC: "America/New_York", VT: "America/New_York", VA: "America/New_York", WV: "America/New_York",
  IN: "America/Indiana/Indianapolis", KY: "America/New_York",
  // Central
  AL: "America/Chicago", AR: "America/Chicago", IL: "America/Chicago", IA: "America/Chicago",
  KS: "America/Chicago", LA: "America/Chicago", MN: "America/Chicago", MS: "America/Chicago",
  MO: "America/Chicago", NE: "America/Chicago", ND: "America/Chicago", OK: "America/Chicago",
  SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago", WI: "America/Chicago",
  // Mountain
  AZ: "America/Phoenix", CO: "America/Denver", ID: "America/Boise", MT: "America/Denver",
  NM: "America/Denver", UT: "America/Denver", WY: "America/Denver",
  // Pacific + others
  CA: "America/Los_Angeles", NV: "America/Los_Angeles", OR: "America/Los_Angeles", WA: "America/Los_Angeles",
  AK: "America/Anchorage", HI: "Pacific/Honolulu",
};

export function timeZoneFor(state: string | undefined): string {
  return ZONES[(state ?? "").trim().toUpperCase()] ?? "America/Chicago";
}
