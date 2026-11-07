-- Results for everyone: one function returns only safe, combined numbers for the results page.
--   * Nobody gets raw answers from it: only counts, averages and answers given by several people.
--   * A department's score is shown only when 3+ people from OTHER departments rated it
--     (a team's rating of itself is left out).
--   * A written answer is shown only when 2+ people gave the same answer, so a sentence
--     can't point to the person who wrote it. Names in "the best" need 2+ votes.
--   * The super admin and management can always open it; everyone else only after the
--     super admin presses "Share with everyone" (app_settings.results_published).

alter table public.app_settings add column if not exists results_published boolean not null default false;

-- The super admin switches sharing on and off.
create or replace function public.set_results_published(p_on boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only the super admin can share the results';
  end if;
  update app_settings set results_published = p_on where id = 1;
end;
$$;
revoke execute on function public.set_results_published(boolean) from public, anon;
grant execute on function public.set_results_published(boolean) to authenticated;

create or replace function private.norm(t text)
returns text language sql immutable set search_path = '' as $$
  select lower(regexp_replace(trim(coalesce(t, '')), '\s+', ' ', 'g'))
$$;

create or replace function public.results_summary()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  published boolean := coalesce((select results_published from app_settings where id = 1), false);
  out jsonb;
begin
  if not (is_admin() or is_management() or (is_member() and published)) then
    return jsonb_build_object('published', false, 'allowed', false);
  end if;

  with subs as (
    select answers a from submissions where status = 'submitted' and answers ->> 'v' = '2'
  ),
  ratings as (
    select d.key as dept, (d.value ->> 'score')::numeric as score, s.a ->> 'my_dept' as rater
    from subs s, jsonb_each(case when jsonb_typeof(s.a -> 'depts') = 'object' then s.a -> 'depts' else '{}'::jsonb end) d
    where jsonb_typeof(d.value -> 'score') = 'number' and coalesce(d.value ->> 'skip', 'false') <> 'true'
  ),
  others as (select * from ratings where rater is distinct from dept),
  dept_scores as (
    select dept, count(*)::int as n, round(avg(score), 1) as avg,
           count(*) filter (where score >= 9)::int as high, count(*) filter (where score <= 4)::int as low
    from others group by dept
  ),
  dept_text as (
    select d.key as dept, f.field, trim(t) as txt
    from subs s,
         jsonb_each(case when jsonb_typeof(s.a -> 'depts') = 'object' then s.a -> 'depts' else '{}'::jsonb end) d,
         lateral (values ('strengths', d.value ->> 'strengths'), ('weaknesses', d.value ->> 'weaknesses')) f(field, val),
         lateral unnest(string_to_array(coalesce(f.val, ''), ',')) t
    where trim(t) <> '' and (s.a ->> 'my_dept') is distinct from d.key
  ),
  dept_text_top as (
    select dept, field, min(txt) as txt, count(*)::int as cnt,
           row_number() over (partition by dept, field order by count(*) desc, min(txt)) as rk
    from dept_text group by dept, field, private.norm(txt)
    having count(*) >= 2
  ),
  company as (
    select 'problems' as kind, trim(x) as txt from subs s, jsonb_array_elements_text(case when jsonb_typeof(s.a -> 'company_problems') = 'array' then s.a -> 'company_problems' else '[]'::jsonb end) x
    union all
    select 'strengths', trim(x) from subs s, jsonb_array_elements_text(case when jsonb_typeof(s.a -> 'company_strengths') = 'array' then s.a -> 'company_strengths' else '[]'::jsonb end) x
  ),
  company_top as (
    select kind, min(txt) as txt, count(*)::int as cnt,
           row_number() over (partition by kind order by count(*) desc, min(txt)) as rk
    from company where txt <> '' group by kind, private.norm(txt)
    having count(*) >= 2
  ),
  noms as (
    select 'managers' as kind, n.value ->> 'name' as name, n.ord::int as ord
    from subs s, jsonb_array_elements(case when jsonb_typeof(s.a -> 'best_managers') = 'array' then s.a -> 'best_managers' else '[]'::jsonb end) with ordinality n(value, ord)
    union all
    select 'employees', n.value ->> 'name', n.ord::int
    from subs s, jsonb_array_elements(case when jsonb_typeof(s.a -> 'best_employees') = 'array' then s.a -> 'best_employees' else '[]'::jsonb end) with ordinality n(value, ord)
    union all
    select 'departments', n.value #>> '{}', n.ord::int
    from subs s, jsonb_array_elements(case when jsonb_typeof(s.a -> 'best_departments') = 'array' then s.a -> 'best_departments' else '[]'::jsonb end) with ordinality n(value, ord)
  ),
  nom_top as (
    select kind, min(trim(name)) as name, sum(4 - least(ord, 3))::int as points, count(*)::int as votes,
           count(*) filter (where ord = 1)::int as firsts,
           row_number() over (partition by kind order by sum(4 - least(ord, 3)) desc, count(*) desc, min(trim(name))) as rk
    from noms where trim(coalesce(name, '')) <> '' and ord <= 3
    group by kind, private.norm(name)
    having count(*) >= 2
  )
  select jsonb_build_object(
    'published', published,
    'allowed', true,
    'responses', (select count(*) from subs),
    'people', (select count(*) from profiles where active),
    'company', (select jsonb_build_object('avg', round(avg(score), 1), 'n', count(*), 'high', count(*) filter (where score >= 9), 'low', count(*) filter (where score <= 4)) from others),
    'departments', coalesce((select jsonb_agg(jsonb_build_object(
        'key', ds.dept, 'n', ds.n,
        'avg', case when ds.n >= 3 then ds.avg end,
        'high', case when ds.n >= 3 then ds.high end,
        'low', case when ds.n >= 3 then ds.low end,
        'strengths', coalesce((select jsonb_agg(jsonb_build_object('text', t.txt, 'count', t.cnt) order by t.rk) from dept_text_top t where t.dept = ds.dept and t.field = 'strengths' and t.rk <= 3 and ds.n >= 3), '[]'::jsonb),
        'weaknesses', coalesce((select jsonb_agg(jsonb_build_object('text', t.txt, 'count', t.cnt) order by t.rk) from dept_text_top t where t.dept = ds.dept and t.field = 'weaknesses' and t.rk <= 3 and ds.n >= 3), '[]'::jsonb)
      )) from dept_scores ds), '[]'::jsonb),
    'problems', coalesce((select jsonb_agg(jsonb_build_object('text', txt, 'count', cnt) order by rk) from company_top where kind = 'problems' and rk <= 6), '[]'::jsonb),
    'strengths', coalesce((select jsonb_agg(jsonb_build_object('text', txt, 'count', cnt) order by rk) from company_top where kind = 'strengths' and rk <= 6), '[]'::jsonb),
    'best_departments', coalesce((select jsonb_agg(jsonb_build_object('key', name, 'points', points, 'votes', votes, 'firsts', firsts) order by rk) from nom_top where kind = 'departments' and rk <= 3), '[]'::jsonb),
    'best_managers', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'points', points, 'votes', votes, 'firsts', firsts) order by rk) from nom_top where kind = 'managers' and rk <= 3), '[]'::jsonb),
    'best_employees', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'points', points, 'votes', votes, 'firsts', firsts) order by rk) from nom_top where kind = 'employees' and rk <= 3), '[]'::jsonb),
    'ideas', (select count(*) from subs s, jsonb_array_elements_text(case when jsonb_typeof(s.a -> 'company_ideas') = 'array' then s.a -> 'company_ideas' else '[]'::jsonb end) x where trim(x) <> '')
  ) into out;
  return out;
end;
$$;
revoke execute on function public.results_summary() from public, anon;
grant execute on function public.results_summary() to authenticated;
