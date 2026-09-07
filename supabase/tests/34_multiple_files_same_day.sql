\echo 'multiple files, one course, one day: consolidated, never duplicated, never each other'
--
-- 0044. The ask, in the requester's words: "Enable multiple CSV files to be
-- uploaded for the same course and the same day ... the files should be
-- processed independently and their attendance data consolidated correctly
-- ... this must not create duplicate attendance records or overwrite
-- unrelated data."
--
-- 31_override_scoped_by_meeting_code.sql already holds the case where the
-- files carry DIFFERENT meeting codes. This spec is the two it does not:
--
--   SAME CODE, DIFFERENT CALL. The code is the Meet LINK, and an academy that
--   keeps one link for a course writes the same code on every export. Before
--   0044 the second call of the day was read as a correction of the first and
--   erased it -- a member who really attended the morning class went back to
--   absent because the evening class sent its file.
--
--   NO CODE AT ALL. `is not distinct from` makes null match null, so every
--   code-less file for a day overrode every other one. Two exports with no
--   code line were the worst-affected case, and the likeliest.
--
-- What still has to be true afterwards, and is asserted below: a corrected
-- re-export still corrects its own earlier version IN FULL (29_import_override
-- is the whole of that rule and none of it is loosened), one row per member
-- per day, and no other day touched.
--
-- Prenatal at one branch, Mon/Wed/Fri. Asha, Bhavani, Chitra and Divya are
-- enrolled; Esha is not -- she is the visitor who makes 'extra' reachable.

begin;
insert into auth.users (id) values ('cccccccc-0000-0000-0000-000000000044');
insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
  values ('cccccccc-1111-0000-0000-000000000044','cccccccc-0000-0000-0000-000000000044',
          'super_admin','Multi Owner','+919994871744');
insert into public.branches (name, code) values ('Adyar','ADY');
insert into public.courses (name) values ('Prenatal Multi');
insert into public.course_offerings (course_id, branch_id, start_time, end_time)
  select c.id, b.id, '07:00','08:00' from public.courses c, public.branches b
   where c.name = 'Prenatal Multi';
insert into public.offering_schedules (offering_id, effective_from, weekdays)
  select o.id, '2026-08-01', array[1,3,5]::smallint[]
    from public.course_offerings o join public.courses c on c.id = o.course_id
   where c.name = 'Prenatal Multi';
insert into public.members (full_name) values
  ('Asha Multi'), ('Bhavani Multi'), ('Chitra Multi'), ('Divya Multi'), ('Esha Visitor');
insert into public.member_aliases (member_id, alias_type, alias_display, confirmed_by)
  select id, 'name', full_name, 'cccccccc-1111-0000-0000-000000000044'
    from public.members where full_name like '% Multi' or full_name = 'Esha Visitor';
-- Esha is deliberately NOT enrolled: a name in a file who was never due is an
-- 'extra', and absent_must_be_expected (0008) is what makes her a different
-- case from everybody else here.
insert into public.member_enrollments (member_id, offering_id, effective_from)
  select m.id, o.id, '2026-08-01'
    from public.members m, public.course_offerings o
    join public.courses c on c.id = o.course_id
   where m.full_name like '% Multi' and c.name = 'Prenatal Multi';
commit;

-- Stages one file as csv-import's preview does, with the meeting INSTANCE the
-- override is keyed on: the code AND the created-on line. pg_temp so it does
-- not outlive this spec's database.
create or replace function pg_temp.stage(
  p_sha text, p_code text, p_started timestamptz, p_day date, p_names text[])
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.csv_imports
    (file_name, file_sha256, offering_id, session_date, meeting_code, meeting_started_at,
     row_count, status, summary, uploaded_by)
  select p_sha || '.csv', p_sha, o.id, p_day, p_code, p_started,
    array_length(p_names, 1), 'previewed',
    jsonb_build_object('rows', (
      select jsonb_agg(jsonb_build_object(
        'row', ord, 'kind', 'matched', 'raw_name', nm, 'minutes', 50,
        'candidates', jsonb_build_array(jsonb_build_object(
          'member_id', (select id from public.members where full_name = nm)))))
        from unnest(p_names) with ordinality as u(nm, ord))),
    'cccccccc-1111-0000-0000-000000000044'
    from public.course_offerings o join public.courses c on c.id = o.course_id
   where c.name = 'Prenatal Multi'
  returning id into v_id;
  return v_id;
