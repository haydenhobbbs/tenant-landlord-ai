# Contractor outreach and notifications

Server-side helpers for the App Router. Import the public hand-offs from
`@/lib/outreach`. No provider SDKs or new npm dependencies are needed.

## Functions

| Function | Behavior |
| --- | --- |
| `searchContractorsOnline(trade, location, limit = 5)` | Google Places Text Search (New); returns online contractors with phone numbers, ratings, websites and addresses. Without a key, returns up to three clearly identified demo records. Provider failures log an error and return `[]`. |
| `contactContractor(contractor, message, channel, { requestId, subject?, attachments? })` | Sends SMS, a speech-gathering call, or email. Saves contractor details and the actual destination in the message log. Returns `{ ok, channel, to, dryRun, providerId?, error? }`. |
| `onContractorReply(requestId, contractorId, text)` | Saves the inbound reply, parses availability/time/price, updates the request quote and `awaiting_approval` status, and notifies `landlord`. |
| `interpretReply(text)` | Tries the optional `@/lib/ai/readReply` module's `readContractorReply(text)` export; falls back to a local parser if absent, invalid, or failing. |
| `findThreadByAddress(from)` | Finds the latest outbound contractor message to the normalized phone or email, including demo destinations. When several jobs share a demo address, the newest thread wins. |
| `bookContractor(request, contractor?)` | Looks up contractor email/details from the log, emails a base64 `job.ics` attachment when an email address is known, texts confirmation, and creates a tenant booking notification. |
| `notify(userId, message, opts?)` | Saves a notification, optionally sends SMS/email using `opts.sms`/`opts.email`. Options also include `kind` and `requestId`. |
| `listNotifications(userId)`, `markRead(id)` | Read a user's notifications newest first; mark one read (returns `undefined` if absent). |
| `buildIcs({ uid, title, description, location, start, durationMinutes?, organizerEmail?, attendeeEmail? })` | Produces an RFC 5545 meeting request with UTC times, CRLF, escaped text, and UTF-8 safe folding at 75 octets. Default duration: 120 minutes. |
| `sendRentReminders(tenants)` | Notifies tenants whose ISO `rentDue` is between now and three days from now; returns the saved notifications. `FAKE_TENANTS` includes Jordan due in two days and Sam due in seven. |
| `sendSms`, `sendEmail`, `placeCall` (from `./send`) | Fetch-based low-level senders, each logging outbound attempts. Email supports base64 attachments. Provider errors return `ok: false` instead of throwing. |

`db.ts` follows the existing store's Supabase-or-`globalThis` memory pattern.
Run `supabase/outreach.sql` in Supabase before using persistent outreach storage.
It creates `outreach_messages` and `notifications` with RLS enabled; server code
uses the service role. Memory is process-local and resets on restart; it is also
used as a fallback if these database tables are unavailable.

Without provider credentials, sends log `[outreach dry run]`, save an outbound
message, and return `dryRun: true`. A configured provider that rejects a request
returns `ok: false`, records the attempt, and does not silently pretend to send.
Search returns an array (its existing hand-off has no `dryRun` field).

## Environment

Put secrets in `frontend/.env.local` (never commit them). Names are in `.env.example`.

- `GOOGLE_PLACES_API_KEY`: enable Places API (New) with Text Search access.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`: all three are needed for real SMS/calls. The phone number must support the selected channel. Setting the auth token alone still turns on inbound signature validation.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`: both are needed for real email; use a verified sender.
- `RESEND_REPLY_TO`: optional reply inbox; configure its inbound webhook to forward replies here.
- `APP_BASE_URL`: public origin, e.g. `https://your-app.example`; used for voice callbacks and signature validation behind a proxy. For local curl tests use `http://localhost:3100`.
- `DEMO_CONTRACTOR_PHONE`: optional override for contractor SMS/calls, e.g. your verified teammate's number in `+1...` format. The log stores this real destination so their reply maps back to the job.
- `DEMO_CONTRACTOR_EMAIL`: optional override for contractor email and the calendar attendee.
- `CRON_SECRET`: optional bearer token for rent reminders.
- Existing storage variables: `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`.

Demo overrides apply only to contractor outreach, not tenant/landlord notification
destinations. US ten digit phone numbers gain `+1`. Google Places does not provide
email addresses: supply `contractor.email` or `DEMO_CONTRACTOR_EMAIL` to deliver the
calendar invitation. SMS omits the email claim when no invite was sent.

