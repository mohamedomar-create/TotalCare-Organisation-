-- Small-team privacy (TotalCare is about 30 people, 3–4 per department).
-- In a team that small, "department + level + years + location" can point to one person, so an
-- anonymous answer keeps only the department (needed to leave out self-ratings) and drops the rest.

create or replace function public.submit_survey(p_id uuid, p_anonymous boolean, p_quality jsonb default '{}')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  d submissions;
  new_id uuid;
begin
  select * into d from submissions where id = p_id;
  if d.id is null or d.author_id is distinct from auth.uid() then
    raise exception 'Survey not found';
  end if;
  if d.status <> 'draft' then
    raise exception 'This survey was already sent';
  end if;

  if not p_anonymous then
    update submissions set status = 'submitted', quality = coalesce(p_quality, '{}'), anonymous = false where id = p_id;
    return p_id;
  end if;

  insert into submissions (author_id, department_id, structure, responsibilities, challenges, suggestions, status,
                           created_at, updated_at, submitted_at, role_level, ratings, responsibility_tags,
                           challenge_tags, ideas, quick_win, enps, current_step, answers, quality, anonymous)
  values (null, d.department_id, d.structure, d.responsibilities, d.challenges, d.suggestions, 'submitted',
          date_trunc('day', now()), date_trunc('day', now()), date_trunc('day', now()),
          '',                                                        -- level removed
          d.ratings, d.responsibility_tags, d.challenge_tags, d.ideas, d.quick_win, d.enps, d.current_step,
          d.answers - 'tenure' - 'location' - 'started_at' - 'stay',  -- details that could identify someone
          coalesce(p_quality, '{}') - 'minutes', true)
  returning id into new_id;

  delete from submissions where id = p_id;
  insert into submission_receipts (user_id) values (auth.uid());
  perform private.notify(jsonb_build_object('type', 'submission', 'id', new_id));
  return new_id;
end;
$$;
