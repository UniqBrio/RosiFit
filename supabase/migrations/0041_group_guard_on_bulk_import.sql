-- 0041 · a bulk upload enrols into the COURSE, never into one of its meetings
--
-- 0039 made a meeting code into a course_offerings row -- a meeting GROUP --
-- so a course may now have several offerings at one branch. bulk_import_
-- members resolves its offering by course and branch NAME, and separately
-- validates a default offering id, and neither filtered on anything that
-- tells a group from the course. Once a group exists, a bulk upload naming
-- "Postnatal" could enrol its whole file into ONE meeting.
--
-- Members added in bulk belong to the course. Which meeting each attends is
-- decided by the file that meeting produces, and by nothing else.
--
-- WHY THIS IS ITS OWN MIGRATION AND NOT PART OF 0039
--   The only version of this function available to copy is 0038_staff_write_
--   access's, which also grants STAFF the right to bulk import. That is a
--   permission change belonging to its own request, and folding it into an
--   attendance migration would have shipped it as a side effect. So the guard
--   waits here, on the 0038 baseline, and lands when 0038 lands.
--
-- Re-issued from 0038 with TWO lines added, both the same guard. Diff it
-- against 0038 and that is the whole of the difference.

create or replace function public.bulk_import_members(
  p_members             jsonb,
  p_default_offering_id uuid default null,
  p_file_name           text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor     uuid := public.current_app_user_id();
  v_run_id    uuid := gen_random_uuid();
  v_row       jsonb;
  v_rownum    int;
  v_name      text;
  v_course    text;
  v_branch    text;
  v_raw_date  text;
  v_offering  uuid;
  v_joined    date;
  v_aliases   text[];
  v_emails    text[];
  v_result    jsonb;
  v_verdicts  jsonb := '[]'::jsonb;
  v_inserted  int := 0;
  v_skipped   int := 0;
  v_failed    int := 0;
  v_total     int := 0;
begin
  if v_actor is null then
    raise exception 'only a signed-in, active user can import members' using errcode = '42501';
  end if;
  -- 0038: the owner-only guard is GONE. `v_actor is null` above is now the
  -- whole check -- the same one create_member (0016) has always carried, which
  -- is what this function writes every row through.
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so nothing can be imported' using errcode = '42501';
  end if;
  if p_members is null or jsonb_typeof(p_members) <> 'array' then
    raise exception 'the import needs a list of rows' using errcode = '22023';
  end if;
  v_total := jsonb_array_length(p_members);
  if v_total = 0 then
    raise exception 'that file has no rows to import' using errcode = '22023';
  end if;
  if v_total > 500 then
    raise exception 'a file may carry at most 500 members; this one has %', v_total using errcode = '22023';
  end if;
  if p_default_offering_id is not null and not exists (
       select 1 from public.course_offerings o
        where o.id = p_default_offering_id and o.deleted_at is null
          and o.meet_code is null) then                          -- 0039/0041: never a group
    raise exception 'that course is not offered at that branch' using errcode = 'P0002';
  end if;

  for v_row in select * from jsonb_array_elements(p_members) loop
    v_rownum  := coalesce((v_row->>'row')::int, 0);
    v_name    := btrim(coalesce(v_row->>'full_name', ''));
    v_course  := btrim(coalesce(v_row->>'course', ''));
    v_branch  := btrim(coalesce(v_row->>'branch', ''));
    v_offering := null;

    if v_course = '' then
      v_offering := p_default_offering_id;
    else
      select o.id into v_offering
        from public.course_offerings o
        join public.courses  c on c.id = o.course_id
        join public.branches b on b.id = o.branch_id
       where o.deleted_at is null and c.deleted_at is null and b.deleted_at is null
         and o.meet_code is null                               -- 0039/0041: never a group
         and lower(c.name) = lower(v_course)
         and (v_branch = '' or lower(b.name) = lower(v_branch))
       order by (v_branch = '') desc, b.name
       limit 1;
    end if;

    if v_name = '' then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed', 'reason', 'no name in this row');
      continue;
    elsif exists (select 1 from public.members m
                   where m.deleted_at is null
                     and m.name_normalized = public.normalize_name(v_name)) then
      v_skipped := v_skipped + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'skipped', 'reason', 'already on the register — edit her instead');
      continue;
    elsif v_offering is null then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed',
        'reason', case when v_course = ''
                       then 'no course, and this import was not opened from one'
                       else format('no course called "%s"%s', v_course,
                                   case when v_branch = '' then '' else format(' at %s', v_branch) end)
                  end);
      continue;
    end if;

    v_aliases := coalesce(array(select jsonb_array_elements_text(coalesce(v_row->'aliases', '[]'::jsonb))), '{}');
    v_emails  := case when coalesce(v_row->>'email', '') = '' then '{}'::text[]
                      else array[lower(btrim(v_row->>'email'))] end;

    -- ------------------------------------------------- the joining date
    -- THE SHAPE, BEFORE THE CAST (0029). `'01/09/2026'::date` does not
    -- raise -- Postgres reads it under DateStyle and returns a real date,
    -- just not the one she wrote. Only YYYY-MM-DD is accepted, which is
    -- what the template's own column says and what the client already
    -- enforces. A future date is still create_member's refusal, below.
    v_raw_date := nullif(btrim(coalesce(v_row->>'joined_on', '')), '');
    if v_raw_date is not null and v_raw_date !~ '^\d{4}-\d{2}-\d{2}$' then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed',
        'reason', format('"%s" is not a date; write it as YYYY-MM-DD', v_raw_date));
      continue;
    end if;
    begin
      v_joined := v_raw_date::date;          -- shape is right; the DAY may not exist
    exception when others then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed',
        'reason', format('"%s" is not a real date', v_raw_date));
      continue;
    end;

    begin
      v_result := public.create_member(v_name, v_offering, v_joined, v_aliases, v_emails, null);
      v_inserted := v_inserted + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'inserted', 'member_id', v_result->>'member_id');
    exception when others then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed', 'reason', sqlerrm);
    end;
  end loop;

  insert into public.member_import_runs
    (id, file_name, default_offering_id, total_rows, inserted_count, skipped_count, failed_count,
     rows, imported_by)
  values
    (v_run_id, p_file_name, p_default_offering_id, v_total, v_inserted, v_skipped, v_failed,
     v_verdicts, v_actor);

  perform public.audit_log('member.bulk_imported', 'member_import_run', v_run_id::text, '[]'::jsonb,
    jsonb_build_object('file_name', p_file_name, 'total', v_total, 'inserted', v_inserted,
                       'skipped', v_skipped, 'failed', v_failed));

  return jsonb_build_object(
    'run_id', v_run_id, 'total', v_total, 'inserted', v_inserted,
    'skipped', v_skipped, 'failed', v_failed, 'rows', v_verdicts);
end $$;
-- The 0028 comment still said OWNER-ONLY. A comment that contradicts the
-- function it sits on is worse than no comment: it is the thing the next
-- reader trusts instead of reading the guard.
