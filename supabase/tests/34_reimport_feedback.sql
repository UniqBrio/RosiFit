\echo 'reimport feedback: the same file changes nothing, a partly-new file says which part, and nothing is ever written twice'
--
-- 0045. The requester: "Improve the feedback when a user uploads the same CSV
-- again without any changes ... if the CSV was already imported and all
-- attendance is already marked, clearly tell the user that there is nothing
-- new to update ... if a file contains a combination of existing and new
-- records, provide useful feedback about what was added, skipped, or updated
-- ... do not create duplicate attendance records."
--
-- The three uploads that request names are the three sections below. Each
-- asserts the COUNTS the commit answers with -- which is what the screen
-- turns into a sentence (src/data/uploadOutcome.test.ts) -- and each asserts
-- the register underneath them, because a count nobody checks against the
-- rows is a number the next change can quietly break.
--
-- THE DUPLICATE ARRIVES TWO DIFFERENT WAYS and both are here:
--   the same FILE, refused outright by csv_imports_sha_completed (0008), and
--   the same CLASS exported again, which is a different file with the same
--   contents and therefore actually runs.
--
-- Four members due Mon/Wed/Fri from 1 Aug, and one who joins in September.
-- 31 Aug 2026 is a Monday.

begin;
insert into auth.users (id) values ('ffffffff-0000-0000-0000-000000000045');
insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
  values ('ffffffff-1111-0000-0000-000000000045','ffffffff-0000-0000-0000-000000000045',
          'super_admin','Reimport Owner','+919994871745');
insert into public.branches (name, code) values ('Adyar','ADY');
insert into public.courses (name) values ('Prenatal Reimport');
insert into public.course_offerings (course_id, branch_id, start_time, end_time)
  select c.id, b.id, '06:30','07:30' from public.courses c, public.branches b
   where c.name = 'Prenatal Reimport';
insert into public.offering_schedules (offering_id, effective_from, weekdays)
  select o.id, '2026-08-01', array[1,3,5]::smallint[]
    from public.course_offerings o join public.courses c on c.id = o.course_id
   where c.name = 'Prenatal Reimport';
insert into public.members (full_name) values
  ('Asha Again'), ('Bhavani Again'), ('Chitra Again'), ('Divya Again'), ('Eshwari Again');
insert into public.member_aliases (member_id, alias_type, alias_display, confirmed_by)
  select id, 'name', full_name, 'ffffffff-1111-0000-0000-000000000045'
    from public.members where full_name like '% Again';
-- The four who are due on 31 Aug.
insert into public.member_enrollments (member_id, offering_id, effective_from)
  select m.id, o.id, '2026-08-01'
    from public.members m, public.course_offerings o
    join public.courses c on c.id = o.course_id
   where m.full_name in ('Asha Again','Bhavani Again','Chitra Again','Divya Again')
     and c.name = 'Prenatal Reimport';
-- Eshwari joins in September: on 31 Aug she is not due, so a file that names
-- her writes an 'extra' -- which is the row a partly-new file ADDS.
insert into public.member_enrollments (member_id, offering_id, effective_from)
  select m.id, o.id, '2026-09-01'
    from public.members m, public.course_offerings o
    join public.courses c on c.id = o.course_id
   where m.full_name = 'Eshwari Again' and c.name = 'Prenatal Reimport';
commit;

-- Stages one file exactly as csv-import's preview does, including the meeting
-- instance (code + created-on) the override is scoped to.
create or replace function pg_temp.stage(
  p_sha text, p_code text, p_started timestamptz, p_day date, p_names text[])
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.csv_imports
    (file_name, file_sha256, offering_id, session_date, meeting_code, meeting_started_at,
     row_count, status, summary, uploaded_by)
  select p_sha || '.csv', p_sha, o.id, p_day, p_code, p_started, array_length(p_names, 1),
    'previewed',
    jsonb_build_object('rows', (
      select jsonb_agg(jsonb_build_object(
        'row', ord, 'kind', 'matched', 'raw_name', nm, 'minutes', 47,
        'candidates', jsonb_build_array(jsonb_build_object(
          'member_id', (select id from public.members where full_name = nm)))))
        from unnest(p_names) with ordinality as u(nm, ord))),
    'ffffffff-1111-0000-0000-000000000045'
    from public.course_offerings o join public.courses c on c.id = o.course_id
   where c.name = 'Prenatal Reimport'
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

-- EVERY attendance row this member has on this day, deleted ones included.
-- This is the assertion "no duplicate attendance records" actually needs:
-- attendance_unique_live only constrains the LIVE rows, so a second import
-- that soft-deleted and re-inserted would still read as one live row while
-- having written two.
create or replace function pg_temp.rows_for(p_name text, p_day date) returns int
language sql as $$
  select count(*)::int from public.attendance_records a
    join public.sessions s on s.id = a.session_id
   where s.session_date = p_day
     and a.member_id = (select id from public.members where full_name = p_name)
