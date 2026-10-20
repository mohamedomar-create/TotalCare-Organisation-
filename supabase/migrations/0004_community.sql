-- Community: idea board, kudos, points & rewards, announcements, pulse polls, celebrations.
--
-- Privacy:
--   * Ideas are visible to all staff. An idea posted "without my name" never stores the author on the
--     public row; the author is kept in idea_authors, which only the admin (and the author) can read.
--   * Pulse poll answers are private; everyone sees only totals.
--   * Points history is private; the leaderboard shows totals only.

-- ---------------------------------------------------------------------------
-- Profile details used for sectors and celebrations (all optional)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column department_id uuid references public.departments (id) on delete set null,
  add column job_title     text not null default '',
  add column birthday      date,
  add column joined_on     date,
  add column show_birthday boolean not null default true;

-- Users may also change their own details, never their role (guard_profile_role already enforces this).

-- Basic staff list (no e-mails, no birthdays) for pickers, sectors and the leaderboard.
create or replace function public.staff_list()
returns table (id uuid, full_name text, job_title text, department_id uuid, joined_on date)
language sql stable security definer set search_path = public
as $$ select id, coalesce(nullif(full_name, ''), split_part(email, '@', 1)), job_title, department_id, joined_on from profiles order by 2 $$;

-- ---------------------------------------------------------------------------
-- Points
-- ---------------------------------------------------------------------------
create table public.points_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  points     integer not null,
  reason     text not null,
  created_at timestamptz not null default now()
);
create index on public.points_ledger (user_id);

alter table public.points_ledger enable row level security;
create policy "see own points, admin sees all" on public.points_ledger
  for select to authenticated using (user_id = auth.uid() or is_admin());

create or replace function private.give_points(target uuid, pts integer, why text)
returns void
language sql security definer set search_path = public
as $$ insert into points_ledger (user_id, points, reason) select target, pts, why where target is not null $$;

create or replace function public.leaderboard(max_rows integer default 10)
returns table (user_id uuid, full_name text, department_id uuid, points bigint)
language sql stable security definer set search_path = public
as $$
  select p.id, coalesce(nullif(p.full_name, ''), split_part(p.email, '@', 1)), p.department_id, sum(l.points)
  from points_ledger l join profiles p on p.id = l.user_id
  where l.reason not like 'Reward:%' and l.reason <> 'Reward request returned' -- spending points doesn't lower your rank
  group by p.id
  having sum(l.points) > 0
  order by 4 desc
  limit max_rows
$$;

