\echo 'merge_member_into: an attended day outranks the import''s absent, never a person''s (0080, T-139)'
--
-- 25_merge_member.sql proves the case 0080 exists for: the import's own
-- 'absent' on the real member gives way to the stray's 'present'. This file
-- proves the two boundaries of that rule:
--   · a CORRECTED absent -- somebody looked at that day and decided -- stays,
--     and the stray's record is the one dropped, exactly as before 0080;
--   · when the real member was PRESENT too, nothing about 0080 applies.
-- And that 0080 itself is idempotent: applying it again changes nothing.

begin;
  insert into auth.users (id) values ('dddddddd-0000-0000-0000-000000000058');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('dddddddd-1111-0000-0000-000000000058',
            'dddddddd-0000-0000-0000-000000000058','super_admin','Rosi Owner','+919994871158');
  insert into public.branches (name, code, city) values ('Salem','SLM','Salem');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Prenatal Flow','06:00','07:00',6);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00' from public.courses c, public.branches b;
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, '2026-08-01', array[1,2,3,4,5,6]::smallint[] from public.course_offerings o;
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000058';
  select public.create_member('Rani', (select id from public.course_offerings), '2026-08-01',
    array[]::text[], array['rani@gmail.com']::text[], null);
  select public.create_member('Rani Sham', (select id from public.course_offerings), '2026-08-17',
    array[]::text[], array[]::text[], null);
commit;

begin;
  select public.generate_sessions(o.id, '2026-08-17','2026-08-22') from public.course_offerings o;
  update public.sessions set status='completed', completed_at=now();
commit;

-- Mon 17th: the real member's absent was CORRECTED by a person; the stray was
--           marked present by the file.
-- Tue 18th: both present.
begin;
  insert into public.attendance_records (session_id, member_id, status, expected, corrected_at, corrected_by)
    select s.id, m.id, 'absent', true, now(), 'dddddddd-1111-0000-0000-000000000058'
      from public.sessions s, public.members m
     where s.session_date = '2026-08-17' and m.full_name = 'Rani';
  insert into public.attendance_records (session_id, member_id, status, expected, raw_display_name)
    select s.id, m.id, 'present', true, 'Rani Sham'
      from public.sessions s, public.members m
     where s.session_date = '2026-08-17' and m.full_name = 'Rani Sham';
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'present', true
      from public.sessions s, public.members m
     where s.session_date = '2026-08-18' and m.full_name = 'Rani';
  insert into public.attendance_records (session_id, member_id, status, expected, raw_display_name)
    select s.id, m.id, 'present', true, 'Rani Sham'
      from public.sessions s, public.members m
     where s.session_date = '2026-08-18' and m.full_name = 'Rani Sham';
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000058';
  select public.merge_member_into(
    (select id from public.members where full_name = 'Rani Sham'),
    (select id from public.members where full_name = 'Rani'));
commit;

select t.eq((select a.status from public.attendance_records a
               join public.members m on m.id = a.member_id
               join public.sessions s on s.id = a.session_id
              where m.full_name = 'Rani' and s.session_date = '2026-08-17' and a.deleted_at is null),
  'absent',
  'a CORRECTED absent survives the merge -- a person decided that day, and a file never outranks a person');
select t.eq((select count(*)::int from public.attendance_records a
               join public.members m on m.id = a.member_id
               join public.sessions s on s.id = a.session_id
              where m.full_name = 'Rani' and s.session_date = '2026-08-17' and a.deleted_at is null),
  1, 'and the member still holds exactly one live record for that day');
select t.eq((select a.status from public.attendance_records a
               join public.members m on m.id = a.member_id
               join public.sessions s on s.id = a.session_id
              where m.full_name = 'Rani' and s.session_date = '2026-08-18' and a.deleted_at is null),
  'present', 'when both were present the real member''s own record stands, as before 0080');
select t.eq((select count(*)::int from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Rani' and a.deleted_at is null),
  2, 'two days, two live records -- nothing doubled');

-- 0080 applied again is a no-op: the function body does not change.
create temp table body_before as
  select md5(prosrc) as h from pg_proc where proname = 'merge_member_into';
\i supabase/migrations/0080_merge_present_outranks_import_absent.sql
select t.eq((select md5(prosrc) from pg_proc where proname = 'merge_member_into'),
  (select h from body_before), '0080 is idempotent -- a second apply leaves the function as it was');
