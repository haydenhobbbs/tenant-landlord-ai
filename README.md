# Tenant ↔ Landlord AI

An AI go-between for tenants and landlords. Tenants submit maintenance requests, the AI finds available contractors, and the landlord just approves.

## How it works

1. **Tenant** submits a request (e.g. "kitchen sink is leaking"), optionally with photos.
2. **AI** sorts the issue by trade and urgency, then finds contractors who are available and gets quotes.
3. **Landlord** gets a summary with the recommended contractor, price, and time slot, and approves or declines it in one tap.
4. **AI** books the job and keeps the tenant posted.

## Repo layout

```
frontend/   # tenant + landlord web app
backend/    # API, AI agent, contractor matching
docs/       # pitch, design notes, API contracts
```

Stack is TBD. Update this section once we pick one.

## Getting started

```bash
git clone <repo-url>
cd tenant-landlord-ai
cp .env.example .env   # fill in your own keys, never commit .env
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for how we work together.

## Team

- Hayden Hobbs
- _teammate_
- _teammate_
- _teammate_
