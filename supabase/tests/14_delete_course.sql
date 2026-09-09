\echo 'delete_course: the schedule goes, and since 0047 the history goes with it'
--
-- AMENDED 08-Sep-2026 (0047). This file was written for 0020's promise --
-- "their attendance history stays, but the course and its sessions are
-- removed" -- and pinned both halves of it. The repo owner withdrew that
-- promise (requests/2026-09-08-hard-delete-course.md): a deleted course now
-- takes every session, completed included, and every attendance record with
-- it. The four assertions under "the history" asserted the opposite and are
-- amended to the new contract rather than deleted, so the file still reads as
-- the story of what this function guarantees; the new contract in full is
-- 36_hard_delete_course.sql. The first half -- a deleted course must stop
-- expecting attendance -- is unchanged and still asserted below.

begin;
  insert into auth.users (id) values
    ('cccccccc-0000-0000-0000-000000000001'),
    ('cccccccc-0000-0000-0000-000000000002');
  insert into public.app_users (auth_user_id, kind, name, phone_e164) values
    ('cccccccc-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158'),
    ('cccccccc-0000-0000-0000-000000000002','staff','Nandhini R','+919940633871');
  insert into public.branches (name, code, city) values ('Coimbatore','CBE','Coimbatore');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Doomed Course','06:00','07:00',3), ('Surviving Course','07:00','08:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00','07:00' from public.courses c, public.branches b;

  insert into public.members (member_code, full_name)
    values ('RF-000900','Doomed Member');
  insert into public.member_enrollments (member_id, offering_id, effective_from)
    select m.id, o.id, '2026-08-01'
      from public.members m, public.course_offerings o
      join public.courses c on c.id = o.course_id
     where m.member_code = 'RF-000900' and c.name = 'Doomed Course';

  -- one session that HAPPENED and one that has not
  insert into public.sessions (offering_id, session_date, status, completed_at)
    select o.id, '2026-08-10', 'completed', now()
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Doomed Course';
  insert into public.sessions (offering_id, session_date, status)
    select o.id, '2026-12-10', 'scheduled'
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Doomed Course';
  insert into public.sessions (offering_id, session_date, status, cancellation_reason)
    select o.id, '2026-12-11', 'cancelled', 'teacher unwell'
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Doomed Course';

  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'present', true
      from public.sessions s
      join public.course_offerings o on o.id = s.offering_id
      join public.courses c on c.id = o.course_id,
           public.members m
     where c.name = 'Doomed Course' and s.status = 'completed'
       and m.member_code = 'RF-000900';
commit;

-- ------------------------------------------------------------ the guard
-- AMENDED 07-Sep-2026 (0038). Until today this block asserted the opposite:
--   t.rejects(delete_course('Doomed Course') as staff,
--             'a staff account cannot delete a course', 'only the super admin')
-- followed by 'and the refusal changed nothing'. The repo owner moved the
-- boundary (requests/2026-09-07-staff-write-access.md). A course of its own
-- is deleted here rather than 'Doomed Course', so the owner-path assertions
-- below still run against a course nobody has touched.
begin;
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Staff Doomed Course','08:00','09:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '08:00','09:00' from public.courses c, public.branches b
     where c.name = 'Staff Doomed Course';
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000002';
  select t.ok(
    not ((public.delete_course((select id from public.courses where name='Staff Doomed Course'))
          ->>'already_deleted')::boolean),
    'a staff account CAN delete a course, since 0038');
commit;

select t.eq((select count(*)::int from public.courses where name='Staff Doomed Course' and deleted_at is null), 0,
  'and the course it deleted is gone');
select t.eq((select count(*)::int from public.courses where name='Doomed Course' and deleted_at is null), 1,
  'and nothing else moved with it');

