-- A company e-mail with an open invitation gets the invitation's role (e.g. Survey admin) on first sign-in.
-- Before this, @totalcareegypt.com accounts always started as staff and the invitation was ignored.
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

  inv := private.open_invitation(null, new.email);

  if lower(new.email) like '%@totalcareegypt.com' then
    insert into profiles (id, email, full_name, role, department_id, phone, invited_via)
    values (new.id, lower(new.email),
            coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), inv.full_name, ''),
            case when lower(new.email) = private.owner_email() then 'admin' else coalesce(inv.role, 'staff') end,
            inv.department_id, coalesce(inv.phone, ''), inv.id);
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
