-- TotalCare Organisation: schema, roles and row-level security.
--
-- Privacy model ("confidential"):
--   * staff      – see the directory/org chart, create and see ONLY their own submissions.
--   * admin      – sees every submission WITH the author's name, manages the directory,
--                  user roles, and builds/publishes reports.
--   * management – sees ONLY published reports. Reports never contain author ids or names.
-- Staff are told this on the submission form.

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  full_name  text not null default '',
  role       text not null default 'staff' check (role in ('staff', 'management', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create or replace function public.is_management()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from profiles where id = auth.uid() and role in ('management', 'admin')) $$;

-- Only company e-mail addresses may sign up. Change the domain here if needed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if lower(new.email) not like '%@totalcareegypt.com' then
    raise exception 'Only @totalcareegypt.com accounts can sign up';
  end if;
  insert into profiles (id, email, full_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their own name but never their own role. Requests with no signed-in
-- user (the SQL editor, the service role) are trusted, which is how the first admin is set.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  if new.email is distinct from old.email then
    raise exception 'E-mail cannot be changed here';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

alter table public.profiles enable row level security;
create policy "read own profile or admin reads all" on public.profiles
  for select using (id = auth.uid() or is_admin());
create policy "update own profile or admin updates any" on public.profiles
  for update using (id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------------
-- Directory: departments and people (staff need not have an account)
-- ---------------------------------------------------------------------------
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text not null default '',
  color       text not null default '#2563eb',
  created_at  timestamptz not null default now()
);

create table public.people (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  title         text not null default '',
  department_id uuid references public.departments (id) on delete set null,
  manager_id    uuid references public.people (id) on delete set null,
  email         text not null default '',
  phone         text not null default '',
  location      text not null default '',
  created_at    timestamptz not null default now(),
  check (manager_id is null or manager_id <> id)
);

alter table public.departments enable row level security;
alter table public.people enable row level security;

create policy "signed-in users read departments" on public.departments
  for select to authenticated using (true);
create policy "admin writes departments" on public.departments
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "signed-in users read people" on public.people
  for select to authenticated using (true);
create policy "admin writes people" on public.people
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Submissions: each staff member's vision of the organisation
-- ---------------------------------------------------------------------------
create table public.submissions (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  department_id    uuid references public.departments (id) on delete set null,
  structure        jsonb not null default '{"nodes": [], "edges": []}',
  responsibilities text not null default '',
  challenges       text not null default '',
  suggestions      text not null default '',
  status           text not null default 'draft' check (status in ('draft', 'submitted')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  submitted_at     timestamptz
);

create or replace function public.touch_submission()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.author_id := old.author_id;
  if new.status = 'submitted' and old.status = 'draft' then
    new.submitted_at := now();
  end if;
  return new;
end;
$$;

create trigger submissions_touch
  before update on public.submissions
  for each row execute function public.touch_submission();

alter table public.submissions enable row level security;

create policy "authors read own, admin reads all" on public.submissions
  for select to authenticated using (author_id = auth.uid() or is_admin());
create policy "authors create their own" on public.submissions
  for insert to authenticated with check (author_id = auth.uid());
-- Authors can keep editing drafts; once submitted it is locked.
create policy "authors edit own drafts" on public.submissions
  for update to authenticated using (author_id = auth.uid() and status = 'draft')
  with check (author_id = auth.uid());
create policy "authors delete own drafts" on public.submissions
  for delete to authenticated using (author_id = auth.uid() and status = 'draft');

-- ---------------------------------------------------------------------------
-- Reports: anonymised summaries for management
-- ---------------------------------------------------------------------------
create table public.reports (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  summary        text not null default '',
  stats          jsonb not null default '{}',
  structures     jsonb not null default '[]',
  published      boolean not null default false,
  published_at   timestamptz,
  created_at     timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "admin manages reports" on public.reports
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "management reads published reports" on public.reports
  for select to authenticated using (published and is_management());