The local parser recognizes `$180`, `Tue 10am`, `tomorrow 3pm`, and `10:30am`.
Relative dates and display times use the server's local timezone (`TZ`); set it to
the property's zone for a live demo. Dates in the calendar are always UTC.
Unclear/missing values preserve an existing quote for the same contractor, or use
price `0`/empty availability for landlord review. Unavailable replies notify the
landlord explicitly. Approval without a usable time sends an approval notification
with scheduling pending instead of an invalid calendar invite.

## Twilio and email webhook setup

Use an HTTPS deployment or tunnel whose public origin matches `APP_BASE_URL`.
On your Twilio number, set **Messaging → A message comes in** to:

```text
POST https://your-app.example/api/webhooks/twilio/sms
```

Outbound calls provide TwiML directly and gather speech with a POST callback to:

```text
https://your-app.example/api/webhooks/twilio/voice?requestId=seed-1&contractorId=c1
```

Both Twilio webhooks check `X-Twilio-Signature` when `TWILIO_AUTH_TOKEN` is set.
The signature covers the full public URL (including query string) and sorted
form parameters. Unsigned local curl calls require an unset token; invalid
signatures return 403. Unknown SMS senders get `<Response/>`.

For inbound email, forward JSON to `POST /api/webhooks/email`. Supported shapes:

```json
{"from":"Plumber <plumber@example.com>","text":"Tue 10am, $180"}
{"type":"email.received","data":{"from":"plumber@example.com","text":"Tue 10am, $180","subject":"Re: Repair"}}
```

Quoted `>` lines and everything following `On ... wrote:` are stripped. This
endpoint expects message text in the JSON; if your inbound service sends only
an email ID, configure a forwarding adapter that includes the text.

## Local demo with curl

For a completely local dry run, leave all provider/storage keys and demo overrides
unset (including in `.env.local`), then run:

```sh
cd frontend
npm run dev -- -p 3100
```

In another terminal:

```sh
curl -sS 'http://localhost:3100/api/outreach/search?trade=plumbing&location=Austin,%20TX'

curl -sS http://localhost:3100/api/outreach/contact \
  -H 'Content-Type: application/json' \
  -d '{"contractor":{"id":"c1","name":"Rapid Rooter Plumbing","trade":"plumbing","rating":4.8,"phone":"(555) 201-3344","source":"preapproved"},"message":"Can you fix a kitchen sink leak? Please reply with availability and price.","channel":"sms","requestId":"seed-1"}'

curl -sS http://localhost:3100/api/webhooks/twilio/sms \
  --data-urlencode 'From=+15552013344' --data-urlencode 'Body=Tue 10am, $180'

curl -sS http://localhost:3100/api/requests

curl -sS -X PATCH http://localhost:3100/api/requests/seed-1 \
  -H 'Content-Type: application/json' -d '{"decision":"approve"}'

curl -sS 'http://localhost:3100/api/notifications?userId=tenant:Jordan%20Lee'
curl -sS 'http://localhost:3100/api/notifications?userId=landlord'
curl -sS http://localhost:3100/api/cron/rent-reminders
# If CRON_SECRET is set, also pass -H "Authorization: Bearer $CRON_SECRET".
```

Expect three demo contractors, an SMS result with `dryRun:true`, TwiML thanks,
`seed-1` with quote price `180` and the reply in `aiReason`, then a notification
such as `Plumber booked Tue 10am` and one rent reminder. Notifications can also be
created with `POST /api/notifications` using `{ "userId": "landlord", "message": "Hello", "kind": "new_message", "requestId": "seed-1" }`,
and marked read with `PATCH /api/notifications/<id>`.

For a live phone demo, set the three Twilio variables, `APP_BASE_URL` to the public
tunnel/deployment, and `DEMO_CONTRACTOR_PHONE` to the teammate's phone. Text any
contractor through the app, reply from that phone, then approve as landlord.
**Twilio trial accounts can only text verified numbers.** For a real calendar
invite, also set Resend credentials and `DEMO_CONTRACTOR_EMAIL`.

The demo cron endpoint sends a reminder on each invocation; it does not deduplicate
scheduled runs. These routes follow the app's existing unauthenticated hackathon
conventions; `userId` is an application label, not an authentication check.
