\echo 'override by meeting code: a later file flips absent to present and never reverts another meeting'
--
-- 0042. A course runs N meetings a day, each with its own file, and nobody
-- knows in advance which member joins which meeting. The requester's flow:
-- the first file marks its people present and the rest absent; each later
-- file flips the members it names from absent to present; nothing else
-- moves. That is what 0014 always did. What 0037 added on top -- a second
-- file for the day REVERTING everyone the first one marked -- was right for
-- a corrected export and erased the first meeting when the second arrived.
-- The meeting code tells those apart: the override now reaches only rows
-- written by an earlier file carrying THE SAME code.
--
-- Four members, all due every Mon/Wed/Fri. Asha and Bhavani come to meeting
-- A, Chitra and Divya to meeting B -- but the database is never told that,
-- and must never need to be.

begin;
insert into auth.users (id) values ('ffffffff-0000-0000-0000-000000000042');
insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
  values ('ffffffff-1111-0000-0000-000000000042','ffffffff-0000-0000-0000-000000000042',
          'super_admin','Scope Owner','+919994871742');
insert into public.branches (name, code) values ('Velachery','VLC');
insert into public.courses (name) values ('Postnatal Scoped');
insert into public.course_offerings (course_id, branch_id, start_time, end_time)
  select c.id, b.id, '07:00','08:00' from public.courses c, public.branches b
   where c.name = 'Postnatal Scoped';
insert into public.offering_schedules (offering_id, effective_from, weekdays)
  select o.id, '2026-08-01', array[1,3,5]::smallint[]
    from public.course_offerings o join public.courses c on c.id = o.course_id
   where c.name = 'Postnatal Scoped';
insert into public.members (full_name) values
  ('Asha Scope'), ('Bhavani Scope'), ('Chitra Scope'), ('Divya Scope');
insert into public.member_aliases (member_id, alias_type, alias_display, confirmed_by)
  select id, 'name', full_name, 'ffffffff-1111-0000-0000-000000000042'
    from public.members where full_name like '% Scope';
insert into public.member_enrollments (member_id, offering_id, effective_from)
  select m.id, o.id, '2026-08-01'
    from public.members m, public.course_offerings o
    join public.courses c on c.id = o.course_id
   where m.full_name like '% Scope' and c.name = 'Postnatal Scoped';
commit;

-- The 0039 machinery is gone: nothing can move an enrolment on a name.
select t.eq((select count(*)::int from pg_proc
              where proname in ('offering_for_meeting','place_member_in_group')), 0,
  'the meeting-group functions of 0039 are dropped');

-- Stages one file as the edge function would. pg_temp so it does not outlive
-- this spec's database.
create or replace function pg_temp.stage(p_sha text, p_code text, p_day date, p_names text[])
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.csv_imports
    (file_name, file_sha256, offering_id, session_date, meeting_code, row_count, status, summary, uploaded_by)
  select p_sha || '.csv', p_sha, o.id, p_day, p_code, array_length(p_names, 1), 'previewed',
    jsonb_build_object('rows', (
      select jsonb_agg(jsonb_build_object(
        'row', ord, 'kind', 'matched', 'raw_name', nm, 'minutes', 50,
        'candidates', jsonb_build_array(jsonb_build_object(
          'member_id', (select id from public.members where full_name = nm)))))
        from unnest(p_names) with ordinality as u(nm, ord))),
    'ffffffff-1111-0000-0000-000000000042'
    from public.course_offerings o join public.courses c on c.id = o.course_id
   where c.name = 'Postnatal Scoped'
  returning id into v_id;
  return v_id;
end $$;

-- the status of one member on one day, or 'no row'
create or replace function pg_temp.mark(p_name text, p_day date) returns text
language sql as $$
  select coalesce((select a.status from public.attendance_records a
                     join public.sessions s on s.id = a.session_id
                    where s.session_date = p_day and a.deleted_at is null
                      and a.member_id = (select id from public.members where full_name = p_name)),
                  'no row')
$$;

-- YET TO MARK is a day with no file: no session from an import, no rows.
select t.eq((select count(*)::int from public.sessions where session_date = '2026-08-31'), 0,
  'before any file, the day has no session -- every member is yet to mark');

-- ================================== day one: two meetings, two codes, one day
begin;
set local role service_role;
select public.commit_csv_import(
  pg_temp.stage('sha-a1', 'aaa-aaaa-aaa', '2026-08-31', array['Asha Scope','Bhavani Scope']),
  'ffffffff-1111-0000-0000-000000000042', '[]'::jsonb);
commit;

-- The first file: its people present, everyone else due absent.
select t.eq(pg_temp.mark('Asha Scope',   '2026-08-31'), 'present', 'the first file marks its own people present');
select t.eq(pg_temp.mark('Chitra Scope', '2026-08-31'), 'absent',  'and everyone else due absent');