$$;

-- ================================================== A NEW FILE, a new day
begin;
set local role service_role;
create temporary table t_first as
select public.commit_csv_import(
  pg_temp.stage('sha-r1', 'zzz-zzzz-zzz', '2026-08-31T06:30:00Z', '2026-08-31',
                array['Asha Again','Bhavani Again']),
  'ffffffff-1111-0000-0000-000000000045', '[]'::jsonb) as r;
commit;

select t.eq((select (r->'changes'->>'added')::int from t_first), 2,
  'a first file ADDS a row for everybody it names');
select t.eq((select (r->'changes'->>'updated')::int from t_first), 0,
  'and updates nobody, because there was nothing there to update');
select t.eq((select (r->'changes'->>'unchanged')::int from t_first), 0,
  'and skips nobody');
select t.eq((select (r->'changes'->>'absent_added')::int from t_first), 2,
  'the two it does not name are due, and are recorded absent for the first time');
select t.eq(pg_temp.mark('Asha Again',  '2026-08-31'), 'present', 'her own file marks her present');
select t.eq(pg_temp.mark('Chitra Again','2026-08-31'), 'absent',  'and everyone else due absent');

-- ============================ THE SAME FILE AGAIN -- refused by the database
-- The edge function answers this one before it stages anything (the
-- `already_imported` result); the index is what makes that refusal
-- structural rather than a check somebody could forget.
select t.rejects(
  $$insert into public.csv_imports
      (file_name, file_sha256, offering_id, session_date, row_count, status, uploaded_by)
    select 'sha-r1-again.csv', 'sha-r1', o.id, '2026-08-31', 2, 'completed',
           'ffffffff-1111-0000-0000-000000000045'
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Prenatal Reimport'$$,
  'the same fingerprint cannot complete a second time',
  'csv_imports_sha_completed');

-- ================= THE SAME CLASS, EXPORTED AGAIN -- a different file, same rows
-- Meet writes a new export every time, so the fingerprint misses and this
-- one really runs. It must change nothing at all.
begin;
set local role service_role;
create temporary table t_same as
select public.commit_csv_import(
  pg_temp.stage('sha-r2', 'zzz-zzzz-zzz', '2026-08-31T06:30:00Z', '2026-08-31',
                array['Asha Again','Bhavani Again']),
  'ffffffff-1111-0000-0000-000000000045', '[]'::jsonb) as r;
commit;

select t.eq((select (r->'changes'->>'added')::int from t_same), 0,
  'a second export of the same class adds nobody');
select t.eq((select (r->'changes'->>'updated')::int from t_same), 0,
  'and updates nobody');
select t.eq((select (r->'changes'->>'unchanged')::int from t_same), 2,
  'every name it carries was already marked exactly as it says');
select t.eq((select (r->'changes'->>'absent_added')::int from t_same), 0,
  'and the absent rows were already there too');
select t.eq((select (r->'overridden'->>'reverted')::int from t_same), 0,
  'it reverts nobody -- it is its own earlier version and names the same people');
select t.eq((select (r->'overridden'->>'removed')::int from t_same), 0, 'and removes nobody');
-- THIS is what "nothing to update" means, read off the answer the screen gets.
select t.ok((select (r->'changes'->>'added')::int + (r->'changes'->>'updated')::int
                  + (r->'changes'->>'absent_added')::int
                  + (r->'overridden'->>'reverted')::int + (r->'overridden'->>'removed')::int
               from t_same) = 0,
  'added + updated + absent_added + reverted + removed = 0: there is nothing to update');

-- and the register is exactly where the first file left it
select t.eq(pg_temp.mark('Asha Again',  '2026-08-31'), 'present', 'she is still present');
select t.eq(pg_temp.mark('Chitra Again','2026-08-31'), 'absent',  'and she is still absent');
select t.eq((select present_count from public.sessions where session_date = '2026-08-31'), 2,
  'the register still counts two present');

-- NO DUPLICATE ATTENDANCE RECORDS, counting deleted rows as well as live.
select t.eq(pg_temp.rows_for('Asha Again',   '2026-08-31'), 1,
  'two imports of the same class leave ONE attendance record for her, not two');
select t.eq(pg_temp.rows_for('Chitra Again', '2026-08-31'), 1,
  'and one for the member neither file named');
