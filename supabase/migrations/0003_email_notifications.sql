-- E-mail notifications: instant e-mails for submissions and feedback, a daily/weekly summary,
-- and a note to management when a report is published. The sending happens in the `notify`
-- Edge Function (supabase/functions/notify); the database only tells it what happened.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- Settings (one row) and a log of sent e-mails, both admin-only
-- ---------------------------------------------------------------------------
create table public.notification_settings (
  id                 smallint primary key default 1 check (id = 1),
  notify_submissions boolean not null default true,
  notify_feedback    boolean not null default true,
  notify_reports     boolean not null default true,
  digest             text not null default 'weekly' check (digest in ('off', 'daily', 'weekly')),
  extra_recipients   text[] not null default '{}',
  app_url            text not null default '',
  updated_at         timestamptz not null default now()
);
insert into public.notification_settings (id) values (1);

alter table public.notification_settings enable row level security;
create policy "admin manages notification settings" on public.notification_settings
  for all to authenticated using (is_admin()) with check (is_admin());

create table public.email_log (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,
  subject    text not null default '',
  recipients text[] not null default '{}',
  status     text not null,
  error      text not null default '',
  created_at timestamptz not null default now()
);

alter table public.email_log enable row level security;
create policy "admin reads email log" on public.email_log
  for select to authenticated using (is_admin());

-- ---------------------------------------------------------------------------
-- Calling the Edge Function. The project URL and a shared secret live in Vault;
-- the function checks the secret so nobody else can trigger e-mails.
-- ---------------------------------------------------------------------------
create schema if not exists private;

create or replace function private.notify(payload jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  base text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url');
  secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'notify_secret');
begin
  if base is null or secret is null then
    return;
  end if;
  perform net.http_post(
    url := base || '/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', secret),
    body := payload
  );
end;
$$;

-- Lets the Edge Function (service role only) read the shared secret.
create or replace function public.notify_secret()
returns text
language sql stable security definer set search_path = public
as $$ select decrypted_secret from vault.decrypted_secrets where name = 'notify_secret' $$;
revoke execute on function public.notify_secret() from public, anon, authenticated;
grant execute on function public.notify_secret() to service_role;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function private.on_submission_sent()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'submitted' and old.status = 'draft' then
    perform private.notify(jsonb_build_object('type', 'submission', 'id', new.id));
  end if;
  return new;
end;
$$;

create trigger submissions_notify
  after update on public.submissions
  for each row execute function private.on_submission_sent();

create or replace function private.on_feedback_sent()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform private.notify(jsonb_build_object('type', 'feedback', 'id', new.id));
  return new;
end;
$$;

create trigger feedback_notify
  after insert on public.feedback
  for each row execute function private.on_feedback_sent();

create or replace function private.on_report_published()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.published and not coalesce(old.published, false) then
    perform private.notify(jsonb_build_object('type', 'report', 'id', new.id));
  end if;
  return new;
end;
$$;

create trigger reports_notify
  after update on public.reports
  for each row execute function private.on_report_published();

-- Every morning at 07:00 Cairo time (05:00 UTC). The function sends the summary daily,
-- or only on Sundays when set to weekly.
select cron.schedule('totalcare-digest', '0 5 * * *', $$ select private.notify('{"type":"digest_tick"}'::jsonb) $$);

-- One-time setup, run separately (values are not stored in the repo):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret(gen_random_uuid()::text, 'notify_secret');