end $$;

-- the status of one member on one day of THIS course, or 'no row'
create or replace function pg_temp.mark(p_name text, p_day date) returns text
language sql as $$
  select coalesce((select a.status from public.attendance_records a
                     join public.sessions s on s.id = a.session_id
                     join public.course_offerings o on o.id = s.offering_id
                     join public.courses c on c.id = o.course_id
                    where c.name = 'Prenatal Multi' and s.session_date = p_day
                      and a.deleted_at is null
                      and a.member_id = (select id from public.members where full_name = p_name)),
                  'no row')
$$;

-- ============================== FILE ONE · the morning call on the shared link
begin;
set local role service_role;
select public.commit_csv_import(
  pg_temp.stage('sha-m1', 'pre-natal-link', '2026-08-31 07:05:00+05:30',
                '2026-08-31', array['Asha Multi','Bhavani Multi']),
  'cccccccc-1111-0000-0000-000000000044', '[]'::jsonb);
commit;

select t.eq(pg_temp.mark('Asha Multi',   '2026-08-31'), 'present', 'the first file marks its own people present');
select t.eq(pg_temp.mark('Chitra Multi', '2026-08-31'), 'absent',  'and everyone else due absent');

-- ====== FILE TWO · the evening call, SAME LINK, and the reason 0044 exists
-- Before 0044 this reverted Asha and Bhavani: the code matched, so file two
-- was read as file one re-exported. It is not -- it is a different call on the
-- same link, and its created-on line is what says so.
begin;
set local role service_role;
select t.eq(((public.commit_csv_import(
    pg_temp.stage('sha-m2', 'pre-natal-link', '2026-08-31 18:05:00+05:30',
                  '2026-08-31', array['Chitra Multi']),
    'cccccccc-1111-0000-0000-000000000044', '[]'::jsonb))->'overridden'->>'reverted')::int, 0,
  'a second call on the same meeting link reverts nobody');
commit;

select t.eq(pg_temp.mark('Asha Multi',    '2026-08-31'), 'present', 'the morning class survives the evening class file');
select t.eq(pg_temp.mark('Bhavani Multi', '2026-08-31'), 'present', 'and so does everyone else it named');
select t.eq(pg_temp.mark('Chitra Multi',  '2026-08-31'), 'present', 'the second file flips its own member from absent to present');
select t.eq(pg_temp.mark('Divya Multi',   '2026-08-31'), 'absent',  'a member no file names is still absent, not lost');

-- ================= FILE THREE and FOUR · no meeting code at all, twice
-- The likeliest shape of the ask and the worst-affected before 0044: two
-- exports with no code line overrode each other, because null matched null.
-- The created-on line tells them apart, and neither file carries a code.
begin;
set local role service_role;
select public.commit_csv_import(
  pg_temp.stage('sha-m3', null, '2026-08-31 20:05:00+05:30',
                '2026-08-31', array['Divya Multi']),
  'cccccccc-1111-0000-0000-000000000044', '[]'::jsonb);
commit;

begin;
set local role service_role;
select t.eq(((public.commit_csv_import(
    pg_temp.stage('sha-m4', null, '2026-08-31 21:05:00+05:30',
                  '2026-08-31', array['Esha Visitor']),
    'cccccccc-1111-0000-0000-000000000044', '[]'::jsonb))->'overridden'->>'reverted')::int, 0,
  'two code-less files for one day no longer replace each other');
commit;

select t.eq(pg_temp.mark('Divya Multi',  '2026-08-31'), 'present', 'the code-less file before it stands');
-- She was never due, so she cannot be marked absent (absent_must_be_expected).
select t.eq(pg_temp.mark('Esha Visitor', '2026-08-31'), 'extra',   'a visitor no file expected is recorded as an extra');