select t.eq((select count(*)::int from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-31'),
  4, 'four members due, four attendance records in total');
select t.eq((select count(*)::int from public.sessions s
               join public.course_offerings o on o.id = s.offering_id
               join public.courses c on c.id = o.course_id
              where c.name = 'Prenatal Reimport' and s.session_date = '2026-08-31'
                and s.deleted_at is null),
  1, 'and one session for the day, however many files landed on it');

-- ======================================== A PARTLY DUPLICATE: some old, some new
-- A corrected export of the same class: the two it already marked, one it
-- marked absent, and one member who was never due that day at all.
begin;
set local role service_role;
create temporary table t_partial as
select public.commit_csv_import(
  pg_temp.stage('sha-r3', 'zzz-zzzz-zzz', '2026-08-31T06:30:00Z', '2026-08-31',
                array['Asha Again','Bhavani Again','Chitra Again','Eshwari Again']),
  'ffffffff-1111-0000-0000-000000000045', '[]'::jsonb) as r;
commit;

select t.eq((select (r->'changes'->>'unchanged')::int from t_partial), 2,
  'the two already marked present are skipped, not written again');
select t.eq((select (r->'changes'->>'updated')::int from t_partial), 1,
  'the one this file names and the last one did not is UPDATED, absent to present');
select t.eq((select (r->'changes'->>'added')::int from t_partial), 1,
  'and the member who had no row for this day at all is ADDED');
select t.eq((select (r->'changes'->>'absent_added')::int from t_partial), 0,
  'nobody is newly absent: every member due already had a row');
select t.eq(pg_temp.mark('Chitra Again',  '2026-08-31'), 'present',
  'the updated member is present now');
select t.eq(pg_temp.mark('Eshwari Again', '2026-08-31'), 'extra',
  'and the one who was not due is an extra, which is what a row for her can be');
select t.eq(pg_temp.mark('Divya Again',   '2026-08-31'), 'absent',
  'the member no file has ever named is still absent');
select t.eq(pg_temp.rows_for('Chitra Again', '2026-08-31'), 1,
  'the update moved her row rather than adding a second one');
select t.eq(pg_temp.rows_for('Asha Again',   '2026-08-31'), 1,
  'and a third import still leaves her with one record');

-- ================================ a mark made BY HAND is not a change either
-- set_attendance (0035) outranks the file. The row does not move, so the
-- import must not report it as something it moved -- otherwise "nothing to
-- update" would never be said about a register anybody had corrected.
begin;
set local role service_role;
update public.attendance_records a
   set status = 'absent', expected = true, corrected_at = now(),
       corrected_by = 'ffffffff-1111-0000-0000-000000000045'
  from public.sessions s
 where s.id = a.session_id and s.session_date = '2026-08-31'
   and a.member_id = (select id from public.members where full_name = 'Bhavani Again');
create temporary table t_hand as
select public.commit_csv_import(
  pg_temp.stage('sha-r4', 'zzz-zzzz-zzz', '2026-08-31T06:30:00Z', '2026-08-31',
                array['Asha Again','Bhavani Again','Chitra Again','Eshwari Again']),
  'ffffffff-1111-0000-0000-000000000045', '[]'::jsonb) as r;
commit;

select t.eq(pg_temp.mark('Bhavani Again', '2026-08-31'), 'absent',
  'the mark she made by hand survives a file that names her');
select t.eq((select (r->'changes'->>'updated')::int from t_hand), 0,
  'and the import does not claim to have updated the row it deliberately left alone');
select t.eq((select (r->'changes'->>'unchanged')::int from t_hand), 4,
  'a row the file could not move is counted as unchanged, which is what happened to it');
select t.ok((select (r->'changes'->>'added')::int + (r->'changes'->>'updated')::int
                  + (r->'changes'->>'absent_added')::int
                  + (r->'overridden'->>'reverted')::int + (r->'overridden'->>'removed')::int
               from t_hand) = 0,
  'so a re-upload over a hand-corrected register still says there is nothing to update');

-- ============================================ the counts reach the audit trail
select t.eq(
  (select (metadata->>'unchanged')::int from public.audit_logs
    where action = 'csv_import.completed' order by occurred_at desc, id desc limit 1),
  4, 'what the last import changed is answerable from the audit log, not only from a panel');

-- ================================================ a new day is a new register
-- Nothing above leaks into a day of its own: the second Monday starts empty
-- and its first file adds, exactly as the first one did.
begin;
set local role service_role;
create temporary table t_next as
select public.commit_csv_import(
  pg_temp.stage('sha-r5', 'yyy-yyyy-yyy', '2026-09-02T06:30:00Z', '2026-09-02',
                array['Asha Again','Divya Again']),
  'ffffffff-1111-0000-0000-000000000045', '[]'::jsonb) as r;
commit;

select t.eq((select (r->'changes'->>'added')::int from t_next), 2,
  'a file for a day nothing has covered adds every name it carries');
select t.eq((select (r->'changes'->>'unchanged')::int from t_next), 0,
  'and skips nobody, because a new day has nothing to skip');
-- THREE, not two: Eshwari is enrolled from 1 September, so the member who was
-- an 'extra' on 31 August is due on 2 September and is absent like anybody
-- else the file does not name.
select t.eq((select (r->'changes'->>'absent_added')::int from t_next), 3,
  'everyone due and not named is recorded absent on that day, the September joiner included');
select t.eq(pg_temp.mark('Chitra Again', '2026-08-31'), 'present',
  'and 31 Aug is untouched by any of it');
