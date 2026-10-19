# TotalCare Organisation

An internal web app for TotalCare Egypt:

- **Home**: shows each person their progress, with one button to start or continue.
- **Step-by-step submission**, a full-screen wizard in 7 steps with autosave and a progress bar:
  1. About you: department and level, picked from buttons.
  2. Quick pulse: 8 statements rated with one tap on a face scale.
  3. Your role: pick responsibilities from a list, or add your own.
  4. Challenges: pick and rank your top 5.
  5. Draw your vision: a drawing canvas. Start from a template or today's org chart, then drag shapes (leader, department, team, role, person, sticky note, area), double-click to type, and connect boxes with "reports to" or "works with" lines. It has colours, auto-arrange, undo/redo and duplicate.
  6. Ideas: your top 3 ideas, one quick win, and an eNPS score.
  7. Review and send.
- **Send feedback**: a button on every page that sends a quick idea, problem, question or praise to the admin.
- **Admin dashboard**: response rate, eNPS, average pulse scores, top challenges, a department filter and CSV export.
- **Admin inbox**: every submission and feedback note, with unread badges, search, review status and private notes.
- **Org chart and directory** showing departments, reporting lines and contacts.
- **Reports for management**: anonymised summaries with charts, published by the admin.

Inspiration: Typeform (one topic per screen), Culture Amp and Officevibe (pulse ratings, eNPS, pick-lists), Miro, Whimsical and Lucidchart (shape palette, templates, auto-layout), ChartHop (org chart).

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

The questions and pick-lists live in `src/lib/survey.ts`. Edit that file to change them.

## Deploying

`npm run build` produces a static site in `dist/` that can be hosted anywhere (Vercel, Netlify, Cloudflare Pages). Set the same `VITE_*` environment variables on the host, and configure single-page-app fallback so routes like `/vision` serve `index.html`.

## Tech

React + TypeScript (Vite), React Flow for the charts, and Supabase for auth (e-mail magic link), Postgres and row-level security.
