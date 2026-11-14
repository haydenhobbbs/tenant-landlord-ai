# Team Plan

## What we're building

An app where **tenants** report repairs, **AI finds and books a contractor** (by searching online and calling, texting, or emailing them), and the **landlord** just approves.

- **2 logins:** Tenant and Landlord. Contractors never log in. The AI talks to them by phone, text, or email.
- **Colors:** Tenant = forest green, Landlord = baby blue, Contractor info = navy red. Light and dark mode.
- **Audience:** many landlords are 40–60 and new to AI. Use big text, one main button per screen, plain words, no AI jargon.

## The flow (one repair request)

```
submitted              Tenant sends a message + photos
   ↓
finding_contractor     AI searches online + the landlord's pre-approved list,
                       then calls/texts/emails contractors for availability + price
   ↓
contractor_suggested   Landlord sees the best option(s): who, price, time, why,
                       plus legal guidance for their state/city
   ↓
landlord_approved      Landlord taps Approve
   ↓
scheduled              AI confirms with the contractor and sends a calendar invite;
                       tenant gets "Plumber booked Tue 10am"
   ↓
completed              Job done

(declined can happen at any step)
```

## Who does what

### Hayden: AI brain (`frontend/src/lib/ai/`)
- **Understand the request:** turn the tenant's message and photos into a trade, urgency, and clear summary.
- **Pick contractors:** rank pre-approved contractors first, then ones found online, and write the "why" shown to the landlord.
- **Write the outreach:** what the AI says when it calls, texts, or emails a contractor, and how to read their reply (available? when? price?).
- **Legal guidance:** given the issue and the property's location, suggest how to handle it lawfully under local, state, and federal rules (notice periods, repair deadlines, habitability). Show it as a short checklist ("What you must do / by when") labeled *general information, not legal advice*, with sources.

### Teammate A: design, login, and the tenant app
- Run Superdesign first and set up the shared theme (colors, light/dark, buttons, cards) **so everyone builds with the same look**.
- Login with 2 roles (Supabase Auth): send tenants and landlords to their own home screens.
- Tenant screens: report an issue (message + photos), track request status, **view lease**, chat with landlord, notifications.

### Teammate B: the landlord app
- Request inbox with big, clear **Approve / Decline** buttons.
- Request detail page: tenant message, photos, AI's suggested contractor (price, time, why), and Hayden's legal guidance.
- **Pre-approved contractors:** add, edit, and remove trusted contractors (the AI tries these first).
- Chat with tenants (for example 24-hour entry notices) using Supabase Realtime.
- **View lease**, and see upcoming scheduled jobs on a simple calendar.

### Teammate C: contractor outreach and notifications
- **Find contractors online:** use the Google Places API (or Yelp) to search by trade and location, returning name, phone, rating, and website.
- **Contact them:** send SMS and make calls with Twilio (an AI voice agent like Vapi or Bland is a stretch goal), and email with Resend.
- **Receive replies:** webhooks that take a contractor's text or email reply and pass it to Hayden's AI to read.
- **Book it:** after the landlord approves, send the contractor a confirmation plus a calendar invite (.ics).
- **Notifications** for tenants and landlords: new messages, request status changes, rent reminders.

## Hand-offs to agree on early

These are the points where our code connects. Agree on the inputs and outputs in the first hour, then everyone builds against fake versions until the real ones land.

Each function already exists with a **fake version that works today**. Replace the inside, keep the name, inputs, and outputs.

**Hayden: `frontend/src/lib/ai/index.ts`**
| Function | What it does |
|---|---|
| `triageRequest(request)` | Tenant message → trade + urgency |
| `writeOutreachMessage(request, contractor, channel)` | What the AI texts or emails a contractor |
| `readContractorReply(text)` | "Yes, Tue 10am, $180" → available, time, price |
| `rankOffers(request, offers)` | Order contractors best-first, with a "why" |
| `getLegalGuidance(request)` | Location + issue → checklist for the landlord |

**Teammate C: `frontend/src/lib/outreach/index.ts`**
| Function | What it does |
|---|---|
| `getPreapprovedContractors(landlordId, trade)` | Landlord's trusted list (Supabase `contractors` table) |
| `searchContractorsOnline(trade, location)` | Google Places / Yelp search |
| `contactContractor(contractor, message, channel)` | Send SMS / email / call (Twilio, Resend) |
| `confirmBooking(request, offer)` | Confirmation + calendar invite after approval |
| `notify(to, message)` | Notify a tenant or landlord |

**The flow that connects them: `frontend/src/lib/pipeline.ts`.** You usually don't need to edit it.

**Database: `supabase/schema.sql`** (already created in Supabase): `profiles` (role = tenant or landlord), `properties`, `leases`, `contractors`, `requests`, `outreach_log`, `messages`, `notifications`. New users get a profile automatically. Pass the role at sign-up:
`supabase.auth.signUp({ email, password, options: { data: { role: "landlord", name: "Pat" } } })`

`frontend/src/lib/types.ts` is shared. **Ask in the group chat before changing it.**

## Must-have vs nice-to-have

**Must-have (the demo story):**
> Tenant reports a leak with a photo → AI finds a plumber and texts them → plumber texts back "Tue 10am, $180" → landlord sees the suggestion + legal guidance and taps Approve → plumber gets a confirmation + calendar invite → tenant gets "Plumber booked Tue 10am."

For the demo, the "plumber" is a teammate's real phone, so the judges see the text arrive live.

**Nice-to-have:** AI phone calls (voice agent), photo analysis, rent payment reminders, lease upload/edit, chat read receipts.

## How we work

1. Make your own branch: `git checkout -b yourname/feature`
2. Pull `main` often: `git pull origin main`
3. Before opening a PR, click through the whole flow and make sure it still works.
4. Merge small and often. Every PR gets a Vercel preview link.
5. Never commit API keys. They go in `frontend/.env.local` (local) and Vercel (live).

## Timeline
1. **First hour:** A sets up the theme and login, and everyone agrees on the hand-off functions above.
2. **Build:** everyone works on their part using fake data and fake versions of the others' functions.
3. **Midpoint:** everyone merges, and we click through the live site together and fix what breaks.
4. **Final stretch:** stop adding features, then polish the demo story, write the pitch, and rehearse.

Live site: https://tenant-landlord-ai.vercel.app
