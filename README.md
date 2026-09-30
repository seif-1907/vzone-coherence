# The V-Zone Coherence: Next.js rebuild

Next.js 16 (App Router) · Supabase (Postgres, auth, file storage) · PayPal · Vimeo · Brevo · Jitsi · Vercel

## Setup (about 30 minutes)

1. **Supabase**: create a project, open the SQL editor and run `supabase/schema.sql`.
   Then in Authentication → URL configuration set the Site URL to your domain and add `https://YOURDOMAIN/auth/callback` as a redirect URL.
2. **Env vars**: copy `.env.example` to `.env.local` and fill it in (Supabase keys, PayPal, Brevo, `CRON_SECRET`).
3. `npm install && npm run dev`
4. Sign up on the site with Vilma's email, then in the SQL editor run:
   `update public.profiles set role = 'admin' where email = 'vilma@example.com';`
   She now sees "Instructor" in the header and gets the admin area at `/admin`.
5. **Deploy**: push to GitHub, import in Vercel, paste the same env vars, then add the domain `vzonecoherence.com` in Vercel → Domains and point the DNS records it shows.
6. **PayPal**: create a REST app at developer.paypal.com. Test with sandbox credentials (`PAYPAL_ENV=sandbox`), then switch to live credentials and `PAYPAL_ENV=live`.
7. **Brevo**: create a contact list, put its numeric id in `BREVO_LIST_ID`, add an API key, and verify the sender email/domain.
8. **Images**: the logo and Vilma photo in `public/images/` were cropped from screenshots (low resolution). Replace `logo.png` and `vilma.jpg` with the originals, and swap `pose-1..3.svg` for the real pose photos. To give a program card a background photo, paste an image URL in its "Cover image URL" field in the admin.

## How each agreed feature is covered

| Feature | Where |
|---|---|
| Add/remove course, content | `/admin/courses`, edit page: videos (Vimeo link), documents (upload), order, delete |
| Allow preview | Per video and per document toggle: free preview, public without login |
| Add/remove client | `/admin/clients`: invites by email, gives/removes access, deletes client |
| Access statistics | `/admin/stats` (per video: views, unique viewers, time watched) and per client page |
| Online classes | `/admin/live` schedules; rooms open at `/live/[id]` (embedded Jitsi) |
| Purchase, promo code | Cart → PayPal. Promo codes (percent or fixed, max uses, expiry) at `/admin/promos`. Prices are always computed on the server |
| Watch in order | Enforced in the database (`can_watch`): a video unlocks when the previous one reaches 90% |
| Reminders | Per-video reminders, live class and meeting reminders, plus a nudge to inactive learners (`/api/cron/reminders`) |
| Preview/download documents | Private storage, short-lived signed links, per-document download switch |
| Meetings schedule | `/account/schedule`: clients add meetings, see live classes, join rooms |
| Newsletter | Footer + signup checkbox → Brevo list. Admin can send an update at `/admin/newsletter` |
| Contact form | Same fields as the old site; saved and emailed to `CONTACT_TO_EMAIL` |

## Things to know

- **Reminder timing**: `vercel.json` runs the cron once a day (Vercel Hobby limit). For 1-hour-before reminders, either use Vercel Pro (`*/15 * * * *`) or point a free service like cron-job.org at `GET /api/cron/reminders` every 10 minutes with header `Authorization: Bearer <CRON_SECRET>`.
- **Video privacy**: in Vimeo set each video's privacy to "Hide from Vimeo" and restrict embedding to your domain. Video ids are only sent to people allowed to watch.
- **Live classes**: the public `meet.jit.si` server limits embedded calls. For real use, self-host Jitsi or use 8x8 JaaS and set `NEXT_PUBLIC_JITSI_DOMAIN` (JaaS also needs JWT tokens, which are not implemented yet).
- **Cover images** are pasted as URLs for now (no upload UI).
- The seed data creates the four offers from the old site (Start $300, Embody $500, ONE by application, LIVE $1). Edit prices and text in the admin.
