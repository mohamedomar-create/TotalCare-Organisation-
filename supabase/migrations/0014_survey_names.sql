-- Names for the "best manager / best employee" drop-downs: everyone invited plus everyone who joined,
-- so the full staff list is there from the first answer (not only people who already signed in).
-- Members only; returns names, nothing else.
create or replace function public.survey_names()
returns table (name text)
language sql stable security definer set search_path = public
as $$
  select distinct trim(n) as name from (
    select full_name as n from invitations where not revoked and role <> 'admin'
    union all
    select full_name from profiles where active
  ) x
  where is_member() and length(trim(coalesce(n, ''))) >= 2
  order by 1
$$;
revoke execute on function public.survey_names() from public, anon;
grant execute on function public.survey_names() to authenticated;
