# TotalCare Organisation

The TotalCare Egypt people survey: every colleague reviews each department, names the best, says what holds the company back, and suggests ideas — safely, in simple English and Egyptian Arabic. The results turn into initiatives that everyone can follow.

The survey is the front door. The earlier community features (ideas board, kudos, sectors, points & rewards, polls) and the read-only org chart/directory are switched off in `src/lib/features.ts`; their code and data are kept and can be switched back on there.

## The survey (6 short steps, autosave, works offline)

1. **Your department**: the only question about the person (required). It's used to leave out a team's rating of itself; nothing else about the person is asked.
2. **Departments**: for each of the 8 departments — Marketing (التسويق), Installations (التركيبات), Collections (التحصيل), Accounting (الحسابات), Sales (المبيعات), Maintenance (الصيانة), Purchasing & Warehouses (المشتريات والمخازن), HR & Legal (الموارد البشرية والقانوني):
   1. your opinion from 1 to 10, 2. its biggest strengths, 3. its biggest weaknesses, 4. ideas to improve it.
   One department per screen with tabs; all four questions are required for all 8 departments. Your own department is marked and its score counted separately.
3. **The best**: best manager, best department and best employee — all 3 required for each, with an optional reason. Names are suggested from the staff list.
4. **The company**: biggest problems (3) and best strengths (3), all required, with tap-to-fill suggestions so similar answers are counted together.
5. **Ideas**: 5 ideas to develop the company (all required). *The best idea is rewarded and implemented where possible.*