begin;
set local role service_role;
-- THE ASSERTION 0042 EXISTS FOR. Meeting B's file reverts nobody: its code
-- differs, so meeting A's rows are not an earlier version of it.
select t.eq(((public.commit_csv_import(
    pg_temp.stage('sha-b1', 'bbb-bbbb-bbb', '2026-08-31', array['Chitra Scope','Divya Scope']),
    'ffffffff-1111-0000-0000-000000000042', '[]'::jsonb))->'overridden'->>'reverted')::int, 0,
  'a second meeting''s file for the same day reverts nobody');
commit;

-- ONE session, and one row per member per day.
select t.eq(
  (select count(*)::int from public.sessions s
     join public.course_offerings o on o.id = s.offering_id
     join public.courses c on c.id = o.course_id
    where c.name = 'Postnatal Scoped' and s.session_date = '2026-08-31' and s.deleted_at is null),
  1, 'two meetings on one day are one session');
-- Before 0042 this was 'absent': file B reverted everyone file A marked.
select t.eq(pg_temp.mark('Asha Scope',   '2026-08-31'), 'present', 'the second meeting''s file does not touch the first meeting''s members');
select t.eq(pg_temp.mark('Chitra Scope', '2026-08-31'), 'present', 'her own meeting''s file flips her from absent to present');
select t.eq(
  (select s.present_count from public.sessions s where s.session_date = '2026-08-31'),
  4, 'by the end of the day the register is whole: four present');

-- ============================ a CORRECTED file for meeting A, same code + day
begin;
set local role service_role;
-- Names only Asha. Bhavani -- written by meeting A's earlier file -- is this
-- file's to revert. Chitra and Divya -- written by meeting B's file -- are not.
select t.eq(((public.commit_csv_import(
    pg_temp.stage('sha-a2', 'aaa-aaaa-aaa', '2026-08-31', array['Asha Scope']),
    'ffffffff-1111-0000-0000-000000000042', '[]'::jsonb))->'overridden'->>'reverted')::int, 1,
  'a corrected file for the same code and day reverts exactly the one its earlier version named');
commit;
select t.eq(pg_temp.mark('Bhavani Scope', '2026-08-31'), 'absent',  'the correction still reaches inside the meeting it belongs to');
select t.eq(pg_temp.mark('Chitra Scope',  '2026-08-31'), 'present', 'the correction does not reach the other meeting''s rows on the same day');

-- ======================= the same members, a DIFFERENT code on a later day
-- The academy's codes change from day to day. That must cost nothing.
begin;
set local role service_role;
select t.eq(((public.commit_csv_import(
    pg_temp.stage('sha-a3', 'ccc-cccc-ccc', '2026-09-02', array['Asha Scope','Bhavani Scope']),
    'ffffffff-1111-0000-0000-000000000042', '[]'::jsonb))->'overridden'->>'reverted')::int, 0,
  'a new code on a new day overrides nothing');
commit;
select t.eq(pg_temp.mark('Bhavani Scope', '2026-08-31'), 'absent', 'a later day does not rewrite an earlier one');
-- Chitra's meeting sent no file on Wednesday: she is absent -- recorded, not
-- lost. This is the row the 0039 group model could not write.
select t.eq(pg_temp.mark('Chitra Scope', '2026-09-02'), 'absent', 'a member whose meeting sent no file that day is absent, not lost');

-- ================================================ the counting rule, whole
-- Friday: meeting A's file names only Bhavani. Asha missed.
begin;
set local role service_role;
select public.commit_csv_import(
  pg_temp.stage('sha-a4', 'ddd-dddd-ddd', '2026-09-04', array['Bhavani Scope']),
  'ffffffff-1111-0000-0000-000000000042', '[]'::jsonb);
commit;

-- Asha: Mon present, Wed present, Fri absent -> 3 expected, 2 attended.
-- Three class days, several meetings each, never more than one row a day.
select t.eq(
  (select expected from public.member_period_metrics('2026-08-31','2026-09-06',
     (select id from public.members where full_name = 'Asha Scope'))),
  3, 'three class days is three expected, however many meetings ran');
select t.eq(
  (select attended from public.member_period_metrics('2026-08-31','2026-09-06',
     (select id from public.members where full_name = 'Asha Scope'))),
  2, 'she attended two, so the count is two');
select t.eq(
  (select attended from public.member_period_metrics('2026-08-31','2026-09-06',
     (select id from public.members where full_name = 'Chitra Scope'))),
  1, 'a member of the other meeting is counted on every class day too');

-- =========================== a file with NO code behaves as it always did
-- Two code-less files for a day override each other (`is not distinct from`).
begin;
set local role service_role;
select public.commit_csv_import(
  pg_temp.stage('sha-n1', null, '2026-09-07', array['Asha Scope','Bhavani Scope']),
  'ffffffff-1111-0000-0000-000000000042', '[]'::jsonb);
select t.eq(((public.commit_csv_import(
    pg_temp.stage('sha-n2', null, '2026-09-07', array['Asha Scope']),
    'ffffffff-1111-0000-0000-000000000042', '[]'::jsonb))->'overridden'->>'reverted')::int, 1,
  'a second code-less file still replaces the first, exactly as before 0042');
commit;
