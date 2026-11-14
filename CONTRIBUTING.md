# Working together

There are four of us on a hackathon clock, so keep it simple.

## Workflow

1. Pull the latest `main` before you start:
   ```bash
   git checkout main && git pull
   ```
2. Make a branch for your piece of work:
   ```bash
   git checkout -b yourname/short-description   # e.g. hayden/contractor-search
   ```
3. Commit small and often, then push:
   ```bash
   git push -u origin yourname/short-description
   ```
4. Open a Pull Request into `main` and ping someone to take a quick look. Merge once it works.

## Rules of thumb

- Don't push straight to `main`.
- Never commit API keys. Put them in `.env`, which git ignores. Add new variable *names* to `.env.example`.
- Claim a task in the group chat (or a GitHub Issue) before starting so two people don't build the same thing.
- If you hit a merge conflict and get stuck, ask. Don't force-push.

## Suggested split

| Area | Owner |
|------|-------|
| Tenant request UI | _tbd_ |
| Landlord approval UI | _tbd_ |
| AI agent (triage + messaging) | _tbd_ |
| Contractor search + availability | _tbd_ |
