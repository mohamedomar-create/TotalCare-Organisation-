# TotalCare Organisation

An internal web app for TotalCare Egypt:

- **Home**: shows each person their progress, with one button to start or continue.
- **Step-by-step submission**, a full-screen wizard in 7 steps with autosave and a progress bar. Everything is in simple English with Arabic underneath:
  1. About you: department and level, picked from buttons.
  2. Quick check: 8 short statements rated with one tap on a face scale.
  3. Your work: tap what you do (tenders, installation, EDA registration, Odoo and so on), or add your own.
  4. Problems: pick and rank your top 5 (approvals, WhatsApp instead of a system, collections, customs and so on).
  5. Org chart: a drag-and-drop board with departments as columns and levels as rows. Start from the suggested TotalCare structure, then drag ready-made roles between boxes, drop a role on the library to remove it, and tap a role to set its title, number of people, who it reports to and its duties.
  6. Ideas: your top 3 ideas, one thing to change tomorrow, and an eNPS score.
  7. Check and send.
- **Send feedback**: a button on every page that sends a quick idea, problem, question or praise to the admin.
- **Admin dashboard**: response rate, eNPS, average pulse scores, top challenges, a department filter and CSV export.
- **Admin inbox**: every submission and feedback note, with unread badges, search, review status and private notes.
- **Org chart and directory** showing departments, reporting lines and contacts.
- **Reports for management**: anonymised summaries with charts, published by the admin.

Inspiration: Typeform (one topic per screen), Culture Amp and Officevibe (pulse ratings, eNPS, pick-lists), and the TotalCare Org Board (drag-and-drop org chart).

## Who sees what (confidential model)

| Role | Can see |
|---|---|
| staff | Org chart, directory, and **only their own** submissions |
| admin | Everything, **including the author's name on each submission**; manages the directory, roles and reports |
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

## Deploying

`npm run build` produces a static site in `dist/` that can be hosted anywhere (Vercel, Netlify, Cloudflare Pages). Set the same `VITE_*` environment variables on the host, and configure single-page-app fallback so routes like `/vision` serve `index.html`.

## Tech

React + TypeScript (Vite), dnd-kit for drag and drop, React Flow for the read-only org chart, and Supabase for auth (e-mail magic link), Postgres and row-level security.
