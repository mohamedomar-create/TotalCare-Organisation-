-- Invitations: let anyone take part — with a company e-mail, any other e-mail, or no e-mail at all.
--
--   * Company e-mails (@totalcareegypt.com) can sign in as before.
--   * Any other e-mail can sign in only if the admin invited that address.
--   * People without e-mail open a personal invitation link (sent on WhatsApp). The app signs them in
--     anonymously on their phone, and redeem_invite() turns that session into a member with their name
--     and department. This needs "Anonymous sign-ins" switched on in Supabase (see the README).
--   * Until someone has joined through an invitation, they can't answer, send feedback or support
--     initiatives (profiles.active = false).

alter table public.profiles
  add column active     boolean not null default true,
  add column phone      text not null default '',
  add column invited_via uuid;

create table public.invitations (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  full_name     text not null default '',
  email         text,                                   -- set for e-mail invitations (any domain)
  phone         text not null default '',
  department_id uuid references public.departments (id) on delete set null,
  role          text not null default 'staff' check (role in ('staff', 'management', 'admin')),
  max_uses      int not null default 1 check (max_uses between 1 and 500), -- >1 = a team link
  uses          int not null default 0,
  expires_at    timestamptz not null default now() + interval '30 days',
  revoked       boolean not null default false,
  used_by       uuid references public.profiles (id) on delete set null,
  last_used_at  timestamptz,
  created_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  -- A shared team link can only make staff members; management and admin need a personal invitation.
  check (max_uses = 1 or role = 'staff'),
  check (email is null or max_uses = 1)
);
create unique index invitations_email_open on public.invitations (lower(email)) where email is not null and not revoked;
alter table public.invitations enable row level security;
create policy "admin manages invitations" on public.invitations
  for all to authenticated using (is_admin()) with check (is_admin());

alter table public.profiles
  add constraint profiles_invited_via_fkey foreign key (invited_via) references public.invitations (id) on delete set null;

create or replace function public.is_member()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select active from profiles where id = auth.uid()), false) $$;
revoke execute on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;

-- An invitation that can still be used.
create or replace function private.open_invitation(p_code text, p_email text)
returns invitations
language sql stable security definer set search_path = public
as $$
  select * from invitations
  where not revoked and expires_at > now() and uses < max_uses
    and ((p_code is not null and code = upper(trim(p_code))) or (p_email is not null and lower(email) = lower(trim(p_email))))
  order by created_at desc limit 1
$$;
revoke execute on function private.open_invitation(text, text) from public, anon, authenticated;

-- New accounts: company e-mail, invited e-mail, or an anonymous phone session waiting for its code.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  inv invitations;
begin
  if coalesce(new.is_anonymous, false) or new.email is null then
    insert into profiles (id, email, full_name, active)
    values (new.id, 'guest-' || new.id || '@invite.local', '', false);
    return new;
  end if;

  if lower(new.email) like '%@totalcareegypt.com' then
    insert into profiles (id, email, full_name)
    values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
    return new;
  end if;

  inv := private.open_invitation(null, new.email);
  if inv.id is null then
    raise exception 'This e-mail has not been invited. Ask HR or the survey admin for an invitation.';
  end if;
  insert into profiles (id, email, full_name, role, department_id, phone, invited_via)
  values (new.id, lower(new.email),
          coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), inv.full_name),
          inv.role, inv.department_id, inv.phone, inv.id);
  update invitations set uses = uses + 1, used_by = new.id, last_used_at = now() where id = inv.id;
  return new;
end;
$$;

-- Role changes stay admin-only, except while redeem_invite() applies the role the admin chose.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not is_admin()
     and coalesce(current_setting('app.redeeming_invite', true), '') <> 'on' then
    raise exception 'Only an admin can change roles';
  end if;
  if new.email is distinct from old.email then
    raise exception 'E-mail cannot be changed here';
  end if;
  if new.active and not old.active and auth.uid() is not null and not is_admin()
     and coalesce(current_setting('app.redeeming_invite', true), '') <> 'on' then
    raise exception 'Use an invitation to join';
  end if;
  return new;
end;
$$;

-- What the join page shows before signing in: just the name it was made for and whether it still works.
create or replace function public.invite_preview(p_code text)
returns table (full_name text, department text, valid boolean, team boolean)
language sql stable security definer set search_path = public
as $$
  select i.full_name, coalesce(d.name, ''), (not i.revoked and i.expires_at > now() and i.uses < i.max_uses), i.max_uses > 1
  from invitations i left join departments d on d.id = i.department_id
  where i.code = upper(trim(p_code))
$$;
revoke execute on function public.invite_preview(text) from public;
grant execute on function public.invite_preview(text) to anon, authenticated;

-- Turn the signed-in (usually anonymous) session into a member.
create or replace function public.redeem_invite(p_code text, p_name text default '')
returns void
language plpgsql security definer set search_path = public
as $$
declare
  inv invitations;
  me profiles;
begin
  if auth.uid() is null then
    raise exception 'Please open the link again';
  end if;
  select * into me from profiles where id = auth.uid();
  if me.active then
    return; -- already a member: nothing to do
  end if;
  inv := private.open_invitation(p_code, null);
  if inv.id is null then
    raise exception 'This invitation code is not valid any more. Ask HR for a new one.';
  end if;
  if inv.max_uses > 1 and length(trim(coalesce(p_name, ''))) < 3 then
    raise exception 'Please write your full name';
  end if;
  perform set_config('app.redeeming_invite', 'on', true);
  update profiles set
    active = true,
    full_name = coalesce(nullif(trim(p_name), ''), inv.full_name),
    role = inv.role,
    department_id = inv.department_id,
    phone = inv.phone,
    invited_via = inv.id
  where id = auth.uid();
  perform set_config('app.redeeming_invite', 'off', true);
  update invitations set uses = uses + 1, used_by = auth.uid(), last_used_at = now() where id = inv.id;
end;
$$;
revoke execute on function public.redeem_invite(text, text) from public, anon;
grant execute on function public.redeem_invite(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Only members can take part
-- ---------------------------------------------------------------------------
drop policy "authors create their own" on public.submissions;
create policy "members create their own" on public.submissions
  for insert to authenticated with check (author_id = auth.uid() and is_member());

drop policy "authors send feedback" on public.feedback;
create policy "members send feedback" on public.feedback
  for insert to authenticated with check (author_id = auth.uid() and is_member());

drop policy "people support" on public.initiative_supporters;
create policy "members support" on public.initiative_supporters
  for insert to authenticated with check (user_id = auth.uid() and is_member());

drop policy "anyone proposes" on public.initiatives;
create policy "members propose" on public.initiatives
  for insert to authenticated with check (is_management() or (is_member() and status = 'proposed' and not visible and created_by = auth.uid()));

create or replace function public.safe_voice_send(p_category text, p_message text, p_department uuid default null)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  if not is_member() then
    raise exception 'Please join with your invitation first';
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

-- People who haven't joined yet don't count, and don't appear in name pickers.
create or replace function public.survey_progress()
returns table (responses int, people int)
language sql stable security definer set search_path = public
as $$
  select ((select count(distinct author_id) from submissions where status = 'submitted' and author_id is not null)
        + (select count(distinct user_id) from submission_receipts))::int,
         (select count(*) from profiles where active)::int
$$;

create or replace function public.staff_list()
returns table (id uuid, full_name text, job_title text, department_id uuid, joined_on date)
language sql stable security definer set search_path = public
as $$ select id, coalesce(nullif(full_name, ''), split_part(email, '@', 1)), job_title, department_id, joined_on from profiles where active order by 2 $$;
