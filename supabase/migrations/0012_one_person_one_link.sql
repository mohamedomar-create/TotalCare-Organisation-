-- One person, one link, one vote.
--   * Shared links (team links, the link for everyone) are switched off: every invitation works once,
--     and the first phone that opens it becomes that person's only account. A forwarded link that was
--     already opened says "already used".
--   * Invite-only: a company e-mail without an invitation can sign in but can't take part until
--     invited, so the number of people who can answer equals the number of invitations
--     (plus the super admin). Turn it off with: update app_settings set invite_only = false;
update public.invitations set revoked = true where max_uses > 1 and not revoked;
alter table public.invitations add constraint invitations_personal_only check (max_uses = 1) not valid;

alter table public.app_settings add column if not exists invite_only boolean not null default true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  inv invitations;
  owner boolean := lower(coalesce(new.email, '')) = private.owner_email();
begin
  if coalesce(new.is_anonymous, false) or new.email is null then
    insert into profiles (id, email, full_name, active)
    values (new.id, 'guest-' || new.id || '@invite.local', '', false);
    return new;
  end if;

  inv := private.open_invitation(null, new.email);

  if lower(new.email) like '%@totalcareegypt.com' then
    insert into profiles (id, email, full_name, role, department_id, phone, invited_via, active)
    values (new.id, lower(new.email),
            coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), inv.full_name, ''),
            case when owner then 'admin' else coalesce(inv.role, 'staff') end,
            inv.department_id, coalesce(inv.phone, ''), inv.id,
            owner or inv.id is not null or not coalesce((select invite_only from app_settings where id = 1), true));
    if inv.id is not null then
      update invitations set uses = uses + 1, used_by = new.id, last_used_at = now() where id = inv.id;
    end if;
    return new;
  end if;

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

-- An invited company e-mail that signed in before being invited: the invitation activates it on its next visit.
create or replace function public.claim_email_invitation()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me profiles;
  inv invitations;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null or me.active or me.email like '%@invite.local' then
    return;
  end if;
  inv := private.open_invitation(null, me.email);
  if inv.id is null then
    return;
  end if;
  perform set_config('app.redeeming_invite', 'on', true);
  update profiles set active = true, role = inv.role,
    full_name = coalesce(nullif(me.full_name, ''), inv.full_name),
    department_id = coalesce(inv.department_id, me.department_id), invited_via = inv.id
  where id = me.id;
  perform set_config('app.redeeming_invite', 'off', true);
  update invitations set uses = uses + 1, used_by = me.id, last_used_at = now() where id = inv.id;
end;
$$;
revoke execute on function public.claim_email_invitation() from public, anon;
grant execute on function public.claim_email_invitation() to authenticated;

-- An e-mail invitation is used by signing in with that e-mail, never through its link code,
-- so one invitation can't become two accounts (a phone and a mailbox).
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
  if inv.email is not null then
    raise exception 'This invitation is for %. Sign in with that e-mail instead.', inv.email;
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
