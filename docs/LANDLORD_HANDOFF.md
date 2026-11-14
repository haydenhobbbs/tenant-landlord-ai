# Landlord app handoff

Teammate B owns `/landlord`, `/landlord/requests/[id]`, `/landlord/contractors`, `/landlord/messages`, `/landlord/lease`, and `/landlord/calendar`.

The UI follows the current shared `MaintenanceRequest` shape: `suggestions[]`, `legalGuidance`, `selected`, `scheduledAt`, and `contractor_suggested` → `landlord_approved` → `scheduled`. Approval sends `offerIndex` to the existing request API. The detail page shows each contractor's availability, price and AI reason, plus sourced legal guidance when present.

## Integration

- **A / auth and tenant:** Persist `tenant_id` and `landlord_id` on requests. Tenant and landlord chat must use `public.messages` with `request_id` and `sender_id`. Store photo URLs in `photos`. Store lease PDF paths in `leases.file_url` under a private `leases` Storage bucket.
- **Hayden / matching:** `listPreferredContractorsForLandlord(landlordId)` in `frontend/src/lib/landlord-server.ts` reads the real `public.contractors` table for server-side matching. Connect it to `getPreapprovedContractors` in the matching service; that function currently returns a fake list. It needs a populated request `landlordId`.
- **C / booking:** The calendar uses `scheduledAt` or the selected offer's `availableAt`. `landlord_approved` is shown as provisional; `scheduled` means contractor confirmation. The existing approval pipeline currently simulates confirmation; wire it to real outreach and notifications.

Run `supabase/landlord_policies.sql` after reviewing with the auth owner, since it adds RLS policies to the shared schema and enables Realtime for `public.messages`. This migration has not been applied to the shared project. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for signed-in browser access. Local preview mode saves contractors and chat only in this browser; it is labeled as such and is not shared with tenants or the matching service. Lease PDF preview does not upload the file.
