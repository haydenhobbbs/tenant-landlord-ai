# Tenly phone notifications

The app now includes a home-screen manifest, the supplied house-and-wrench icon,
a service worker, and Web Push delivery for repair notifications addressed to a
signed-in Supabase user. The Settings page lets each user turn notifications on
or off for the current device. Only actions carrying the signed-in user's auth
token trigger phone alerts; the public demo notification route cannot send one.
Demo accounts cannot receive phone notifications.

## Deploy setup

1. In the project's Supabase SQL editor, run [`supabase/push_subscriptions.sql`](../supabase/push_subscriptions.sql). The table has row level security enabled and no browser access policy; only the existing server service-role client reads and writes it.
2. Generate one VAPID key pair with `npx web-push generate-vapid-keys`. Keep the private key secret. Do not commit either key to the repository or share the private key in a group chat.
3. In Hayden's Vercel project, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT=https://tenant-landlord-ai.vercel.app` for Production, then redeploy. The existing `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must also be set. Keep the same VAPID pair across later deployments; rotating it requires devices to subscribe again.
4. Merge and deploy both the logo PR and this branch. On iPhone, open the HTTPS site in Safari, add it to the Home Screen, and launch that icon. On Android, use Chrome's **Install app** or **Add to Home screen**. In Tenly, sign in with a real account, open Settings, and tap **Turn on notifications**. Approve the browser permission prompt.

## Test

Use two real Supabase accounts linked by a lease and property. The tenant opens
Settings and enables notifications. A landlord can do the same. With the phone
app closed, submit a repair request from the tenant account. The tenant should
receive the receipt/update, and the landlord should receive a new-request alert.
The landlord alert needs a lease row joining that tenant to a property with a
`landlord_id`; Tenly does not guess who owns an unlinked demo request.

Push messages contain only the existing repair notification text and an internal
Tenly path. Delivery failures do not block a repair request; expired device
subscriptions are removed after the push service returns 404 or 410. Push does
not add offline access or sync demo data between devices.
