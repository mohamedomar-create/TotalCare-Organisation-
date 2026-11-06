-- Survey v2: richer answers, truly anonymous answers, a safe-voice channel and initiatives.
--
-- Privacy additions:
--   * Anonymous answers. When someone sends the survey anonymously, their draft is copied into a NEW
--     row with no author and day-only dates, and the draft is deleted. A separate receipt records only
--     that the person took part (no time, no link to the answers), so participation and the
--     one-survey-per-person limit still work. Nobody, including the admin, can link the answers back.
--   * Safe voice. Messages are stored with no author at all. The sender gets a random case code to read
--     the admin's reply later.

-- ---------------------------------------------------------------------------
-- Richer answers
-- ---------------------------------------------------------------------------
alter table public.submissions
  add column answers   jsonb not null default '{}',   -- tenure, location, stay intent, volunteering…
  add column quality   jsonb not null default '{}',   -- answer-consistency check, filled when sending
  add column anonymous boolean not null default false;

-- Anonymous rows have no author.
alter table public.submissions alter column author_id drop not null;

-- Proof of taking part, kept apart from the answers. No timestamp on purpose.
create table public.submission_receipts (
  id      bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade
);
alter table public.submission_receipts enable row level security;
create policy "people read own receipts, admin reads all" on public.submission_receipts
  for select to authenticated using (user_id = auth.uid() or is_admin());

-- The limit counts both normal submissions and anonymous receipts.
create or replace function public.enforce_submission_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.author_id is null then
    return new; -- anonymous copies are created by submit_survey, which checks the limit itself
  end if;
  if (select count(*) from submissions where author_id = new.author_id)
     + (select count(*) from submission_receipts where user_id = new.author_id)
     >= submission_limit_for(new.author_id) then
    raise exception 'You have already shared your view. The admin can open another round.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.my_submission_allowance()
returns table (allowed int, used int)
language sql stable security definer set search_path = public
as $$
  select submission_limit_for(auth.uid()),
         (select count(*)::int from submissions where author_id = auth.uid())
       + (select count(*)::int from submission_receipts where user_id = auth.uid())
$$;

-- Points are only for named answers (an anonymous answer must not leave a trace on a person).
create or replace function private.points_for_submission()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.author_id is not null and new.status = 'submitted' and old.status = 'draft'
     and not exists (select 1 from points_ledger where user_id = new.author_id and reason = 'Shared your view in the survey') then
    perform private.give_points(new.author_id, 50, 'Shared your view in the survey');
  end if;
  return new;
end;
$$;

-- Send the survey. With p_anonymous the answers move to a new, unlinked row.
create or replace function public.submit_survey(p_id uuid, p_anonymous boolean, p_quality jsonb default '{}')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  d submissions;
  new_id uuid;
begin
  select * into d from submissions where id = p_id;
  if d.id is null or d.author_id is distinct from auth.uid() then
    raise exception 'Survey not found';
  end if;
  if d.status <> 'draft' then
    raise exception 'This survey was already sent';
  end if;

  if not p_anonymous then
    update submissions set status = 'submitted', quality = coalesce(p_quality, '{}'), anonymous = false where id = p_id;
    return p_id;
  end if;

  insert into submissions (author_id, department_id, structure, responsibilities, challenges, suggestions, status,
                           created_at, updated_at, submitted_at, role_level, ratings, responsibility_tags,
                           challenge_tags, ideas, quick_win, enps, current_step, answers, quality, anonymous)
  values (null, d.department_id, d.structure, d.responsibilities, d.challenges, d.suggestions, 'submitted',
          date_trunc('day', now()), date_trunc('day', now()), date_trunc('day', now()), d.role_level, d.ratings,
          d.responsibility_tags, d.challenge_tags, d.ideas, d.quick_win, d.enps, d.current_step,
          d.answers, coalesce(p_quality, '{}'), true)
  returning id into new_id;

  delete from submissions where id = p_id;
  insert into submission_receipts (user_id) values (auth.uid());
  perform private.notify(jsonb_build_object('type', 'submission', 'id', new_id));
  return new_id;
