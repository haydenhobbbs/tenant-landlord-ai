import { createHmac, timingSafeEqual } from "node:crypto";

/** Twilio signs the public URL followed by sorted form keys and their values. */
export function validTwilioSignature(request: Request, form: FormData): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return true;
  const url = new URL(request.url);
  const fullUrl = process.env.APP_BASE_URL
    ? `${process.env.APP_BASE_URL.replace(/\/$/, "")}${url.pathname}${url.search}` : request.url;
  let payload = fullUrl;
  for (const key of [...new Set(form.keys())].sort()) {
    for (const value of [...new Set(form.getAll(key).map(String))].sort()) payload += key + value;
  }
  const expected = Buffer.from(createHmac("sha1", token).update(payload).digest("base64"));
  const actual = Buffer.from(request.headers.get("x-twilio-signature") ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