create or replace function public.award_points(target uuid, pts integer, why text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Only an admin can award points'; end if;
  perform private.give_points(target, pts, why);
end;
$$;

-- Points for sending the survey.
create or replace function private.points_for_submission()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Once per person, so the survey can't be repeated just for points.
  if new.status = 'submitted' and old.status = 'draft'
     and not exists (select 1 from points_ledger where user_id = new.author_id and reason = 'Shared your view in the survey') then
    perform private.give_points(new.author_id, 50, 'Shared your view in the survey');
  end if;
  return new;
end;
$$;
create trigger submissions_points after update on public.submissions
  for each row execute function private.points_for_submission();

-- ---------------------------------------------------------------------------
-- Idea board
-- ---------------------------------------------------------------------------
create table public.ideas (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (length(trim(title)) between 3 and 140),
  body          text not null default '',
  department_id uuid references public.departments (id) on delete set null,
  category      text not null default 'improvement' check (category in ('improvement', 'customer', 'cost', 'people', 'process', 'other')),
  author_id     uuid references public.profiles (id) on delete set null, -- null when posted without a name
  anonymous     boolean not null default false,
  status        text not null default 'new' check (status in ('new', 'review', 'planned', 'done', 'declined')),
  admin_note    text not null default '',
  votes         integer not null default 0,
  comments      integer not null default 0,
  hidden        boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.idea_authors (
  idea_id   uuid primary key references public.ideas (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade
);

create table public.idea_votes (
  idea_id    uuid references public.ideas (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

create table public.idea_comments (
  id         uuid primary key default gen_random_uuid(),
  idea_id    uuid not null references public.ideas (id) on delete cascade,
  author_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

alter table public.ideas enable row level security;
alter table public.idea_authors enable row level security;
alter table public.idea_votes enable row level security;
alter table public.idea_comments enable row level security;

create policy "staff read visible ideas" on public.ideas
  for select to authenticated using (not hidden or is_admin());
create policy "admin moderates ideas" on public.ideas
  for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin deletes ideas" on public.ideas
  for delete to authenticated using (is_admin());

create policy "author or admin sees idea author" on public.idea_authors
  for select to authenticated using (author_id = auth.uid() or is_admin());

create policy "staff read votes" on public.idea_votes for select to authenticated using (true);
create policy "staff vote" on public.idea_votes for insert to authenticated with check (user_id = auth.uid());
create policy "staff unvote" on public.idea_votes for delete to authenticated using (user_id = auth.uid());

create policy "staff read comments" on public.idea_comments for select to authenticated using (true);
create policy "staff comment" on public.idea_comments for insert to authenticated with check (author_id = auth.uid());
create policy "author or admin deletes comment" on public.idea_comments
  for delete to authenticated using (author_id = auth.uid() or is_admin());

-- Posting goes through this function so the author of a nameless idea is never on the public row.
create or replace function public.post_idea(p_title text, p_body text, p_department uuid, p_category text, p_anonymous boolean)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into ideas (title, body, department_id, category, author_id, anonymous)
  values (trim(p_title), coalesce(p_body, ''), p_department, coalesce(p_category, 'improvement'),
          case when p_anonymous then null else auth.uid() end, p_anonymous)
  returning id into new_id;
  insert into idea_authors (idea_id, author_id) values (new_id, auth.uid());
  perform private.give_points(auth.uid(), 10, 'Shared an idea');
  perform private.notify(jsonb_build_object('type', 'idea', 'id', new_id));
  return new_id;
end;
$$;

create or replace function private.on_vote()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  owner uuid;
begin
  if tg_op = 'INSERT' then
    update ideas set votes = votes + 1 where id = new.idea_id;
    select author_id into owner from idea_authors where idea_id = new.idea_id;
    if owner is distinct from new.user_id then
      perform private.give_points(owner, 2, 'A colleague liked your idea');
    end if;
    return new;
  else
    update ideas set votes = greatest(votes - 1, 0) where id = old.idea_id;
    return old;
  end if;
end;
$$;
create trigger idea_votes_count after insert or delete on public.idea_votes
  for each row execute function private.on_vote();

create or replace function private.on_comment()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update ideas set comments = comments + 1 where id = new.idea_id;
    return new;
  else
    update ideas set comments = greatest(comments - 1, 0) where id = old.idea_id;
    return old;
  end if;
end;
$$;
create trigger idea_comments_count after insert or delete on public.idea_comments
  for each row execute function private.on_comment();

create or replace function private.on_idea_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  owner uuid := (select author_id from idea_authors where idea_id = new.id);
begin
  if new.status is distinct from old.status then
    if new.status = 'planned' then perform private.give_points(owner, 25, 'Your idea was planned'); end if;
    if new.status = 'done' then perform private.give_points(owner, 100, 'Your idea was put into action'); end if;
  end if;
  return new;
end;
$$;
create trigger ideas_status_points after update on public.ideas
  for each row execute function private.on_idea_status();

-- ---------------------------------------------------------------------------
-- Kudos (peer recognition)
-- ---------------------------------------------------------------------------
create table public.kudos (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_id      uuid not null references public.profiles (id) on delete cascade,
  value      text not null check (value in ('teamwork', 'customer', 'integrity', 'innovation', 'extra_mile', 'helping')),
  message    text not null check (length(trim(message)) between 3 and 500),
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);

alter table public.kudos enable row level security;
create policy "staff read kudos" on public.kudos for select to authenticated using (true);
create policy "staff give kudos" on public.kudos for insert to authenticated with check (from_id = auth.uid());
create policy "admin removes kudos" on public.kudos for delete to authenticated using (is_admin() or from_id = auth.uid());

create or replace function private.on_kudos()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform private.give_points(new.to_id, 10, 'A colleague thanked you');
  -- Givers earn points for their first 5 kudos each week, so the wall stays sincere.
  if (select count(*) from kudos where from_id = new.from_id and created_at > now() - interval '7 days') <= 5 then
    perform private.give_points(new.from_id, 5, 'You thanked a colleague');
  end if;
  return new;
end;
$$;
create trigger kudos_points after insert on public.kudos
  for each row execute function private.on_kudos();

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null default '',
  pinned     boolean not null default false,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;
create policy "staff read announcements" on public.announcements for select to authenticated using (true);
create policy "management posts announcements" on public.announcements
  for all to authenticated using (is_management()) with check (is_management());

-- ---------------------------------------------------------------------------
-- Pulse polls (one quick question; answers private, totals public)
-- ---------------------------------------------------------------------------
create table public.polls (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  question_ar text not null default '',
  options     jsonb not null default '["😞","🙁","😐","🙂","😄"]',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.poll_votes (
  poll_id    uuid references public.polls (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete cascade default auth.uid(),
  choice     smallint not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
create policy "staff read polls" on public.polls for select to authenticated using (true);
create policy "admin manages polls" on public.polls for all to authenticated using (is_admin()) with check (is_admin());
create policy "see own poll answer" on public.poll_votes for select to authenticated using (user_id = auth.uid());
create policy "answer a poll" on public.poll_votes for insert to authenticated with check (user_id = auth.uid());

create or replace function public.poll_results(p_poll uuid)
returns table (choice smallint, votes bigint)
language sql stable security definer set search_path = public
as $$ select choice, count(*) from poll_votes where poll_id = p_poll group by choice $$;

create or replace function private.on_poll_vote()
returns trigger
language plpgsql security definer set search_path = public
as $$ begin perform private.give_points(new.user_id, 2, 'Answered the pulse poll'); return new; end; $$;
create trigger poll_votes_points after insert on public.poll_votes
  for each row execute function private.on_poll_vote();

insert into public.polls (question, question_ar) values
  ('How was your week at work?', 'أسبوعك في الشغل كان عامل إزاي؟');

-- ---------------------------------------------------------------------------
-- Rewards shop
-- ---------------------------------------------------------------------------
create table public.rewards (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  title_ar    text not null default '',
  description text not null default '',
  cost        integer not null check (cost > 0),
  emoji       text not null default '🎁',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.redemptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reward_id  uuid not null references public.rewards (id) on delete cascade,
  cost       integer not null,
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;
create policy "staff read rewards" on public.rewards for select to authenticated using (active or is_admin());
create policy "admin manages rewards" on public.rewards for all to authenticated using (is_admin()) with check (is_admin());
create policy "see own redemptions, admin all" on public.redemptions for select to authenticated using (user_id = auth.uid() or is_admin());

-- Asking for a reward reserves the points straight away; a rejection gives them back.
create or replace function public.redeem(p_reward uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  r rewards;
  balance bigint;
  new_id uuid;
begin
  select * into r from rewards where id = p_reward and active;
  if r.id is null then raise exception 'This reward is not available'; end if;
  select coalesce(sum(points), 0) into balance from points_ledger where user_id = auth.uid();
  if balance < r.cost then raise exception 'Not enough points yet'; end if;
  insert into redemptions (user_id, reward_id, cost) values (auth.uid(), r.id, r.cost) returning id into new_id;
  insert into points_ledger (user_id, points, reason) values (auth.uid(), -r.cost, 'Reward: ' || r.title);
  perform private.notify(jsonb_build_object('type', 'redemption', 'id', new_id));
  return new_id;
end;
$$;

create or replace function public.decide_redemption(p_id uuid, p_approve boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  d redemptions;
begin
  if not is_admin() then raise exception 'Only an admin can decide'; end if;
  select * into d from redemptions where id = p_id and status = 'pending';
  if d.id is null then raise exception 'Already decided'; end if;
  update redemptions set status = case when p_approve then 'approved' else 'rejected' end where id = p_id;
  if not p_approve then
    insert into points_ledger (user_id, points, reason) values (d.user_id, d.cost, 'Reward request returned');
  end if;
end;
$$;

insert into public.rewards (title, title_ar, description, cost, emoji) values
  ('Coffee on TotalCare', 'قهوة على حساب TotalCare', 'A coffee voucher for you and a colleague.', 100, '☕'),
  ('Lunch with the MD', 'غداء مع العضو المنتدب', 'Share your ideas over lunch with the Managing Director.', 300, '🍽️'),
  ('Shopping voucher', 'قسيمة شراء', 'A voucher for a store of your choice.', 500, '🛍️'),
  ('Extra day off', 'يوم إجازة إضافي', 'One extra paid day off, agreed with your manager.', 800, '🌴');

-- ---------------------------------------------------------------------------
-- Celebrations: birthdays (no year) and work anniversaries this month
-- ---------------------------------------------------------------------------
create or replace function public.celebrations()
returns table (user_id uuid, full_name text, department_id uuid, kind text, day integer, years integer)
language sql stable security definer set search_path = public
as $$
  select id, coalesce(nullif(full_name, ''), split_part(email, '@', 1)), department_id, 'birthday', extract(day from birthday)::int, null::int
  from profiles
  where birthday is not null and show_birthday and extract(month from birthday) = extract(month from now() at time zone 'Africa/Cairo')
  union all
  select id, coalesce(nullif(full_name, ''), split_part(email, '@', 1)), department_id,
         case when joined_on > (now() - interval '60 days')::date then 'welcome' else 'anniversary' end,
         extract(day from joined_on)::int,
         extract(year from age(now(), joined_on))::int
  from profiles
  where joined_on is not null
    and (joined_on > (now() - interval '60 days')::date
         or (extract(month from joined_on) = extract(month from now() at time zone 'Africa/Cairo') and joined_on < (now() - interval '300 days')::date))
  order by 5
$$;

-- ---------------------------------------------------------------------------
-- Function permissions
-- ---------------------------------------------------------------------------
revoke execute on function private.give_points(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.staff_list(), public.leaderboard(integer), public.award_points(uuid, integer, text),
  public.post_idea(text, text, uuid, text, boolean), public.poll_results(uuid), public.redeem(uuid),
  public.decide_redemption(uuid, boolean), public.celebrations() from public, anon;
grant execute on function public.staff_list(), public.leaderboard(integer), public.award_points(uuid, integer, text),
  public.post_idea(text, text, uuid, text, boolean), public.poll_results(uuid), public.redeem(uuid),
  public.decide_redemption(uuid, boolean), public.celebrations() to authenticated;

-- Points for surveys sent before points existed.
insert into public.points_ledger (user_id, points, reason, created_at)
select author_id, 50, 'Shared your view in the survey', min(coalesce(submitted_at, now()))
from public.submissions where status = 'submitted' group by author_id;
