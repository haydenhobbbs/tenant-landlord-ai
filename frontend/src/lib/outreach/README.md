# Contractor outreach and notifications

Import the public API from `@/lib/outreach`. It uses the shared types in
`lib/types.ts` and the existing `lib/store.ts` Supabase client.

- `getPreapprovedContractors(landlordId, trade)` reads the landlord's trusted list; empty/error/no database uses main's demo list.
- `searchContractorsOnline(trade, property)` searches Google Places near the street/city/state/zip, city/state, or without a location. Missing key/provider failure uses main's demo list. `general` searches for handyman.
- `pickChannel(contractor)` chooses SMS when a phone exists, email otherwise.
- `contactContractor(contractor, message, channel, { requestId }?)` returns `{ sent, reply }`. Configured providers return `reply: null`; no keys return an immediate demo reply. A leading `Subject: ...` email line becomes the subject.
- `onContractorReply(requestId, contractor, text, channel)` logs inbound text, uses `readContractorReply` and `rankOffers` from `lib/ai`, replaces that contractor's suggestion, and notifies the landlord. Approved/scheduled/completed/declined requests only log replies.
- `findThreadByAddress(from)` resolves the newest outbound destination; `findThreadByContractor(requestId, contractorId)` resolves voice callbacks.
- `confirmBooking(request, offer)` sends contractor SMS and email with `job.ics`. Missing/invalid availability defaults to 24 hours from now. Tenant notification belongs to `pipeline.approveRequest`.
- `buildIcs(options)` creates a UTC calendar invite with escaped text and folded UTF-8 lines.
- `notify({ userId?, name?, phone?, email? }, message, { type?, link?, requestId? }?)` saves an in-app notification and optionally sends SMS/email. Types: `message`, `request_update` (default), `rent_reminder`. Booking and notifications catch failures.
- `listNotifications(key)` reads notifications by user ID, or `name:Landlord` / `name:Jordan Lee` when no user ID exists. `markNotificationRead(id)` sets `read_at`.
- `sendRentReminders(tenants)` notifies tenants whose rent is due within three days; returns one void result per reminder so the cron route can report a count.

Uses the existing outreach_log and notifications tables in schema.sql - no extra SQL.
Outbound rows store the actual destination in `contractor._to`; it is stripped
from the returned Contractor. Lookups read the newest 200 rows and match normalized
phone/email addresses, including demo overrides. With multiple jobs sent to the
same phone/inbox, SMS/email replies belong to the newest outbound job. Voice
callbacks identify the request and contractor explicitly. Outbound logging needs
both `requestId` and a contractor; profile notifications do not create contractor
threads. Storage failures use memory, which lasts only for the current process.
UUID user IDs use Supabase notifications; other IDs and name keys use memory.

## Environment

Set server variables in `frontend/.env.local` (never commit secrets):

| Variable | Purpose |
| --- | --- |
| `GOOGLE_PLACES_API_KEY` | Places API (New), Text Search enabled |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | All three enable real SMS/calls; sender must support the channel |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Both enable real email; use a verified sender |
| `RESEND_REPLY_TO` | Optional reply inbox / invite organizer |
| `APP_BASE_URL` | Public origin for voice callbacks and Twilio signature validation |
| `DEMO_CONTRACTOR_PHONE`, `DEMO_CONTRACTOR_EMAIL` | Override contractor destinations and calendar attendee; profile notifications keep their own destinations |
| `CRON_SECRET` | Optional bearer token required by rent cron |
| `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY` | Existing storage client; omit for memory |
| `ANTHROPIC_API_KEY` | Shared AI parser/ranker; omit for its fallback rules |

Phone numbers use E.164; US ten-digit numbers gain `+1`. Google Places supplies
phone numbers, not emails. Supply contractor email or `DEMO_CONTRACTOR_EMAIL`
for a real calendar delivery; a configured provider without a destination fails
without throwing. Missing channel credentials logs a dry run. No-key booking
logs both SMS and email, including the `.ics` attachment filename.

