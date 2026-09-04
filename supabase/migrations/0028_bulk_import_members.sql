-- 0028 · bulk import members — one call, one file, every row judged on its own
--
-- THE DEFECT THIS CLOSES
--   The course detail's Bulk Import button opened `/upload`, the Google Meet
--   ATTENDANCE importer, because no member importer existed. The plan names
--   that exact confusion (§6.6): the member file "is NOT the attendance CSV
--   and may carry email, course and branch. Its mapping is separate."
--
-- THE REFERENCE
--   The UniqBrio Mobile App's Bulk Student Import v1, applied to RosiFit's
--   own structure: one SECURITY DEFINER RPC takes the whole parsed file as
--   jsonb, is OWNER-ONLY, re-validates the course and branch against the
--   academy rather than trusting the file, writes each person in her own
--   sub-transaction so one failure never rolls back the rest, SKIPS a
--   duplicate rather than overwriting it, and records the run in an audit
--   table the owner can read and nobody can write.
--
-- WHAT IS ROSIFIT'S AND NOT UNIQBRIO'S, deliberately
--   * No phone column. C-70: a member has NO phone number; email is her
--     address for sends and nothing identifies her by number.
--   * ONE course per row, not three. member_enrollments carries a GiST
--     exclusion -- one offering at a time -- and a member with no course is
--     invisible to the engine (0016), so a row that resolves to no offering
--     FAILS here instead of importing "without a course" for later.
--   * Each row is written by create_member (0016), not by a second INSERT
--     path. That is what keeps every rule -- the alias unique academy-wide,
--     the address unique, the offering real, the subscription writable --
--     enforced once, in one place, for a member added one at a time or forty
--     at a time.

-- ---------------------------------------------------------------- the run
-- One row per file. The owner reads it; nothing writes it but the function
-- below, which is why there is a SELECT policy and no INSERT policy at all.
create table public.member_import_runs (
  id                  uuid primary key default gen_random_uuid(),
  file_name           text,
  default_offering_id uuid references public.course_offerings(id),
  total_rows          int not null default 0,
  inserted_count      int not null default 0,
  skipped_count       int not null default 0,
  failed_count        int not null default 0,
  /** every row's verdict, so the report can be rebuilt after the screen is gone */
  rows                jsonb not null default '[]'::jsonb,
  imported_by         uuid references public.app_users(id),
  created_at          timestamptz not null default now()
);
create index member_import_runs_recent on public.member_import_runs (created_at desc);

alter table public.member_import_runs enable row level security;
alter table public.member_import_runs force  row level security;
create policy member_import_runs_read on public.member_import_runs
  for select to authenticated using (public.is_super_admin());
grant select on public.member_import_runs to authenticated;
grant all    on public.member_import_runs to service_role;

comment on table public.member_import_runs is
  'One row per bulk member import. Written only by bulk_import_members(); readable by the academy admin. The rows column carries every verdict, so the error report can be reproduced later.';

-- ------------------------------------------------------------ the import
create or replace function public.bulk_import_members(
  /** [{row, full_name, email, course, branch, aliases:[...], joined_on}] --
   *  row is the spreadsheet row number, so a refusal can be found again */
  p_members             jsonb,
  /** the course this import was opened from; a row with no Course cell
   *  joins it. NULL means every row must name its own. */
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
  -- ------------------------------------------------------------ the gate
  -- Owner-only, as the reference has it. A file of forty members is the
  -- shape of the register, and only the academy admin decides that.
  if v_actor is null then
    raise exception 'only a signed-in, active user can import members' using errcode = '42501';
  end if;
  if not public.is_super_admin() then
    raise exception 'only the academy admin can bulk import members' using errcode = '42501';
  end if;
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
  -- The same ceiling the reference sets, enforced where it cannot be skipped.
  if v_total > 500 then
    raise exception 'a file may carry at most 500 members; this one has %', v_total using errcode = '22023';
  end if;
  if p_default_offering_id is not null and not exists (
       select 1 from public.course_offerings o
        where o.id = p_default_offering_id and o.deleted_at is null) then
    raise exception 'that course is not offered at that branch' using errcode = 'P0002';
  end if;

  -- ------------------------------------------------------------ each row
  for v_row in select * from jsonb_array_elements(p_members) loop
    v_rownum  := coalesce((v_row->>'row')::int, 0);
    v_name    := btrim(coalesce(v_row->>'full_name', ''));
    v_course  := btrim(coalesce(v_row->>'course', ''));
    v_branch  := btrim(coalesce(v_row->>'branch', ''));
    v_offering := null;

    -- WHICH OFFERING. Re-resolved here from the academy's own courses, never
    -- taken as an id from the file: a file cannot name a course the academy
    -- does not run.
    if v_course = '' then
      v_offering := p_default_offering_id;
    else
      select o.id into v_offering
        from public.course_offerings o
        join public.courses  c on c.id = o.course_id
        join public.branches b on b.id = o.branch_id
       where o.deleted_at is null and c.deleted_at is null and b.deleted_at is null
         and lower(c.name) = lower(v_course)
         and (v_branch = '' or lower(b.name) = lower(v_branch))
       order by (v_branch = '') desc, b.name
       limit 1;
    end if;

    -- A DUPLICATE IS SKIPPED, NEVER OVERWRITTEN. Same as the reference, and
    -- for the same reason: an import is additive. Somebody already on the
    -- register is edited on her form, not silently rewritten by a
    -- spreadsheet that may be months old.
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
    -- blank joining date means today, as the reference has it
    begin
      v_joined := nullif(btrim(coalesce(v_row->>'joined_on', '')), '')::date;
    exception when others then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed', 'reason', format('"%s" is not a date; write it as YYYY-MM-DD', v_row->>'joined_on'));
      continue;
    end;

    -- HER OWN SUB-TRANSACTION. create_member is one transaction per member;
    -- the block here is what stops a refusal on row 7 from rolling back the
    -- six rows already accepted. The reason is create_member's own sentence,
    -- which is already written for a person to read.
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

  -- ------------------------------------------------------------- the run
  insert into public.member_import_runs
    (id, file_name, default_offering_id, total_rows, inserted_count, skipped_count, failed_count,
     rows, imported_by)
  values
    (v_run_id, p_file_name, p_default_offering_id, v_total, v_inserted, v_skipped, v_failed,
     v_verdicts, v_actor);

  -- Every member create_member wrote is already audited as member.created,
  -- attributed to the same actor. This is the ACT: one person imported one
  -- file, and what became of every row in it.
  perform public.audit_log('member.bulk_imported', 'member_import_run', v_run_id::text, '[]'::jsonb,
    jsonb_build_object('file_name', p_file_name, 'total', v_total, 'inserted', v_inserted,
                       'skipped', v_skipped, 'failed', v_failed));

  return jsonb_build_object(
    'run_id', v_run_id, 'total', v_total, 'inserted', v_inserted,
    'skipped', v_skipped, 'failed', v_failed, 'rows', v_verdicts);
end $$;

revoke all on function public.bulk_import_members(jsonb, uuid, text) from public, anon;
grant execute on function public.bulk_import_members(jsonb, uuid, text) to authenticated, service_role;

comment on function public.bulk_import_members(jsonb, uuid, text) is
  'Imports a parsed member file in one call. OWNER-ONLY (is_super_admin). Each row is written by create_member in its own sub-transaction, so one refusal never rolls back the rest; a name already on the register is SKIPPED, never overwritten. Returns {run_id, total, inserted, skipped, failed, rows[]} and records the run in member_import_runs.';