end;
$$;
revoke execute on function public.submit_survey(uuid, boolean, jsonb) from public, anon;
grant execute on function public.submit_survey(uuid, boolean, jsonb) to authenticated;

-- Company-wide progress for the home page: totals only.
create or replace function public.survey_progress()
returns table (responses int, people int)
language sql stable security definer set search_path = public
as $$
  select ((select count(distinct author_id) from submissions where status = 'submitted' and author_id is not null)
        + (select count(distinct user_id) from submission_receipts))::int,
         (select count(*) from profiles)::int
$$;
revoke execute on function public.survey_progress() from public, anon;
grant execute on function public.survey_progress() to authenticated;

-- Who has taken part (for the admin's coverage view and reminders). Names only, never answers.
create or replace function public.survey_participants()
returns table (user_id uuid)
language sql stable security definer set search_path = public
as $$
  select author_id from submissions where status = 'submitted' and author_id is not null and is_admin()
  union
  select user_id from submission_receipts where is_admin()
$$;
revoke execute on function public.survey_participants() from public, anon;
grant execute on function public.survey_participants() to authenticated;

-- ---------------------------------------------------------------------------
-- Safe voice: anonymous messages with a case code
-- ---------------------------------------------------------------------------
create table public.safe_voice (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  category      text not null default 'concern'
                check (category in ('concern', 'harassment', 'ethics', 'safety', 'manager', 'pay', 'idea', 'other')),
  message       text not null check (length(trim(message)) between 5 and 4000),
  department_id uuid references public.departments (id) on delete set null,
  status        text not null default 'new' check (status in ('new', 'in_review', 'resolved')),
  reply         text not null default '',
  created_at    date not null default current_date,   -- day only, so the time can't point to a person
  replied_at    date
);
alter table public.safe_voice enable row level security;
-- Nobody inserts directly (that would record who did it); only the admin reads and replies.
create policy "admin reads safe voice" on public.safe_voice
  for select to authenticated using (is_admin());
create policy "admin replies to safe voice" on public.safe_voice
  for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin deletes safe voice" on public.safe_voice
  for delete to authenticated using (is_admin());

create or replace function public.safe_voice_send(p_category text, p_message text, p_department uuid default null)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;
  loop
    c := 'TC-';
    for i in 1..8 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from safe_voice where code = c);
  end loop;
  insert into safe_voice (code, category, message, department_id) values (c, coalesce(p_category, 'concern'), trim(p_message), p_department);
  return c;
end;
$$;
revoke execute on function public.safe_voice_send(text, text, uuid) from public, anon;
grant execute on function public.safe_voice_send(text, text, uuid) to authenticated;

create or replace function public.safe_voice_check(p_code text)
returns table (category text, status text, reply text, created_at date, replied_at date)
language sql stable security definer set search_path = public
as $$
  select category, status, reply, created_at, replied_at from safe_voice where code = upper(trim(p_code))
$$;
revoke execute on function public.safe_voice_check(text) from public, anon;
grant execute on function public.safe_voice_check(text) to authenticated;

create or replace function private.on_safe_voice_reply()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.reply is distinct from old.reply and new.reply <> '' then
    new.replied_at := current_date;
  end if;
  return new;
end;
$$;
create trigger safe_voice_reply before update on public.safe_voice
  for each row execute function private.on_safe_voice_reply();

