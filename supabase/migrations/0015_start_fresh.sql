-- "Start fresh": the super admin chooses exactly which earlier records to delete.
--   answers      every survey answer and draft, who-took-part records, extra allowances, review notes
--   messages     speak-up messages and app feedback
--   invitations  every invitation (used, waiting and cancelled)
--   link_accounts  accounts made by opening an invitation link (no e-mail). Answers they sent with
--                their name go with them; anonymous answers stay unless "answers" is chosen too.
--   initiatives  initiatives with their supporters and updates
-- The super admin's account, other e-mail accounts, departments and settings are never touched.
create or replace function public.admin_start_fresh(
  p_confirm text,
  p_answers boolean default false,
  p_messages boolean default false,
  p_invitations boolean default false,
  p_link_accounts boolean default false,
  p_initiatives boolean default false
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  n_answers int := 0; n_messages int := 0; n_invitations int := 0; n_accounts int := 0; n_initiatives int := 0;
begin
  if not is_owner() then
    raise exception 'Only the super admin can delete records';
  end if;
  if p_confirm is distinct from 'DELETE' then
    raise exception 'Type DELETE to confirm';
  end if;

  if p_answers then
    select count(*) into n_answers from submissions;
    delete from submission_reviews;
    delete from submissions;
    delete from submission_receipts;
    delete from submission_allowances;
  end if;
  if p_messages then
    select (select count(*) from safe_voice) + (select count(*) from feedback) into n_messages;
    delete from safe_voice;
    delete from feedback;
  end if;
  if p_link_accounts then
    select count(*) into n_accounts from profiles where email like '%@invite.local';
    delete from auth.users where id in (select id from profiles where email like '%@invite.local');
  end if;
  if p_invitations then
    select count(*) into n_invitations from invitations;
    delete from invitations;
  end if;
  if p_initiatives then
    select count(*) into n_initiatives from initiatives;
    delete from initiatives;
  end if;

  return jsonb_build_object('answers', n_answers, 'messages', n_messages, 'invitations', n_invitations,
                            'link_accounts', n_accounts, 'initiatives', n_initiatives);
end;
$$;
revoke execute on function public.admin_start_fresh(text, boolean, boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.admin_start_fresh(text, boolean, boolean, boolean, boolean, boolean) to authenticated;

-- The super admin can also delete a single response (e.g. one test answer) from its page.
create policy "super admin deletes responses" on public.submissions
  for delete to authenticated using (is_owner());
create policy "super admin deletes review notes" on public.submission_reviews
  for delete to authenticated using (is_owner());
