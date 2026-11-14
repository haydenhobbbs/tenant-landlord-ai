# Tenly design guide

Read this before building a screen, so everything looks like one app.

## Who we're designing for

Tenants, and landlords who are often 40–60 and new to AI. Feel: **calm and trustworthy**, like a good bank app.

- Big text. The base size is 18px (`html { font-size: 112.5% }`), so every Tailwind `rem` size is already bigger.
- **One main button per screen** (`<Button>` primary). Everything else is `secondary` or `quiet`.
- Plain words: "repair person" instead of "contractor" when talking to tenants. No AI jargon, no "agent", no robot emoji.
- Font: Atkinson Hyperlegible (made for easy reading). It's already loaded.

## Colors

Never write hex codes or `slate-*` / `bg-white` in components. Use these classes instead, so light and dark mode work for free:

| Use | Class |
|---|---|
| Page background | `bg-bg` |
| Card or panel | `bg-surface` |
| Recessed area | `bg-sunken` |
| Main text / secondary text | `text-fg` / `text-muted` |
| Borders | `border-line`, `border-line-strong` |
| Role color (button, active tab) | `bg-accent text-on-accent`, `bg-accent-soft`, `text-accent-ink` |
| Contractor info (deep red) | `bg-contractor-soft`, `text-contractor-ink`, or `<Card tone="contractor">` |
| Status | `bg-warn-soft text-warn-ink`, `bg-ok-soft text-ok-ink`, `bg-danger-soft text-danger-ink` |

**Role colors are automatic.** Everything under `/tenant` is forest green, and everything under `/landlord` is baby blue. Their layouts set `data-role`, and every `accent` class follows it. For contractor info inside a landlord page, wrap it in `data-role="contractor"` or use `<Card tone="contractor">`.

Dark mode, text size and animations are chosen on the Settings screen (`src/lib/preferences.ts`), which sets `data-theme`, `data-text-size` and `data-motion` on `<html>`. If you only use the classes above, you don't need to do anything.

## Components (`src/components/ui/`)

```tsx
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea, ErrorNote } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";

<PageHeader title="Approvals" intro="One sentence that says what this screen is for." />
<Button>Approve</Button>                                  // the ONE main action
<Button variant="secondary" size="md">Decline</Button>
<Field label="Price"><Input /></Field>
```

Icons come from `lucide-react` (`import { Check } from "lucide-react"`). Don't use emoji as icons.

Shared pieces you can reuse on the landlord side:
- `StatusBadge` / `UrgencyBadge`: plain-words status pills.
- `ChatThread`: `<ChatThread tenantId={id} me={{ role: "landlord", name }} />`.
- `LeaseView`: `<LeaseView lease={lease} />` (data from `GET /api/lease?tenantId=`).

## Login

`useAuth()` from `@/lib/auth` gives `{ user, signOut }`, where `user.role` is `"tenant"` or `"landlord"`. `/tenant/*` and `/landlord/*` are already protected by their `layout.tsx`.

- With `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set, it uses real Supabase Auth.
- Without them it runs in **demo mode**, and the login page has "Try as a tenant / landlord" buttons.

Run the new part of `supabase/schema.sql` once in the Supabase SQL editor (new columns, the `messages` / `notifications` / `leases` tables, and the photo bucket).
