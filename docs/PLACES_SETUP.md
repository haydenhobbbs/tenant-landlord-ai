# Google Places contractor search

**Owner:** Anthony (Teammate B). The Text Search (New) integration already exists in `frontend/src/lib/outreach/search.ts`; this task is to configure and verify its API key.

1. In the team's Google Cloud project, enable **Places API (New)** and billing. Create a key restricted to that API. This app calls Google from the Next.js server, so keep the key server-side and use a suitable server application restriction where the hosting setup allows it. [Google's setup guide](https://developers.google.com/maps/documentation/places/web-service/get-api-key) and [security guidance](https://developers.google.com/maps/api-security-best-practices) explain the options.
2. On this computer, add `GOOGLE_PLACES_API_KEY=...` to `frontend/.env.local`. That file is ignored by Git. Restart `npm run dev` after changing it. Do not add the key to `NEXT_PUBLIC_` variables, `.env.example`, commits, PRs, or chat.
3. For the live app, add **GOOGLE_PLACES_API_KEY** to the Vercel project's environment variables, then redeploy. The value should stay secret; the key name is already in `frontend/.env.example`.
4. Test a search with the local server running: `http://localhost:3000/api/outreach/search?trade=plumbing&city=Austin&state=TX`. A configured search should return real Google place IDs (`gp_...`), names, phones, ratings, and websites when available. Without the key or on a provider error, the endpoint returns the demo contractors.

The search requests a maximum of five places and keeps results with callable phone numbers. The requested phone number and website fields affect Google Places billing; check [Google's field and pricing documentation](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing/) before running a high-volume demo. A Google Places key only enables search; sending SMS, email, or calls needs the separate Twilio and Resend setup in `frontend/src/lib/outreach/README.md`.
