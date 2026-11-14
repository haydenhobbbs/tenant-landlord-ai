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

| What | File | Who works here |
|------|------|----------------|
| Home page | `frontend/src/app/page.tsx` | |
| Tenant page (submit + track requests) | `frontend/src/app/tenant/page.tsx` | Tenant UI |
| Landlord page (approve / decline) | `frontend/src/app/landlord/page.tsx` | Landlord UI |
| AI that picks a contractor (currently fake) | `frontend/src/lib/ai.ts` | AI agent |
| Contractor list (currently fake) | `frontend/src/lib/contractors.ts` | Contractor search |
| Data storage (in memory, resets on restart) | `frontend/src/lib/store.ts` | Backend |
| API: list + create requests | `frontend/src/app/api/requests/route.ts` | Backend |
| API: approve / decline | `frontend/src/app/api/requests/[id]/route.ts` | Backend |
| Shared data types | `frontend/src/lib/types.ts` | Everyone, so change it carefully |

How the pieces connect: the tenant form calls `POST /api/requests`, which calls `findBestContractor()` in `ai.ts`, then saves the request. The landlord page lists requests and calls `PATCH /api/requests/:id` to approve or decline them.

API keys go in `frontend/.env.local`, which git ignores. Copy `.env.example` to get started.

See [docs/TEAM_PLAN.md](docs/TEAM_PLAN.md) for who does what, and [CONTRIBUTING.md](CONTRIBUTING.md) for how we work together.

## Team

- Hayden Hobbs
- _teammate_
- _teammate_
- _teammate_
