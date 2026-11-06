-- Small hardening from the Supabase security advisor (no behaviour change):
--   * admin_reset_data already refuses anyone but an admin; signed-out visitors now can't call it at all.
--   * owner_email() gets a fixed search_path.
revoke execute on function public.admin_reset_data(text) from public, anon;
grant execute on function public.admin_reset_data(text) to authenticated;

create or replace function private.owner_email()
returns text language sql immutable set search_path = '' as $$ select 'mohamed.omar@totalcareegypt.com'::text $$;
