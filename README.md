# Fatin & Arfan Wedding Invitation

A mobile-first Next.js wedding invitation using the supplied `Main Page.png` and `Background.png` artwork.

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

Import this repository into a Next.js hosting service such as Vercel and use the repository root as the project directory. The included `vercel.json` specifies the Next.js framework. Set `NEXT_PUBLIC_SITE_URL` to the actual public invitation URL, then rebuild, so shared preview images use the correct address.

The application includes a Node.js `/api/rsvp` route. Its database integration requires environment configuration; uploading this repository alone does not provision a database or make RSVP storage operational.

## RSVP setup

No live database is configured in this repository. The wishes list starts empty, with no sample guest responses. When storage is unconfigured, the API reports `configured: false` and accepts no submissions. Guests can prepare their attendance details in the form and open a WhatsApp message to Fatin; they must send that message in WhatsApp to confirm their response.

To enable shared RSVP storage:

1. Create a separate Supabase project for Fatin and Arfan.
2. Run the SQL files in `supabase/migrations/` in filename order. They create `public.rsvp_submissions`, the `submit_rsvp` and `list_public_rsvps` functions, and the guest permissions.
3. Copy `.env.example` to `.env.local` for local development and supply `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Add the same variables to the hosting project for deployment. Use the publishable key, not a service-role key.
4. Restart locally or redeploy after changing environment variables. Verify one real test submission in the new project's Table Editor before sharing the invitation.

Phone numbers are stored for the hosts and are excluded from the public wishes API. Public guests can submit responses and read names, attendance, party size, and wishes; the migrations grant no guest update or delete access. Do not reuse the previous invitation's database or credentials.

## Attribution

The source card was adapted for this invitation. See `ATTRIBUTIONS.md` for notices covering bundled components and assets.