**Staff see only the survey**: no menu and no other pages, just the survey and a sign-out button. **Drop-downs:** names come from the staff list, company problems and strengths from ready answers, and every department box has a "choose a common answer" menu; each has "Other — write it". **Every question is required.** Next stays on the step and lists what is missing (with a button to jump to each department), the steps ahead unlock once the earlier ones are complete, and Send is blocked until everything is answered. An answer needs at least one letter or number ("-" or "." don't count).

6. **Check & send**: a summary to review, the answer checks, and the choice to send **with my name** or **anonymously**.

**Answer checks (consistent answers).** Before sending, the survey asks once when answers don't fit together, and the person fixes them or confirms them:
- a department picked as one of the best but rated 4/10 or lower;
- a low score with only strengths written, or a 9–10 with only weaknesses;
- nominating yourself, or the same person twice (must be fixed — spelling variants such as "م. أحمد" and "احمد" count as the same name);
- the same score for every department, or the whole survey answered in under 3 minutes.
Each response gets an answer-quality score (0–100); the results page can leave out low-quality answers.

## Speaking up safely

- **Anonymous answers.** "Send anonymously" copies the answers into a new row with no author and only the date, then deletes the draft. A separate receipt records only that the person took part (no time, no link), so participation and the one-survey-per-person limit still work. Nobody — including the admin — can link the answers back to the person.
- **Reward for anonymous ideas.** An anonymous author with ideas gets a private reward code (e.g. `IDEA-7F3K9Q`). If their idea wins, the code is announced on "You said, we did" and they claim the reward with it.
- **Speak up safely** (`/speak-up`): a separate channel for sensitive matters (a manager, harassment, gifts or pressure in tenders, safety, pay). Messages are stored with no account, no time and no e-mail. The sender gets a case code to read the admin's reply.

## Initiatives — "You said, we did"

- The results page suggests initiatives: an **improvement plan** for each low-rated department (built from its weaknesses and ideas) and ready-made TotalCare plays for the most-named problems (e.g. a delegation-of-authority matrix for "too many signatures", a weekly collections war-room, Odoo-first instead of WhatsApp, a 90-day import plan, an EDA registration tracker).
- Any idea from the survey can be turned into an initiative in one click.
- Each initiative has an owner, KPI with today's value and target, start and deadline, impact and effort (with an impact × effort matrix showing quick wins), progress updates, and a "winning idea" flag.
- Staff see published initiatives with progress, and can **support** them or **volunteer** to help (counts are public, names only to management). Staff can also propose initiatives, which stay hidden until management approves them.

## Admin

- **Results dashboard** (`/admin`), with filters by department and named/anonymous (any filter leaving fewer than 3 answers is hidden), print/PDF and CSV export:
  - **Overview**: company score out of 10 (and 0–100 index), participation, anonymous share, answer quality, highlights (best/lowest-rated department, most praised, biggest complaint, top company strength and problem, most-nominated manager and employee), department ranking, and praise vs. complaints by theme.
  - **Departments**: a card per department (score, distribution, score index, self-rating, all comments, one-click improvement plan) and a "who rates whom" heat map.
  - **Best & worst**: praise and complaints sorted automatically into themes in English and Arabic (speed & delays, communication, approvals, payments, stock & parts, Odoo, staffing, training, attitude, quality, customers, planning) with example quotes, complaints by department, company problems and strengths, best- and lowest-rated departments.
  - **People**: best manager, department and employee podiums (3-2-1 points, spellings merged, reasons).
  - **Ideas & actions**: suggested initiatives and every idea, one click to an initiative.
  - **Audit**: answer quality, flagged answers with reasons, median time, completeness of each section, self-rating bias, own-department "best" votes, skipped departments and answers per day.
- **Coverage & invites**: answers per department against the headcount in the people directory, who hasn't answered yet (names only, never answers), and a ready Arabic/English WhatsApp invitation.
- **Responses**: each response (anonymous ones labelled 🔒), with its answer-quality score.
- **Speak-up inbox**: read and reply to anonymous messages, with status.
- **Survey settings & earlier pulse** (`/admin/pulse`): the earlier dashboard, the one-survey-per-person limit, "open a new round" and reset.

## Who can take part: invitations

Everyone can take part, with or without a company e-mail:

- **Company e-mail** (`@totalcareegypt.com`): sign in with the e-mail link, no invitation needed.
- **Any other e-mail** (Gmail, Yahoo…): the admin invites that address on **Admin → Invitations**; the person then signs in with the e-mail link as usual. Uninvited addresses are refused by the database.
- **No e-mail at all** (drivers, technicians, warehouse): the admin creates a personal invitation with the person's name, mobile and department and sends it with the **WhatsApp** button. The person opens the link on their phone, checks their name and taps **Join** — no e-mail or password. The phone stays signed in.
- **Team link**: one link for a WhatsApp group, limited to a number of people and days. Each person types their own name. Team links only create staff members.
- Personal links work once. Invitations expire after 30 days (extendable). A cancelled or used link stops working. If someone changes phone, cancel the old invitation and send a new one.
- **One person, one link, one vote:** every invitation is personal and works once. The first phone that opens it becomes that person's only account, so a forwarded link says "already used". There are no shared links. Company e-mails need an invitation too (`app_settings.invite_only`, on by default), and an e-mail invitation only works by signing in with that e-mail, not through its link. So the number of people who can answer equals the number of invitations, plus the super admin.
- **One tap:** opening an invitation link shows a welcome screen with one button, *Start the survey*. It signs the phone in, joins, and opens the first question. The name is optional. The link page says whose link it is ("I'm Hassan — start the survey").
- Until a person has joined through an invitation they can't start the survey, use Speak up, send feedback or support initiatives — enforced by the database (`profiles.active`).

**One-time Supabase setting for invitation links:** Authentication → Sign In / Providers → turn on **Allow anonymous sign-ins** (recommended: also turn on CAPTCHA protection under Authentication → Attack Protection). E-mail invitations and company e-mails work without this setting.

## Who sees what (confidential model)

| Role | Can see |
|---|---|
| staff | **Only their own** named answers (anonymous answers can't be seen by anyone as theirs), published initiatives with support counts, and replies to their own Speak-up case codes |
| super admin (`admin`) | **mohamed.omar@totalcareegypt.com**, set automatically at sign-in and locked: nobody can change or deactivate this account's role, and only this account can make another admin. All answers — the name only on answers sent **with a name**; anonymous answers and Speak-up messages have no name stored at all. Who has taken part (never which answers). Manages initiatives, the directory, roles and reports |
| survey admin (`distributor`) | Spreads the survey: creates and sends invitation links (staff only), the link for everyone, the people list with phones, who has joined and who hasn't answered yet, and answer **counts** per department. **No answers, results, Speak-up messages or roles.** Assigned by the super admin on **Users & roles** |
| management | **Published reports** (no names; departments with fewer than 3 responses merged) and all initiatives, including volunteers' names |

Staff are told this in the survey. The rules are enforced by Postgres row-level security and database functions (`supabase/migrations/0001_init.sql`, `0006_survey_v2.sql`), not only by the UI. `npm test` checks the answer checks and results; the migrations were also tested in a local Postgres against these rules (anonymous rows have no author and day-only dates, staff can't read Speak-up messages or others' support, proposals stay hidden until approved). Generated reports are drafts: the admin should read them and remove anything in the text that could identify a person before publishing.

## Setup

1. Create a Supabase project at https://supabase.com.
2. In the **SQL editor**, run the files in `supabase/migrations/` in order (`0006_survey_v2.sql` adds anonymous answers, Speak up safely and initiatives; `0007_invitations.sql` adds invitations; `0008_small_team_privacy.sql` keeps anonymous answers safe in a small team; `0009_roles_super_admin.sql` adds the super admin and survey admins and one-tap joining; `0010_hardening.sql` applies two small fixes from the Supabase security advisor; `0011_company_email_invitations.sql` lets an invitation give a company e-mail its role, e.g. Survey admin; `0012_one_person_one_link.sql` switches off shared links and makes everyone need an invitation, so votes can't exceed the number of people invited). Files run in the SQL editor don’t appear under Database → Migrations; that list only shows migrations applied through the CLI or API. Optionally run `supabase/seed.sql` for example data.
3. Under **Authentication → URL configuration**, set the Site URL to where the app will be hosted (for local development, `http://localhost:5173`).
4. Copy `.env.example` to `.env` and fill in the project URL and anon key from **Project Settings → API**.
5. Install and run:
   ```bash
   npm install
   npm run dev
   ```
6. Sign in with mohamed.omar@totalcareegypt.com: that account becomes the super admin automatically (`0009_roles_super_admin.sql`; to change the owner, edit `private.owner_email()` there and `OWNER_EMAIL` in `src/lib/roles.ts`). Then assign **Survey admin** and other roles on the **Users & roles** page.

`@totalcareegypt.com` addresses can sign up directly; everyone else needs an invitation (see above). The database enforces this in `handle_new_user` (`0007_invitations.sql`). To change the company domain, edit it there and in `VITE_ALLOWED_DOMAIN`.

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
