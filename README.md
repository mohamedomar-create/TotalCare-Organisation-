# TotalCare Organisation

An internal staff hub for TotalCare Egypt, where people share ideas, thank each other, speak up safely and help shape the organisation.

**Community and loyalty**
- **Home**: a greeting, your points and level, one-tap actions (share an idea, thank a colleague, the survey, speak up safely), news, top ideas, recent thank-yous, a weekly pulse poll, birthdays, work anniversaries and new joiners.
- **Ideas board**: anyone can post an idea, with or without their name. Colleagues like it and comment on it. The admin moves it through New → Under review → Planned → Done (or Not now) and can add a management reply. Ideas posted without a name show "A colleague from Sales", and only the admin can see who wrote them.
- **Kudos wall**: public thank-yous tagged with a TotalCare value (teamwork, customer first, integrity, fresh idea, extra mile, always helping), plus the month's most-thanked colleagues.
- **Sectors**: a colour-coded page for each department, showing its team, ideas and thank-yous.
- **Points and rewards**: points for taking part, levels from Newcomer to Legend, badges, a leaderboard and a rewards shop (coffee, lunch with the MD, vouchers, a day off). The admin approves reward requests.
- **Pulse polls**: one quick question at a time. Answers are private, and only totals are shown.
- **My profile**: sector, job title, birthday (day and month only) and joining date.
- **Admin → Community**: approve reward requests, edit the shop, post announcements (management can do this too), run polls and award points.

**Organisation survey**
- **Survey progress**: each person's progress, with one button to start or continue.
- **Step-by-step submission**, a full-screen wizard in 7 steps with autosave and a progress bar. Everything is in simple English with Arabic underneath:
  1. About you: department and level, picked from buttons.
  2. Quick check: 8 short statements rated with one tap on a face scale.
  3. Your work: tap what you do (tenders, installation, EDA registration, Odoo and so on), or add your own.
  4. Problems: pick and rank your top 5 (approvals, WhatsApp instead of a system, collections, customs and so on).
  5. Org chart: a drag-and-drop board with departments as columns and levels as rows (Owners, Managing Director, Managers, Supervisors, Staff). Start from a suggested structure of general roles such as Sales Manager or Finance Manager, then drag ready-made roles between boxes, drop a role on the library to remove it, and tap a role to set its title, number of people, who it reports to and its duties.
  6. Ideas: your top 3 ideas, one thing to change tomorrow, and an eNPS score.
  7. Check and send.
- **Send feedback**: a button on every page that sends a quick idea, problem, question or praise to the admin.
- **Executive dashboard**: participation, a 0–100 health index, eNPS, auto-written key findings, health by area, a department × area heat map, biggest problems, survey trend, the ideas pipeline, period and department filters, CSV export and print/PDF.
- **Survey control**: one survey per person by default. The admin can open a new round for everyone, give one person +1 on the Users page, or reset all data.
- **Admin inbox**: every submission and feedback note, with unread badges, search, review status and private notes.
- **Org chart and directory** showing departments, reporting lines and contacts.
- **Reports for management**: anonymised summaries with charts, published by the admin.
- **E-mail**: the admin gets an e-mail for every submission, feedback note, new idea (including the real author of an anonymous idea) and reward request, plus a daily or weekly summary of all results. Management gets an e-mail when a report is published. Configure this on the admin **E-mail** page.

Inspiration: Typeform (one topic per screen), Culture Amp and Officevibe (pulse ratings, eNPS, pick-lists), and the TotalCare Org Board (drag-and-drop org chart).

## Who sees what (confidential model)

| Role | Can see |
|---|---|
| staff | Org chart, directory, and **only their own** submissions |
| admin | Everything, **including the author's name on each submission**; manages the directory, roles and reports |
| everyone | Ideas (anonymous ones without a name), kudos, sectors, announcements, poll totals, the leaderboard, their own points |
| management | **Only published reports**. These contain no names, and departments with fewer than 3 responses are merged into one group |

Staff are told this on the submission form. The rules are enforced by Postgres row-level security (`supabase/migrations/0001_init.sql`), not only by the UI. Generated reports are drafts: the admin should read them and remove anything in the text that could identify a person before publishing.

## Setup

1. Create a Supabase project at https://supabase.com.
2. In the **SQL editor**, run the files in `supabase/migrations/` in order. Optionally run `supabase/seed.sql` for example data.
3. Under **Authentication → URL configuration**, set the Site URL to where the app will be hosted (for local development, `http://localhost:5173`).
4. Copy `.env.example` to `.env` and fill in the project URL and anon key from **Project Settings → API**.
5. Install and run:
   ```bash
   npm install
   npm run dev
   ```
6. Sign in once with your own work e-mail, then make yourself admin in the SQL editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@totalcareegypt.com';
   ```
   After that, assign `management` and other roles from the **Users** page.

Only `@totalcareegypt.com` addresses can sign up. The database enforces this in `handle_new_user`. To change the domain, edit it there and in `VITE_ALLOWED_DOMAIN`.

The questions and pick-lists live in `src/lib/survey.ts`. The org-chart departments, levels and ready-made roles live in `src/lib/orgBoard.ts`. Edit those files to change them.

## E-mail

E-mails are sent by the `notify` Edge Function (`supabase/functions/notify`) through [Resend](https://resend.com). Database triggers call it when something is submitted, and `pg_cron` calls it every morning for the summary.

1. Run `supabase/migrations/0003_email_notifications.sql`, then create the two Vault secrets listed at the bottom of that file.
2. Deploy the function: `supabase functions deploy notify --no-verify-jwt`.
3. In Resend, verify your domain (for example `totalcareegypt.com`) and create an API key.
4. In Supabase, go to **Edge Functions → Secrets** and add `RESEND_API_KEY`, plus `EMAIL_FROM` (for example `TotalCare Organisation <noreply@totalcareegypt.com>`).
5. Open **Admin → E-mail** in the app and press **Send test e-mail**.

## Deploying

`npm run build` produces a static site in `dist/` that can be hosted anywhere (Vercel, Netlify, Cloudflare Pages). Set the same `VITE_*` environment variables on the host, and configure single-page-app fallback so routes like `/vision` serve `index.html`.

## Tech

React + TypeScript (Vite), dnd-kit for drag and drop, React Flow for the read-only org chart, and Supabase for auth (e-mail magic link), Postgres and row-level security.
