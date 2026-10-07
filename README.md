# Fatin & Arfan Wedding Invitation

A mobile-first Next.js wedding invitation using the supplied `Main Page.png` and `Background.png` artwork.

[Open the invitation](https://fatinandarfan.vercel.app/).

The wedding details are transcribed from the supplied invitation:

| Detail | Information |
| --- | --- |
| Bride | Fatin Syazwani binti Jeffri |
| Groom | Muhammad Arfan bin Mayiddin |
| Hosts | Jeffri bin Mat Jaafar & Sarina binti Mat Din @ Samsudin |
| Date | Sunday, 8 November 2026 |
| Time | 12:00–17:00, Asia/Kuala_Lumpur (UTC+08:00) |
| Venue | Dewan Semai Bakti Felda Teloi Timur, 09300 Kuala Ketil, Kedah |
| Contacts | Jeffri: 0135895304 · Sarina: 0194778469 · Fatin: 0194013804 |

## Run locally

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:3000`. To validate and run a production build:

```powershell
npm run typecheck
npm run build
npm start
```

## Deploy

Import this repository into a Next.js hosting service such as Vercel and use the repository root as the project directory. The included `vercel.json` specifies the Next.js framework. Share preview URLs use `NEXT_PUBLIC_SITE_URL` when supplied, otherwise the Vercel production URL. Supply `NEXT_PUBLIC_SITE_URL` when deploying with a different host or custom address.

The application includes a Node.js `/api/rsvp` route connected to the invitation's Supabase storage through a dedicated RSVP Edge Function. `src/lib/rsvp-config.ts` contains the endpoint and an invitation access key scoped to saving responses and listing public wishes. No project-wide database API key or service-role key is included in the repository. Hosting does not require additional RSVP environment variables for this configured invitation.

## Saved RSVP responses

Guests complete the RSVP form and select **Hantar RSVP**. A successful submission is saved to `public.fatin_arfan_rsvps`, and the invitation displays a confirmation without opening WhatsApp. Responses are stored centrally and survive browser refreshes or visits from another device. All saved nonempty guest wishes appear in the last section of the main invitation, newest first. The card loads the feed in pages of 100 until it reaches the end; there is no total wish-count cap.

The hosts can view names, attendance, party sizes, phone numbers, and wishes in the [Supabase Table Editor](https://supabase.com/dashboard/project/cirayzvtackcsxyzcwfx/editor?schema=public) by selecting **fatin_arfan_rsvps**. Sign in to the account that owns this project to view or export the full responses. The invitation uses a dedicated table in the existing free Supabase project `cirayzvtackcsxyzcwfx`.

Guest access allows inserting a response and reading only its public name, wish, identifier, and timestamp. The public `/api/rsvp` response contains `submissions` with `{ id, timestamp, name, wish }` and an opaque `nextCursor`. Request `/api/rsvp?cursor=...` for each next page until `nextCursor` is `null`. Cursors retain the exact database timestamp and identifier, so equal timestamps and newly inserted wishes do not shift the remaining pages. A successful POST also returns the safe saved `submission` receipt, even if refreshing the wishes feed fails. Attendance, party size, and phone numbers are excluded from all public API responses and cannot be selected with the publishable key. Guests have no update or delete permission.

`supabase/migrations/20261005145935_create_fatin_arfan_rsvps.sql` creates the dedicated table, row policies, column grants, and the `submit_fatin_arfan_rsvp` / `list_fatin_arfan_wishes` functions. The original migration files are retained for source history; the current invitation does not call their older table or functions.

`supabase/migrations/20261007154333_paginate_fatin_arfan_wishes.sql` adds the `list_fatin_arfan_wishes_page` function using a `(created_at, id)` cursor and the existing wish index. It adds no table privileges and retains the previous list function for older deployments. Apply both dedicated Fatin and Arfan migrations in filename order for a new database, then deploy `supabase/functions/fatin-arfan-rsvp/index.ts` with JWT verification disabled; its invitation-scoped header controls access. The Edge Function returns up to 101 safe rows per list call so the Next.js route can return 100 and determine whether another page exists.

To use a different RSVP endpoint, supply `RSVP_API_URL` and `RSVP_API_KEY` in `.env.local` and in the hosting settings. These optional values override the configured invitation defaults; blank values use the defaults. The endpoint must accept an `x-invitation-key` header and a JSON body containing `operation` (`save` or `list`) plus `parameters`, and return the safe database receipt or public wish rows. Deploy the matching Edge Function and dedicated migration to the destination project. Keep project-wide database API keys and service-role or secret keys out of this repository. Restart locally or redeploy after changing configuration, then verify a real saved response in the destination project's Table Editor.

## Attribution

The source card was adapted for this invitation. See `ATTRIBUTIONS.md` for notices covering bundled components and assets.