-- ------------------------------------------------------------ the delete
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';

  -- AMENDED 08-Sep-2026 (0047): was 2, "both not-yet-completed sessions are
  -- removed -- scheduled AND cancelled". The completed one goes too now.
  select t.eq(
    (public.delete_course((select id from public.courses where name='Doomed Course'))->>'sessions_removed')::int,
    3, 'every session is removed -- scheduled, cancelled AND completed');
commit;

select t.eq((select count(*)::int from public.courses where name='Doomed Course' and deleted_at is null), 0,
  'the course is gone from every read');

-- THE one that matters: an offering left live would go on expecting
-- attendance for a course nobody can see.
select t.eq((select count(*)::int from public.course_offerings o
              join public.courses c on c.id = o.course_id
             where c.name='Doomed Course' and o.deleted_at is null), 0,
  'its offerings are gone too, which is what stops the expectation');

select t.eq((select count(*)::int from public.sessions s
              join public.course_offerings o on o.id = s.offering_id
              join public.courses c on c.id = o.course_id
             where c.name='Doomed Course' and s.deleted_at is null and s.status <> 'completed'), 0,
  'no future session survives');

-- ----------------------------------------------------------- the history
-- AMENDED 08-Sep-2026 (0047). These four asserted, in order: the completed
-- session survives (1), every attendance record survives (1), her enrolment
-- is 'ended', and it is dated closed. Each now asserts the withdrawn promise's
-- opposite. 36_hard_delete_course.sql carries the full new contract.
select t.eq((select count(*)::int from public.sessions s
              join public.course_offerings o on o.id = s.offering_id
              join public.courses c on c.id = o.course_id
             where c.name='Doomed Course'), 0,
  'the COMPLETED session goes too -- since 0047, deleting a course deletes what happened in it');

select t.eq((select count(*)::int from public.attendance_records), 0,
  'and every attendance record on it');

select t.eq((select count(*)::int from public.member_enrollments
              where member_id = (select id from public.members where member_code='RF-000900')), 0,
  'her enrolment is DELETED rather than ended -- there is no history left for it to protect');

-- AMENDED AGAIN 09-Sep-2026 (0064), the same way and for the same kind of
-- reason as the four above. This asserted that her stats row survived the
-- deletion, recomputed to zero -- which was true while the member survived it.
-- The requester withdrew that on 09-Sep: "on deleting course make sure all its
-- related members are deleted because it may cause unnecessary chaos when i
-- wanted to bring same person under another course after deleting whole
-- course". This course was the whole of her membership, so she goes with it,
-- and her stats row goes with her. The assertion now pins that instead of its
-- opposite. 46_delete_course_takes_its_members.sql carries the full contract,
-- including the member of a SECOND course, who survives.
select t.eq((select count(*)::int from public.member_stats
              where member_id = (select id from public.members where member_code='RF-000900')), 0,
  'her stats row goes with her -- this course was the whole of her membership');

select t.ok((select deleted_at from public.members where member_code='RF-000900') is null,
  'the MEMBER is not deleted -- she was enrolled, not owned');

-- ------------------------------------------------------- the neighbours
select t.eq((select count(*)::int from public.courses where name='Surviving Course' and deleted_at is null), 1,
  'the other course is untouched');
select t.eq((select count(*)::int from public.course_offerings o
              join public.courses c on c.id = o.course_id
             where c.name='Surviving Course' and o.deleted_at is null), 1,
  'and so is its offering');

-- ------------------------------------------------------------ idempotent
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  select t.ok(
    (public.delete_course((select id from public.courses where name='Doomed Course'))->>'already_deleted')::boolean,
    'deleting an already-deleted course reports it rather than erroring');
commit;

-- ------------------------------------------------------------ the posture
select t.eq((select has_function_privilege('anon','public.delete_course(uuid)','execute')), false,
  'anon cannot execute the delete');
select t.eq((select has_function_privilege('authenticated','public.delete_course(uuid)','execute')), true,
  'a signed-in account can -- the function re-checks the role itself');
