-- One survey per person (drafts count), with admin control over the limit.
--   * app_settings.submissions_per_person — the limit for everyone (default 1)
--   * submission_allowances.extra         — extra submissions for one person
-- Also an admin-only "reset data" function to clear test or old feedback.

create table public.app_settings (
  id                     int primary key default 1 check (id = 1),
  submissions_per_person int not null default 1 check (submissions_per_person between 1 and 50),
  updated_at             timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict do nothing;

alter table public.app_settings enable row level security;
create policy "everyone reads settings" on public.app_settings
  for select to authenticated using (true);
create policy "admin changes settings" on public.app_settings
  for update to authenticated using (is_admin()) with check (is_admin());

create table public.submission_allowances (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  extra   int not null default 0 check (extra between 0 and 50)
);
alter table public.submission_allowances enable row level security;
create policy "people read own allowance, admin reads all" on public.submission_allowances
  for select to authenticated using (user_id = auth.uid() or is_admin());
create policy "admin manages allowances" on public.submission_allowances
  for all to authenticated using (is_admin()) with check (is_admin());

create or replace function public.submission_limit_for(p_user uuid)
returns int
language sql stable security definer set search_path = public
as $$
  select (select submissions_per_person from app_settings where id = 1)
       + coalesce((select extra from submission_allowances where user_id = p_user), 0)
$$;
revoke execute on function public.submission_limit_for(uuid) from public, anon;

create or replace function public.enforce_submission_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from submissions where author_id = new.author_id) >= submission_limit_for(new.author_id) then
    raise exception 'You have already shared your view. The admin can open another round.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_submission_limit() from public, anon, authenticated;

create trigger submissions_limit
  before insert on public.submissions
  for each row execute function public.enforce_submission_limit();

-- How many surveys the signed-in person may start, and how many they have.
create or replace function public.my_submission_allowance()
returns table (allowed int, used int)
language sql stable security definer set search_path = public
as $$
  select submission_limit_for(auth.uid()),
         (select count(*)::int from submissions where author_id = auth.uid())
$$;
revoke execute on function public.my_submission_allowance() from public, anon;
grant execute on function public.my_submission_allowance() to authenticated;

-- Admin: clear all feedback and activity. Keeps people, departments, the directory,
-- rewards, polls, announcements and settings.
create or replace function public.admin_reset_data(p_confirm text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only the admin can reset data';
  end if;
  if p_confirm is distinct from 'RESET' then
    raise exception 'Type RESET to confirm';
  end if;
  truncate table submission_reviews, submissions, feedback, reports, email_log,
    idea_comments, idea_votes, idea_authors, ideas, kudos, poll_votes, redemptions, points_ledger;
  delete from submission_allowances;
end;
$$;
revoke execute on function public.admin_reset_data(text) from public, anon;
grant execute on function public.admin_reset_data(text) to authenticated;