-- ---------------------------------------------------------------------------
-- Initiatives: what we do about the results ("You said, we did")
-- ---------------------------------------------------------------------------
create table public.initiatives (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (length(trim(title)) between 3 and 160),
  description   text not null default '',
  theme         text not null default '',          -- survey area key or problem label it answers
  owner_name    text not null default '',
  department_id uuid references public.departments (id) on delete set null,
  status        text not null default 'proposed'
                check (status in ('proposed', 'approved', 'in_progress', 'done', 'parked')),
  impact        smallint not null default 3 check (impact between 1 and 5),
  effort        smallint not null default 3 check (effort between 1 and 5),
  kpi           text not null default '',          -- e.g. "Approval time for hospital orders"
  baseline      text not null default '',          -- e.g. "5 days"
  target        text not null default '',          -- e.g. "2 days"
  start_date    date,
  due_date      date,
  progress      smallint not null default 0 check (progress between 0 and 100),
  visible       boolean not null default true,     -- shown to all staff
  source        text not null default '',          -- where it came from, e.g. the survey idea it grew from
  rewarded      boolean not null default false,    -- the idea behind it won the best-idea reward
  reward_code   text not null default '',          -- for an anonymous idea: the code its author keeps to claim the reward
  created_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.initiative_supporters (
  initiative_id uuid not null references public.initiatives (id) on delete cascade,
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind          text not null check (kind in ('support', 'volunteer')),
  created_at    timestamptz not null default now(),
  primary key (initiative_id, user_id, kind)
);

create table public.initiative_updates (
  id            uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives (id) on delete cascade,
  author_id     uuid default auth.uid() references public.profiles (id) on delete set null,
  body          text not null check (length(trim(body)) > 0),
  progress      smallint check (progress between 0 and 100),
  created_at    timestamptz not null default now()
);

alter table public.initiatives enable row level security;
alter table public.initiative_supporters enable row level security;
alter table public.initiative_updates enable row level security;

create policy "staff read visible initiatives, managers read all, authors read own" on public.initiatives
  for select to authenticated using (visible or is_management() or created_by = auth.uid());
-- Anyone can propose an initiative; it stays hidden until management approves it.
create policy "anyone proposes" on public.initiatives
  for insert to authenticated with check (is_management() or (status = 'proposed' and not visible and created_by = auth.uid()));
create policy "management edits initiatives" on public.initiatives
  for update to authenticated using (is_management()) with check (is_management());
create policy "management deletes initiatives" on public.initiatives
  for delete to authenticated using (is_management());

create policy "people see own support, management sees all" on public.initiative_supporters
  for select to authenticated using (user_id = auth.uid() or is_management());
create policy "people support" on public.initiative_supporters
  for insert to authenticated with check (user_id = auth.uid());
create policy "people withdraw support" on public.initiative_supporters
  for delete to authenticated using (user_id = auth.uid());

create policy "updates follow initiative visibility" on public.initiative_updates
  for select to authenticated using (exists (select 1 from initiatives i where i.id = initiative_id and (i.visible or is_management())));
create policy "management posts updates" on public.initiative_updates
  for insert to authenticated with check (is_management());
create policy "management deletes updates" on public.initiative_updates
  for delete to authenticated using (is_management());

create or replace function private.touch_initiative()
returns trigger
language plpgsql set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger initiatives_touch before update on public.initiatives
  for each row execute function private.touch_initiative();

-- An update with a progress value moves the initiative's progress.
create or replace function private.on_initiative_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.progress is not null then
    update initiatives set progress = new.progress,
      status = case when new.progress >= 100 then 'done' when status in ('proposed', 'approved') and new.progress > 0 then 'in_progress' else status end
    where id = new.initiative_id;
  end if;
  return new;
end;
$$;
create trigger initiative_updates_progress after insert on public.initiative_updates
  for each row execute function private.on_initiative_update();

-- Support and volunteer counts for everyone (names stay with management).
create or replace function public.initiative_counts()
returns table (initiative_id uuid, supporters int, volunteers int)
language sql stable security definer set search_path = public
as $$
  select s.initiative_id,
         count(*) filter (where s.kind = 'support')::int,
         count(*) filter (where s.kind = 'volunteer')::int
  from initiative_supporters s
  join initiatives i on i.id = s.initiative_id
  where i.visible or is_management()
  group by s.initiative_id
$$;
revoke execute on function public.initiative_counts() from public, anon;
grant execute on function public.initiative_counts() to authenticated;

revoke execute on function private.on_safe_voice_reply(), private.touch_initiative(), private.on_initiative_update()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reset also clears the new survey data (initiatives are kept: they are the plan, not the feedback).
-- ---------------------------------------------------------------------------
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
  truncate table submission_reviews, submissions, submission_receipts, feedback, safe_voice, reports, email_log,
    idea_comments, idea_votes, idea_authors, ideas, kudos, poll_votes, redemptions, points_ledger;
  delete from submission_allowances;
end;
$$;