## Webhooks

Use a public HTTPS origin matching `APP_BASE_URL` (deployment or tunnel).

- Twilio Messaging → A message comes in: `POST https://your-app.example/api/webhooks/twilio/sms`
- Voice speech callback (set in outgoing TwiML): `POST https://your-app.example/api/webhooks/twilio/voice?requestId=REQUEST_ID&contractorId=CONTRACTOR_ID`
- Email forwarding: `POST https://your-app.example/api/webhooks/email`

Twilio callbacks validate `X-Twilio-Signature` when `TWILIO_AUTH_TOKEN` is set,
including the full public URL/query and sorted form parameters. Invalid signatures
return 403. Unknown senders get empty TwiML. Unsigned curl tests need no auth token.

Email accepts either `{ "from": "Plumber <plumber@example.com>", "text": "Yes, Tue 10am, $180" }`
or `{ "type": "email.received", "data": { "from": "plumber@example.com", "text": "Yes, Tue 10am, $180" } }`.
It removes quoted `>` lines and stops at `On ... wrote:`. Configure a forwarding
adapter to include the message text if the inbound provider sends only an email ID.
The endpoint follows the app's unauthenticated hackathon route conventions.

**Twilio trial accounts can only text/call verified destination numbers.** Use
`DEMO_CONTRACTOR_PHONE` with a verified teammate's phone. Set Resend credentials
and `DEMO_CONTRACTOR_EMAIL` to receive a calendar invitation.

## Curl demo

For a local dry run, leave provider, AI, storage keys and demo overrides unset,
then `cd frontend && npm run dev -- -p 3100`. Keep all requests in one process.

```sh
curl -sS 'http://localhost:3100/api/outreach/search?trade=plumbing&city=Austin&state=TX&address=123%20Main%20St&zip=78701'

# Create a job: returns status contractor_suggested and ranked suggestions.
curl -sS http://localhost:3100/api/requests \
  -H 'Content-Type: application/json' \
  -d '{"tenantName":"Jordan Lee","unit":"2B","title":"Kitchen sink leak","description":"Pipe leaking under sink","urgency":"medium","property":{"address":"123 Main St","city":"Austin","state":"TX","zip":"78701"}}'

# Substitute the returned request ID below.
curl -sS http://localhost:3100/api/outreach/contact \
  -H 'Content-Type: application/json' \
  -d '{"contractor":{"id":"pre-1","name":"Rapid Rooter Plumbing","trade":"plumbing","phone":"+15552013344","source":"preapproved"},"message":"Can you repair a sink leak? Reply with availability and price.","channel":"sms","requestId":"REQUEST_ID"}'

curl -sS http://localhost:3100/api/webhooks/twilio/sms \
  --data-urlencode 'From=+15552013344' \
  --data-urlencode 'Body=No problem, Tue 10am works, $180'

curl -sS http://localhost:3100/api/requests
# Check the desired suggestion index in that response (default is zero).
curl -sS -X PATCH http://localhost:3100/api/requests/REQUEST_ID \
  -H 'Content-Type: application/json' -d '{"action":"approve","offerIndex":0}'

curl -sS 'http://localhost:3100/api/notifications?name=Landlord'
curl -sS 'http://localhost:3100/api/notifications?name=Jordan%20Lee'
curl -sS http://localhost:3100/api/notifications \
  -H 'Content-Type: application/json' \
  -d '{"name":"Landlord","message":"Hello","type":"message"}'
curl -sS -X PATCH http://localhost:3100/api/notifications/NOTIFICATION_ID
curl -sS http://localhost:3100/api/cron/rent-reminders
# With CRON_SECRET, add -H "Authorization: Bearer $CRON_SECRET".
```

The demo cron sends one near-due fake tenant reminder on every invocation; it does
not deduplicate scheduled runs. Shared AI fallback parsing is intentionally
simple; live AI resolves offered dates using its configured time zone.