-- ================================================= what four files add up to
select t.eq(
  (select count(*)::int from public.sessions s
     join public.course_offerings o on o.id = s.offering_id
     join public.courses c on c.id = o.course_id
    where c.name = 'Prenatal Multi' and s.session_date = '2026-08-31' and s.deleted_at is null),
  1, 'four files for one course on one day are ONE session');

-- THE DUPLICATE CLAIM, asked of the table rather than of the counts.
-- attendance_unique_live makes this structural; it is asserted anyway, because
-- a spec that only reads counts passes on a register that has been written
-- twice and then counted twice.
select t.eq(
  (select count(*)::int from (
     select a.member_id from public.attendance_records a
       join public.sessions s on s.id = a.session_id
       join public.course_offerings o on o.id = s.offering_id
       join public.courses c on c.id = o.course_id
      where c.name = 'Prenatal Multi' and s.session_date = '2026-08-31'
        and a.deleted_at is null
      group by a.member_id having count(*) > 1) dup),
  0, 'no member has two live rows for the day, however many files named her');

select t.eq(
  (select s.present_count from public.sessions s
     join public.course_offerings o on o.id = s.offering_id
     join public.courses c on c.id = o.course_id
    where c.name = 'Prenatal Multi' and s.session_date = '2026-08-31'),
  4, 'by the end of the day the register is the union of its files');

-- ============ FILE FIVE · a CORRECTED re-export of file one, same instance
-- 0037's promise is not loosened by any of the above. Same code AND same
-- created-on line as file one, naming only Asha: Bhavani -- written by that
-- same instance -- is this file's to revert, and nobody else is.
begin;
set local role service_role;
select t.eq(((public.commit_csv_import(
    pg_temp.stage('sha-m5', 'pre-natal-link', '2026-08-31 07:05:00+05:30',
                  '2026-08-31', array['Asha Multi']),
    'cccccccc-1111-0000-0000-000000000044', '[]'::jsonb))->'overridden'->>'reverted')::int, 1,
  'a re-export of the same call still corrects its own earlier version in full');
commit;

select t.eq(pg_temp.mark('Bhavani Multi', '2026-08-31'), 'absent',  'the correction reaches inside the call it belongs to');
select t.eq(pg_temp.mark('Chitra Multi',  '2026-08-31'), 'present', 'and not into the evening call rows');
select t.eq(pg_temp.mark('Divya Multi',   '2026-08-31'), 'present', 'nor into a code-less file rows');
select t.eq(pg_temp.mark('Esha Visitor',  '2026-08-31'), 'extra',   'and the visitor another file recorded is not swept off the register');

-- ===================================== UNRELATED DATA: a different day stands
-- Wednesday's register is written after Monday's has been added to four times
-- and corrected once, and nothing above may have reached it.
begin;
set local role service_role;
select public.commit_csv_import(
  pg_temp.stage('sha-m6', 'pre-natal-link', '2026-09-02 07:05:00+05:30',
                '2026-09-02', array['Asha Multi','Chitra Multi']),
  'cccccccc-1111-0000-0000-000000000044', '[]'::jsonb);
commit;

select t.eq(pg_temp.mark('Bhavani Multi', '2026-08-31'), 'absent',  'a later day does not rewrite an earlier one');
select t.eq(pg_temp.mark('Divya Multi',   '2026-08-31'), 'present', 'and the earlier day keeps what its own files said');
select t.eq(pg_temp.mark('Divya Multi',   '2026-09-02'), 'absent',  'the new day is decided by its own file alone');

-- The counting rule, which is what all of this is for: Mon and Wed are two
-- class days however many files each of them took.
select t.eq(
  (select expected from public.member_period_metrics('2026-08-31','2026-09-06',
     (select id from public.members where full_name = 'Asha Multi'))),
  2, 'two class days is two expected, however many files landed on each');
select t.eq(
  (select attended from public.member_period_metrics('2026-08-31','2026-09-06',
     (select id from public.members where full_name = 'Asha Multi'))),
  2, 'and a member named by one file each day attended both');
