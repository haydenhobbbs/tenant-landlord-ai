# Tenant ↔ Landlord AI

An AI go-between for tenants and landlords. Tenants submit maintenance requests, the AI finds available contractors, and the landlord just approves.

## How it works

1. **Tenant** submits a request (e.g. "kitchen sink is leaking"), optionally with photos.
2. **AI** sorts the issue by trade and urgency, then finds contractors who are available and gets quotes.
3. **Landlord** gets a summary with the recommended contractor, price, and time slot, and approves or declines it in one tap.
4. **AI** books the job and keeps the tenant posted.

## Stack

Next.js (React + TypeScript) with Tailwind CSS. The pages and the API live in the same app in `frontend/`.

## Run it locally

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:3000.

## Where things live

| What | File | Owner |
|------|------|-------|
| Shared data types | `frontend/src/lib/types.ts` | Everyone (ask first) |
| AI brain (fake for now) | `frontend/src/lib/ai/index.ts` | Hayden |
| Google Places contractor search and key setup | `frontend/src/lib/outreach/search.ts` | Anthony (Teammate B) |
| Contractor texts/emails/calls and notifications | `frontend/src/lib/outreach/` | Teammate C |
| The repair flow that connects them | `frontend/src/lib/pipeline.ts` | — |
| Tenant page | `frontend/src/app/tenant/page.tsx` | Teammate A |
| Landlord page | `frontend/src/app/landlord/page.tsx` | Teammate B |
| Saving requests (Supabase, in-memory without keys) | `frontend/src/lib/store.ts` | — |
| API | `frontend/src/app/api/requests/` | — |
| Database tables | `supabase/schema.sql` | — |

Flow: `submitted → finding_contractor → contractor_suggested → landlord_approved → scheduled → completed`. See [docs/TEAM_PLAN.md](docs/TEAM_PLAN.md).

API keys go in `frontend/.env.local`, which git ignores. Copy `.env.example` to get started. See [Google Places setup](docs/PLACES_SETUP.md) for contractor search.

See [docs/TEAM_PLAN.md](docs/TEAM_PLAN.md) for who does what, and [CONTRIBUTING.md](CONTRIBUTING.md) for how we work together.

## Team

- Hayden Hobbs
- _teammate_
- _teammate_
- _teammate_
