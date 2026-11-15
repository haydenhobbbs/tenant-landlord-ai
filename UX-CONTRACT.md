# FixFlow product behavior

See `DESIGN.md` for visual direction. This contract covers the landlord workflow added by teammate B.

## Product context

- Audience: tenants and landlords; landlord pages prioritize clear decisions for people who may be new to AI.
- Locale: English. Property times use the state’s main time zone from `frontend/src/lib/timezone.ts`, with a zone abbreviation. Requests without a property state retain browser-local formatting.
- Source: `docs/TEAM_PLAN.md` defines the requested workflow. `frontend/src/lib/types.ts` and the request API define current data behavior.
- Accessibility target: WCAG 2.2 AA.

## Canonical UI map

| Capability | Owner | Choice | Verification |
|---|---|---|---|
| Select/listbox | Browser native select | Native popup for request and trade selection | Keyboard and mobile inspection |
| Date | Browser locale formatting | Calendar month controls are buttons; no date picker | Calendar navigation |
| Form | Landlord contractor and message forms | Inline validation, retained input on failure, no duplicate submit | Create/edit/remove and empty send |
| CRUD | Contractor page | Stay on list; inline status and two-step remove | Full browser flow |
| Status feedback | Inline `role=status` or `role=alert` | No separate toast owner yet | Browser state inspection |
| Scrollbar | Browser/document | No app-owned theme until teammate A's shared theme | Narrow viewport overflow check |

## Navigation and decisions

- `/landlord` is the request inbox. Each request links to its full detail. Approve and Decline stay on the inbox, show a result message, and refresh the list.
- A failed decision leaves the request in place and offers a retry. Duplicate decision clicks are disabled while a request is saving.
- `landlord_approved` means the landlord agreed to an offer. The calendar labels its time as provisional until the contractor confirms; `scheduled` means confirmed.

## Trusted contractors

- Create and edit use the same form. Name and phone are required. Removing a contractor requires an inline confirmation and leaves the user on the list.
- Without Supabase Auth, changes stay in this browser. With Auth and `supabase/landlord_policies.sql`, the signed-in landlord's rows are stored under row level security.
- The matching service needs a landlord ID on requests to use this list; `docs/LANDLORD_HANDOFF.md` records that integration.

## Messages and leases

- Messages are tied to a repair request. With both accounts linked and Supabase configured, the landlord sees database changes through Supabase Realtime. Without Auth, the UI is a labeled local preview and does not claim delivery.
- Leases in Supabase Storage use a private bucket and a short-lived signed URL. A local PDF preview remains on the current device and is not uploaded.

## Controls and feedback

- Native select controls own their popup and keyboard behavior. Native file selection owns PDF selection. Forms preserve entered values on failure, show errors near the action, and prevent duplicate submission. The app uses inline status messages rather than a separate toast provider.
- No irreversible operation occurs without a clear second action. The landlord route shell keeps the document as the scroll owner; messages alone have an internal bounded list.

## My properties

- My properties is the first landlord tab. Address headings and Open property links lead to the home’s residents, messages, and repairs. Invite copy/share actions sit outside those links. State groups show the time-zone name; homes sort by city, then street address.
- Add a property stays on the list with an inline form. `propertyInput` owns validation; shared Fields and Inputs own presentation, and the browser native select owns state selection (including its popup and keyboard behavior). A successful save adds the card immediately and announces the invite code and home’s time zone. `PropertyInvite` owns code, link, copy and native sharing behavior on both list and detail pages. Failure retains all input.
- Each resident has their own existing chat thread. Household messages send a copy to each resident; after a partial failure, retry targets only unsuccessful recipients. Replies stay in their individual threads.
- Calendar visits belong to the property-local day, even when that differs from the viewer’s date. State-based zones are approximate for states that span zones.
