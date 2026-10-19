# TotalCare Organisation

An internal web app for TotalCare Egypt:

- **Org chart**: departments, roles and reporting lines, with contact details.
- **Team directory**: searchable staff contacts, filterable by department.
- **My vision**: each staff member can draw the structure they'd like to see (boxes and reporting lines) and describe responsibilities, challenges and suggestions.
- **Reports for management**: the admin turns submissions into an anonymised summary and publishes it to management.

## Who sees what (confidential model)

| Role | Can see |
|---|---|
| staff | Org chart, directory, and **only their own** submissions |
| admin | Everything, **including the author's name on each submission**; manages the directory, roles and reports |
| management | **Only published reports**. These contain no names, and departments with fewer than 3 responses are merged into one group |

Staff are told this on the submission form. The rules are enforced by Postgres row-level security (`supabase/migrations/0001_init.sql`), not only by the UI. Generated reports are drafts: the admin should read them and remove anything in the text that could identify a person before publishing.

## Setup

1. Create a Supabase project at https://supabase.com.
2. In the **SQL editor**, run `supabase/migrations/0001_init.sql`. Optionally run `supabase/seed.sql` for example data.
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

## Deploying

`npm run build` produces a static site in `dist/` that can be hosted anywhere (Vercel, Netlify, Cloudflare Pages). Set the same `VITE_*` environment variables on the host, and configure single-page-app fallback so routes like `/vision` serve `index.html`.

## Tech

React + TypeScript (Vite), React Flow for the charts, and Supabase for auth (e-mail magic link), Postgres and row-level security.
