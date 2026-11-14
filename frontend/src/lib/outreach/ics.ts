export interface IcsOptions {
  uid: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  durationMinutes?: number;
  organizerEmail?: string;
  attendeeEmail?: string;
}

const escapeText = (text: string) => text.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n")
  .replace(/,/g, "\\,").replace(/;/g, "\\;");
const utc = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Fold on UTF-8 character boundaries. The continuation space counts as an octet.
function fold(line: string): string {
  const parts: string[] = [];
  let part = "";
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char, "utf8");
    if (bytes + size > 75) {
      parts.push(part);
      part = " ";
      bytes = 1;
    }
    part += char;
    bytes += size;
  }
  parts.push(part);
  return parts.join("\r\n");
}

export function buildIcs({
  uid, title, description, location, start, durationMinutes = 120, organizerEmail, attendeeEmail,
}: IcsOptions): string {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tenant Landlord AI//Maintenance//EN",
    "CALSCALE:GREGORIAN", "METHOD:REQUEST", "BEGIN:VEVENT",
    `UID:${escapeText(uid)}`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(start)}`,
    `DTEND:${utc(new Date(start.getTime() + durationMinutes * 60_000))}`,
    `SUMMARY:${escapeText(title)}`, `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(location)}`, "SEQUENCE:0", "STATUS:CONFIRMED",
  ];
  if (organizerEmail) lines.push(`ORGANIZER:mailto:${organizerEmail.replace(/[\r\n]/g, "")}`);
  if (attendeeEmail) lines.push(`ATTENDEE;RSVP=TRUE:mailto:${attendeeEmail.replace(/[\r\n]/g, "")}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
