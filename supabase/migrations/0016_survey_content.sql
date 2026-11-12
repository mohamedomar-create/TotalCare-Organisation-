-- Survey wording the super admin can edit: question texts, answer-choice lists and department names.
-- Only the changes are stored; the app fills everything else with the original wording.
create table public.survey_content (
  id          int primary key default 1 check (id = 1),
  content     jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);
insert into public.survey_content (id) values (1) on conflict do nothing;
alter table public.survey_content enable row level security;
create policy "members read the survey wording" on public.survey_content
  for select to authenticated using (true);
create policy "super admin edits the survey wording" on public.survey_content
  for update to authenticated using (is_owner()) with check (is_owner());

create or replace function private.touch_survey_content()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
create trigger survey_content_touch before update on public.survey_content
  for each row execute function private.touch_survey_content();
