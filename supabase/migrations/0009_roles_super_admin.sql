-- Super admin and survey admins.
--
--   * mohamed.omar@totalcareegypt.com is the super admin (role 'admin'): every right, every dashboard.
--     The role is given automatically at sign-in and can't be taken away from inside the app.
--     Only the super admin can make someone else an admin.
--   * New role 'distributor' (shown as "Survey admin"): spreads the survey to every member. They can
--     create and send invitation links (staff only), see who has joined and who hasn't answered yet,
--     and the number of answers per department. They can't read any answers, results, speak-up
--     messages or roles.
--   * Joining by link is one tap: the name is optional, also on team links.

create or replace function private.owner_email()
returns text language sql immutable as $$ select 'mohamed.omar@totalcareegypt.com'::text $$;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('staff', 'management', 'distributor', 'admin'));
alter table public.invitations drop constraint if exists invitations_role_check;
alter table public.invitations add constraint invitations_role_check check (role in ('staff', 'management', 'distributor', 'admin'));

-- The super admin, if the account already exists.
update public.profiles set role = 'admin', active = true where lower(email) = private.owner_email();

create or replace function public.is_distributor()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from profiles where id = auth.uid() and role in ('distributor', 'admin') and active) $$;
revoke execute on function public.is_distributor() from public, anon;
grant execute on function public.is_distributor() to authenticated;

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from profiles where id = auth.uid() and lower(email) = private.owner_email() and role = 'admin') $$;
revoke execute on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

-- New accounts: as in 0007, plus the super admin's e-mail always becomes admin.
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
    insert into profiles (id, email, full_name, role)
    values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', ''),
            case when lower(new.email) = private.owner_email() then 'admin' else 'staff' end);
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

create or replace function public.guard_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  in_app boolean := auth.uid() is not null; -- the SQL editor and the service role are trusted
  redeeming boolean := coalesce(current_setting('app.redeeming_invite', true), '') = 'on';
begin
  if new.role is distinct from old.role and in_app then
    if lower(old.email) = private.owner_email() then
      raise exception 'The super admin''s role can''t be changed';
    end if;
    if not is_admin() and not redeeming then
      raise exception 'Only an admin can change roles';
    end if;
    if new.role = 'admin' and not is_owner() and not redeeming then
      raise exception 'Only the super admin can make someone an admin';
    end if;
  end if;
  if new.email is distinct from old.email then
    raise exception 'E-mail cannot be changed here';
  end if;
  if new.active and not old.active and in_app and not is_admin() and not redeeming then
    raise exception 'Use an invitation to join';
  end if;
  if not new.active and old.active and in_app and lower(old.email) = private.owner_email() then
    raise exception 'The super admin can''t be deactivated';
  end if;
  return new;
end;
$$;

-- Invitations: survey admins create and manage staff invitations; only admins invite other roles or delete.
drop policy if exists "admin manages invitations" on public.invitations;
create policy "survey admins read invitations" on public.invitations
  for select to authenticated using (is_distributor());
create policy "survey admins invite staff" on public.invitations
  for insert to authenticated with check (is_admin() or (is_distributor() and role = 'staff'));
create policy "survey admins update staff invitations" on public.invitations
  for update to authenticated using (is_admin() or (is_distributor() and role = 'staff'))
  with check (is_admin() or (is_distributor() and role = 'staff'));
create policy "admin deletes invitations" on public.invitations
  for delete to authenticated using (is_admin());
-- Admin invitations can only come from the super admin.
create or replace function public.guard_invitation_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role = 'admin' and auth.uid() is not null and not is_owner() then
    raise exception 'Only the super admin can invite an admin';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_invitation_role() from public, anon, authenticated;
create trigger invitations_guard_role before insert or update on public.invitations
  for each row execute function public.guard_invitation_role();

-- Survey admins see the people list (names, phones) to send reminders; not answers.
create policy "survey admins read people" on public.profiles
  for select to authenticated using (is_distributor());

-- Who has taken part (never what they answered): for reminders.
create or replace function public.survey_participants()
returns table (user_id uuid)
language sql stable security definer set search_path = public
as $$
  select author_id from submissions where status = 'submitted' and author_id is not null and is_distributor()
  union
  select user_id from submission_receipts where is_distributor()
$$;

-- Answers per department (counts only), for the coverage page.
create or replace function public.survey_dept_counts()
returns table (dept text, answers int)
language sql stable security definer set search_path = public
as $$
  select coalesce(answers ->> 'my_dept', ''), count(*)::int
  from submissions
  where status = 'submitted' and answers ->> 'v' = '2' and is_distributor()
  group by 1
$$;
revoke execute on function public.survey_dept_counts() from public, anon;
grant execute on function public.survey_dept_counts() to authenticated;

-- One-tap joining: the name is optional on every link.
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
    raise exception 'This invitation link is not valid any more. Ask HR for a new one.';
  end if;
  perform set_config('app.redeeming_invite', 'on', true);
  update profiles set
    active = true,
    full_name = coalesce(nullif(trim(coalesce(p_name, '')), ''), inv.full_name),
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
