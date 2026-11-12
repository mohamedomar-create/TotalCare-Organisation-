-- Results are for the super admin and management only. Survey admins (and staff) see completion numbers:
-- how many were invited, joined, sent the survey, or started without sending — never scores or comments.

-- results_summary: same numbers as 0013, but only the super admin and management may read them.
do $$
declare
  src text := pg_get_functiondef('public.results_summary()'::regprocedure);
begin
  src := replace(src,
    'if not (is_admin() or is_management() or (is_member() and published)) then',
    'if not (is_admin() or is_management()) then');
  execute src;
end;
$$;

-- Completion only: counts, nothing about what anyone answered.
create or replace function public.survey_completion()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case when is_distributor() or is_management() then jsonb_build_object(
    'invited',     (select count(*) from invitations where not revoked)::int,
    'joined',      (select count(*) from profiles where active and lower(email) <> private.owner_email())::int,
    'sent',        ((select count(*) from submissions where status = 'submitted')
                    )::int,
    'in_progress', (select count(*) from submissions where status = 'draft')::int
  ) end
$$;
revoke execute on function public.survey_completion() from public, anon;
grant execute on function public.survey_completion() to authenticated;
