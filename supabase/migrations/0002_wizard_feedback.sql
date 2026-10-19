-- Step-by-step submissions, quick feedback to the admin, and admin review tracking.

-- ---------------------------------------------------------------------------
-- Richer submissions (all answers optional; filled in step by step)
-- ---------------------------------------------------------------------------
alter table public.submissions
  add column role_level        text not null default '',
  add column ratings           jsonb not null default '{}',
  add column responsibility_tags text[] not null default '{}',
  add column challenge_tags    text[] not null default '{}',
  add column ideas             jsonb not null default '[]',
  add column quick_win         text not null default '',
  add column enps              smallint check (enps between 0 and 10),
  add column current_step      smallint not null default 0;

-- Admin-only review state, kept apart so authors never see admin notes.
create table public.submission_reviews (
  submission_id uuid primary key references public.submissions (id) on delete cascade,
  status        text not null default 'new' check (status in ('new', 'reviewed', 'actioned')),
  notes         text not null default '',
  updated_at    timestamptz not null default now()
);

alter table public.submission_reviews enable row level security;
create policy "admin manages reviews" on public.submission_reviews
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Quick feedback: a short message to the admin from anywhere in the app
-- ---------------------------------------------------------------------------
create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category   text not null default 'idea' check (category in ('idea', 'issue', 'question', 'praise')),
  message    text not null check (length(trim(message)) > 0),
  status     text not null default 'new' check (status in ('new', 'read', 'done')),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
create policy "authors send feedback" on public.feedback
  for insert to authenticated with check (author_id = auth.uid());
create policy "authors read own, admin reads all" on public.feedback
  for select to authenticated using (author_id = auth.uid() or is_admin());
create policy "admin updates feedback" on public.feedback
  for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin deletes feedback" on public.feedback
  for delete to authenticated using (is_admin());

-- Authors cannot change who wrote feedback or its admin status.
create or replace function public.guard_feedback()
returns trigger
language plpgsql set search_path = public
as $$
begin
  new.author_id := old.author_id;
  return new;
end;
$$;

create trigger feedback_guard
  before update on public.feedback
  for each row execute function public.guard_feedback();

revoke execute on function public.guard_feedback() from public, anon, authenticated;
